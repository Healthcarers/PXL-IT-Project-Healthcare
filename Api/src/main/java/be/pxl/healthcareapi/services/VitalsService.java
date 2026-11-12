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
                req.ampScale()  != null ? checkRange("ampScale",  req.ampScale(),  0.1, 3)  : current.ampScale()
        ));
    }

    private static double checkRange(String name, double value, double min, double max) {
        if (value < min || value > max) {
            throw new IllegalArgumentException(
                    name + " must be between " + min + " and " + max
            );
        }
        return value;
    }
}
