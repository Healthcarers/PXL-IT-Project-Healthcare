package be.pxl.healthcareapi.DTO;

import be.pxl.healthcareapi.domein.VitalsSnapshot;

public record VitalsResponse(double heartRate, double ampScale) {
    public static VitalsResponse from(VitalsSnapshot vitals) {
        return new VitalsResponse(vitals.heartRate(), vitals.ampScale());
    }
}
