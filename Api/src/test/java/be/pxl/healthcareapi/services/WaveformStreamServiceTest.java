package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.domein.WaveformSource;
import be.pxl.healthcareapi.dto.WaveformChunk;
import be.pxl.healthcareapi.repos.VitalsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WaveformStreamServiceTest {
    private static final long ONE_SECOND_NS = 1_000_000_000L;

    @Mock VitalsRepository vitals;
    @Mock SimpMessagingTemplate messaging;
    @Captor ArgumentCaptor<Object> payloadCaptor;

    private final AtomicLong clock = new AtomicLong(0);

    record FakeSource(String channel, int sampleRate) implements WaveformSource {
        public String unit() { return "u"; }
        public double yMin() { return 0; }
        public double yMax() { return 1; }
        public double periodMs(VitalsSnapshot v) { return 1000; }
        public double valueAt(double cycleMs, VitalsSnapshot v) { return 0.5; }
    }

    @BeforeEach
    void setUp() {
        lenient()
                .when(vitals.current())
                .thenReturn(VitalsSnapshot.defaults());
    }

    private WaveformStreamService service(WaveformSource... sources) {
        return new WaveformStreamService(List.of(sources), vitals, messaging, clock::get);
    }

    @Test
    void publishesNothingBeforeAnySampleIsDue() {
        WaveformStreamService svc = service(new FakeSource("ecg", 250));

        svc.publishTick();

        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void oneSecondProducesExactlyTheSampleRateInSamples() {
        WaveformStreamService svc = service(new FakeSource("ecg", 250));

        clock.set(ONE_SECOND_NS);
        svc.publishTick();

        verify(messaging).convertAndSend(eq("/topic/waveform/ecg"), payloadCaptor.capture());
        WaveformChunk chunk = (WaveformChunk) payloadCaptor.getValue();
        assertThat(chunk.channel()).isEqualTo("ecg");
        assertThat(chunk.sampleRate()).isEqualTo(250);
        assertThat(chunk.startIndex()).isEqualTo(0);
        assertThat(chunk.samples()).hasSize(250);
    }

    @Test
    void consecutiveChunksAreContiguous() {
        WaveformStreamService svc = service(new FakeSource("ecg", 250));

        clock.set(ONE_SECOND_NS);
        svc.publishTick();
        clock.set(2 * ONE_SECOND_NS);
        svc.publishTick();

        verify(messaging, times(2))
                .convertAndSend(eq("/topic/waveform/ecg"), payloadCaptor.capture());

        List<Object> sent = payloadCaptor.getAllValues();
        WaveformChunk first = (WaveformChunk) sent.get(0);
        WaveformChunk second = (WaveformChunk) sent.get(1);
        assertThat(second.startIndex()).isEqualTo(first.startIndex() + first.samples().length);
    }

    @Test
    void rejectsDuplicateChannelNames() {
        assertThatThrownBy(() -> service(
                new FakeSource("ecg", 250),
                new FakeSource("ecg", 90)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
