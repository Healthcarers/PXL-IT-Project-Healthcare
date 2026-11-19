package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.dto.VitalsUpdateRequest;
import be.pxl.healthcareapi.repos.VitalsRepository;
import org.springframework.stereotype.Service;

import java.util.function.ToDoubleFunction;

@Service
public class VitalsService {
    private final VitalsRepository vitalsRepository;

    public VitalsService(VitalsRepository vitalsRepository) {
        this.vitalsRepository = vitalsRepository;
    }

    public VitalsSnapshot get() {
        return vitalsRepository.current();
    }

    public VitalsSnapshot update(VitalsUpdateRequest req) {
        return vitalsRepository.update(current -> applyValues(req, current));
    }

    static VitalsSnapshot initialSnapshot(VitalsUpdateRequest req) {
        return applyValues(req, null);
    }

    private static VitalsSnapshot applyValues(VitalsUpdateRequest req, VitalsSnapshot current) {
        return new VitalsSnapshot(
                resolveValue("heartRate", req.heartRate(), current, VitalsSnapshot::heartRate, 0, 220),
                resolveValue("spo2", req.spo2(), current, VitalsSnapshot::spo2, 50, 100),
                resolveValue("respRate", req.respRate(), current, VitalsSnapshot::respRate, 0, 60),
                resolveValue("etco2", req.etco2(), current, VitalsSnapshot::etco2, 0, 100),
                resolveValue("ampScale", req.ampScale(), current, VitalsSnapshot::ampScale, 0.1, 3),
                resolveValue("sysBloodPressure", req.sysBloodPressure(), current, VitalsSnapshot::sysBloodPressure, 0, 300),
                resolveValue("diasBloodPressure", req.diasBloodPressure(), current, VitalsSnapshot::diasBloodPressure, 0, 300)
        );
    }

    private static double resolveValue(String name, Double value, VitalsSnapshot current,
                                       ToDoubleFunction<VitalsSnapshot> existingValue, double min, double max) {
        if (value == null) {
            if (current == null) {
                throw new IllegalArgumentException(name + " is verplicht");
            }
            return existingValue.applyAsDouble(current);
        }
        if (!Double.isFinite(value) || value < min || value > max) {
            throw new IllegalArgumentException(
                    name + " moet liggen tussen " + min + " en " + max
            );
        }
        return value;
    }
}
