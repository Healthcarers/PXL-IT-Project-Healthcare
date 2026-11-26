package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.domein.waveforms.WaveformSource;
import be.pxl.healthcareapi.repositories.VitalsRepository;
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
    private final VitalsRepository vitalsRepository;
    private final WaveformPublisher publisher;
    private final List<WaveformStream> streams;
    private final LongSupplier nanoClock;
    private final long startNanos;
    private final RoomSimulationService simulations;
    private final Map<String, List<WaveformStream>> roomStreams = new HashMap<>();

    @Autowired
    public WaveformStreamService(List<WaveformSource> sources,
                                 VitalsRepository vitalsRepository,
                                 SimpMessagingTemplate messaging, RoomSimulationService simulations) {
        this(sources, vitalsRepository, new WaveformPublisher(messaging), simulations, System::nanoTime);
    }

    public WaveformStreamService(List<WaveformSource> sources,
                                 VitalsRepository vitalsRepository,
                                 SimpMessagingTemplate messaging,
                                 RoomSimulationService simulations,
                                 LongSupplier nanoClock) {
        this(sources, vitalsRepository, new WaveformPublisher(messaging), simulations, nanoClock);
    }

    WaveformStreamService(List<WaveformSource> sources, VitalsRepository vitalsRepository,
                          WaveformPublisher publisher, RoomSimulationService simulations,
                          LongSupplier nanoClock) {
        this.vitalsRepository = vitalsRepository;
        this.publisher = publisher;
        this.simulations = simulations;
        this.nanoClock = nanoClock;
        this.startNanos = nanoClock.getAsLong();

        Set<String> seen = new HashSet<>();
        for (WaveformSource source : sources) {
            if (!seen.add(source.channel())) {
                throw new  IllegalArgumentException("Channel " + source.channel() + " is already in use");
            }
        }
        this.streams = sources.stream().map(WaveformStream::new).toList();
    }

    @Scheduled(fixedRate = TICK_MS)
    public void publishTick() {
        VitalsSnapshot vitals = vitalsRepository.current();
        double elapsedSec = (nanoClock.getAsLong() - startNanos) / 1e9;
        publisher.publish(streams, vitals, elapsedSec, "/topic/waveform/");

        var roomVitals = simulations.snapshots();
        roomStreams.keySet().retainAll(roomVitals.keySet());
        roomVitals.forEach((code, snapshot) -> {
            var channels = roomStreams.computeIfAbsent(code, ignored -> streams.stream().map(stream -> {
                var channel = new WaveformStream(stream.source());
                channel.startAt((long) (elapsedSec * stream.source().sampleRate()));
                return channel;
            }).toList());
            publisher.publish(channels, snapshot, elapsedSec, "/topic/rooms/" + code + "/waveform/");
        });
    }

    public List<WaveformSource> channels() {
        return streams.stream().map(WaveformStream::source).toList();
    }
}
