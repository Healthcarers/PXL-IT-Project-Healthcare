package be.pxl.healthcareapi.dto;

import be.pxl.healthcareapi.domein.VitalsSnapshot;

public record VitalsResponse(double heartRate, double spo2, double respRate, double etco2, double ampScale) {
    public static VitalsResponse from(VitalsSnapshot vitals) {
        return new VitalsResponse(vitals.heartRate(), vitals.spo2(), vitals.respRate(), vitals.etco2(), vitals.ampScale());
    }
}
