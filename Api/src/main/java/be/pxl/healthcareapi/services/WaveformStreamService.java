package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.domein.waveforms.WaveformSource;
import be.pxl.healthcareapi.dto.WaveformChunk;
import be.pxl.healthcareapi.repos.VitalsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final RoomSimulationService simulations;
    private final Map<String, List<ChannelStream>> roomStreams = new HashMap<>();

    @Autowired
    public WaveformStreamService(List<WaveformSource> sources,
                                 VitalsRepository vitalsRepository,
                                 SimpMessagingTemplate messaging, RoomSimulationService simulations) {
        this(sources, vitalsRepository, messaging, simulations, System::nanoTime);
    }

    public WaveformStreamService(List<WaveformSource> sources,
                                 VitalsRepository vitalsRepository,
                                 SimpMessagingTemplate messaging,
                                 RoomSimulationService simulations,
                                 LongSupplier nanoClock) {
        this.vitalsRepository = vitalsRepository;
        this.messaging = messaging;
        this.simulations = simulations;
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
        publishStreams(streams, vitals, elapsedSec, "/topic/waveform/");

        var roomVitals = simulations.snapshots();
        roomStreams.keySet().retainAll(roomVitals.keySet());
        roomVitals.forEach((code, snapshot) -> {
            var channels = roomStreams.computeIfAbsent(code, ignored -> streams.stream().map(stream -> {
                var channel = new ChannelStream(stream.source);
                channel.nextIndex = (long) (elapsedSec * stream.source.sampleRate());
                return channel;
            }).toList());
            publishStreams(channels, snapshot, elapsedSec, "/topic/rooms/" + code + "/waveform/");
        });
    }

    private void publishStreams(List<ChannelStream> channels, VitalsSnapshot vitals, double elapsedSec, String topic) {
        for (ChannelStream stream : channels) {
            long due = (long)(elapsedSec * stream.source.sampleRate()) - stream.nextIndex;
            int count = (int)Math.min(due, MAX_BATCH);

            if (count <= 0) continue;

            long start = stream.nextIndex;
            double[] samples = new double[count];
            for (int i = 0; i < count; i++) {
                samples[i] = stream.nextSample(vitals);
            }

             messaging.convertAndSend(
                    topic + stream.source.channel(),
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
