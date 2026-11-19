package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.dto.VitalsResponse;
import be.pxl.healthcareapi.dto.VitalsUpdateRequest;
import be.pxl.healthcareapi.repos.VitalsRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class VitalsService {
    private static final String VITALS_TOPIC = "/topic/vitals";

    private final VitalsRepository vitalsRepository;
    private final SimpMessagingTemplate messaging;

    public VitalsService(VitalsRepository vitalsRepository, SimpMessagingTemplate messaging) {
        this.vitalsRepository = vitalsRepository;
        this.messaging = messaging;
    }

    public VitalsSnapshot get() {
        return vitalsRepository.current();
    }

    public VitalsSnapshot update(VitalsUpdateRequest req) {
        VitalsSnapshot updated = vitalsRepository.update(current -> new VitalsSnapshot(
                req.heartRate() != null ? checkRange("heartRate", req.heartRate(), 0, 220) : current.heartRate(),
                req.spo2() != null ? checkRange("spo2", req.spo2(), 50, 100) : current.spo2(),
                req.respRate() != null ? checkRange("respRate", req.respRate(), 0, 60) : current.respRate(),
                req.etco2() != null ? checkRange("etco2", req.etco2(), 0, 100) : current.etco2(),
                req.ampScale()  != null ? checkRange("ampScale",  req.ampScale(),  0.1, 3)  : current.ampScale(),
                req.sysIbp() != null ? checkRange("sysIbp", req.sysIbp(), 0, 200) : current.sysIbp(),
                req.diasIbp() != null ? checkRange("diasIbp", req.diasIbp(), 0, 200) : current.diasIbp()
        ));

        messaging.convertAndSend(VITALS_TOPIC, VitalsResponse.from(updated));
        return updated;
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
