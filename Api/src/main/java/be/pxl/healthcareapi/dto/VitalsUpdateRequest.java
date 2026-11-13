package be.pxl.healthcareapi.dto;

public record VitalsUpdateRequest(Double heartRate, Double spo2, Double respRate, Double etco2, Double ampScale, Double sysBloodPressure, Double diasBloodPressure) {}
