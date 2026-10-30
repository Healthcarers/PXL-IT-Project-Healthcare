package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.DTO.WaveformChunk;
import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.domein.waveforms.WaveformSource;
import be.pxl.healthcareapi.repos.VitalsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.LongSupplier;

@Service
public class WaveformStreamService {
    static final int TICK_MS = 25;
    private static final int MAX_BATCH = 1000;

    private final VitalsRepository vitalsRepository;
    private final SimpMessagingTemplate messaging;
    private final List<ChannelStream> streams;
    private final LongSupplier nanoClock;
    private final long startNanos;

    @Autowired
    public WaveformStreamService(List<WaveformSource> sources,
                                 VitalsRepository vitalsRepository,
                                 SimpMessagingTemplate messaging) {
        this(sources, vitalsRepository, messaging, System::nanoTime);
    }

    public WaveformStreamService(List<WaveformSource> sources,
                                 VitalsRepository vitalsRepository,
                                 SimpMessagingTemplate messaging,
                                 LongSupplier nanoClock) {
        this.vitalsRepository = vitalsRepository;
        this.messaging = messaging;
        this.nanoClock = nanoClock;
        this.startNanos = nanoClock.getAsLong();

        Set<String> seen = new HashSet<>();
        for (WaveformSource source : sources) {
            if (!seen.add(source.channel())) {
                throw new  IllegalArgumentException("Channel " + source.channel() + " is already in use");
            }
        }
        this.streams = sources.stream().map(ChannelStream::new).toList();
    }

    @Scheduled(fixedRate = TICK_MS)
    public void publishTick() {
        VitalsSnapshot vitals = vitalsRepository.current();
        double elapsedSec = (nanoClock.getAsLong() - startNanos) / 1e9;

        for (ChannelStream stream : streams) {
            long due = (long)(elapsedSec * stream.source.sampleRate()) - stream.nextIndex;
            int count = (int)Math.min(due, MAX_BATCH);

            if (count <= 0) continue;

            long start = stream.nextIndex;
            double[] samples = new double[count];
            for (int i = 0; i < count; i++) {
                samples[i] = stream.nextSample(vitals);
            }

            messaging.convertAndSend(
                    "/topic/waveform/" + stream.source.channel(),
                    new WaveformChunk(stream.source.channel(), start, stream.source.sampleRate(), samples)
            );

        }
    }

    public List<WaveformSource> channels() {
        return streams.stream().map(s -> s.source).toList();
    }

    private static final class ChannelStream {
        final WaveformSource source;
        long nextIndex = 0;
        double cycleMs = 0;

        ChannelStream(WaveformSource source) {
            this.source = source;
        }

        double nextSample(VitalsSnapshot vitals) {
            double period = source.periodMs(vitals);
            cycleMs = cycleMs % period;
            double value = Math.round(source.valueAt(cycleMs, vitals) * 1000) / 1000.0;

            cycleMs += 1000.0 / source.sampleRate();
            nextIndex++;
            return value;
        }
    }
}
