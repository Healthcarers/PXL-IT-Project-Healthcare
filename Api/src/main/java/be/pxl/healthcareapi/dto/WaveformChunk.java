package be.pxl.healthcareapi.dto;

public record WaveformChunk(String channel, long startIndex, int sampleRate, double[] samples) {}
