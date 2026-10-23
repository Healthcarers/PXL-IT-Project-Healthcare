package be.pxl.healthcareapi.DTO;

public record WaveformChunk(String channel, long startIndex, int sampleRate, double[] samples) {}
