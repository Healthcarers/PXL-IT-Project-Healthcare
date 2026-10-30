package be.pxl.healthcareapi.DTO;

import be.pxl.healthcareapi.domein.waveforms.WaveformSource;

public record ChannelResponse(String channel, int sampleRate, String unit, double yMin, double yMax) {
    public static ChannelResponse from(WaveformSource source) {
        return new ChannelResponse(source.channel(), source.sampleRate(), source.unit(), source.yMin(), source.yMax());
    }
}
