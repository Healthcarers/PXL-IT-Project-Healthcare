package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.dto.WaveformChunk;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
final class WaveformPublisher {
    private static final int MAX_BATCH = 1000;
    private final SimpMessagingTemplate messaging;

    WaveformPublisher(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    void publish(List<WaveformStream> streams, VitalsSnapshot vitals, double elapsedSec, String topic) {
        for (WaveformStream stream : streams) {
            long due = (long) (elapsedSec * stream.source().sampleRate()) - stream.nextIndex();
            int count = (int) Math.min(due, MAX_BATCH);
            if (count <= 0) continue;

            long start = stream.nextIndex();
            double[] samples = new double[count];
            for (int i = 0; i < count; i++) samples[i] = stream.nextSample(vitals);
            messaging.convertAndSend(topic + stream.source().channel(),
                    new WaveformChunk(stream.source().channel(), start, stream.source().sampleRate(), samples));
        }
    }
}
