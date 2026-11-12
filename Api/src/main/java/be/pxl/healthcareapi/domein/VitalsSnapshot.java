package be.pxl.healthcareapi.domein;

public record VitalsSnapshot(double heartRate, double ampScale) {
    public static VitalsSnapshot defaults() {
        return new  VitalsSnapshot(75, 1.0);
    }
}
