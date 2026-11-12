package be.pxl.healthcareapi.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import be.pxl.healthcareapi.domein.waveforms.WaveformSource;
import be.pxl.healthcareapi.dto.ChannelResponse;
import be.pxl.healthcareapi.services.WaveformStreamService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class ChannelControllerTest {

    @Mock
    WaveformStreamService streamService;

    @Test
    void listReturnsMetadataForEveryChannel() {
        // Build the sources first, so no stubbing is open while the helper runs.
        WaveformSource ecg = source("ecg", 250, "mV", -1, 2);
        WaveformSource resp = source("resp", 25, "a.u.", 0, 1);
        when(streamService.channels()).thenReturn(List.of(ecg, resp));

        ResponseEntity<List<ChannelResponse>> response = new ChannelController(streamService).list();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(2);
        assertThat(response.getBody())
                .extracting(ChannelResponse::channel)
                .containsExactly("ecg", "resp");
        assertThat(response.getBody().get(0))
                .isEqualTo(new ChannelResponse("ecg", 250, "mV", -1, 2));
    }

    @Test
    void listReturnsEmptyListWhenNoChannelsAreRegistered() {
        when(streamService.channels()).thenReturn(List.of());

        ResponseEntity<List<ChannelResponse>> response = new ChannelController(streamService).list();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }

    private static WaveformSource source(String channel, int sampleRate,
                                         String unit, double yMin, double yMax) {
        WaveformSource source = mock(WaveformSource.class);
        when(source.channel()).thenReturn(channel);
        when(source.sampleRate()).thenReturn(sampleRate);
        when(source.unit()).thenReturn(unit);
        when(source.yMin()).thenReturn(yMin);
        when(source.yMax()).thenReturn(yMax);
        return source;
    }
}