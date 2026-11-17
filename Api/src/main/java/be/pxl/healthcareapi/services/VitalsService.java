package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.dto.VitalsUpdateRequest;
import be.pxl.healthcareapi.repos.VitalsRepository;
import org.springframework.stereotype.Service;

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
        return vitalsRepository.update(current -> new VitalsSnapshot(
                req.heartRate() != null ? checkRange("heartRate", req.heartRate(), 0, 220) : current.heartRate(),
                req.spo2() != null ? checkRange("spo2", req.spo2(), 50, 100) : current.spo2(),
                req.respRate() != null ? checkRange("respRate", req.respRate(), 0, 60) : current.respRate(),
                req.etco2() != null ? checkRange("etco2", req.etco2(), 0, 100) : current.etco2(),
                req.ampScale()  != null ? checkRange("ampScale",  req.ampScale(),  0.1, 3)  : current.ampScale(),
                req.sysBloodPressure() != null ? checkRange("sysBloodPressure", req.sysBloodPressure(), 0, 300) : current.sysBloodPressure(),
                req.diasBloodPressure() != null ? checkRange("diasBloodPressure", req.diasBloodPressure(), 0, 300) : current.diasBloodPressure()
        ));
    }

    private static double checkRange(String name, double value, double min, double max) {
        if (value < min || value > max) {
            throw new IllegalArgumentException(
                    name + " moet liggen tussen " + min + " en " + max
            );
        }
        return value;
    }
}
