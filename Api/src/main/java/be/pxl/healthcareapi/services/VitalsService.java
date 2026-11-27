package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.dto.VitalsResponse;
import be.pxl.healthcareapi.dto.VitalsUpdateRequest;
import be.pxl.healthcareapi.repositories.VitalsRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.function.ToDoubleFunction;

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
        VitalsSnapshot updated = vitalsRepository.update(current -> applyValues(req, current, 200));

        messaging.convertAndSend(VITALS_TOPIC, VitalsResponse.from(updated));
        return updated;
    }

    static VitalsSnapshot initialSnapshot(VitalsUpdateRequest req) {
        return applyValues(req, null, 300);
    }

    private static VitalsSnapshot applyValues(VitalsUpdateRequest req, VitalsSnapshot current, double maxBloodPressure) {
        return new VitalsSnapshot(
                resolveValue("heartRate", req.heartRate(), current, VitalsSnapshot::heartRate, 0, 220),
                resolveValue("spo2", req.spo2(), current, VitalsSnapshot::spo2, 10, 100),
                resolveValue("respRate", req.respRate(), current, VitalsSnapshot::respRate, 0, 60),
                resolveValue("etco2", req.etco2(), current, VitalsSnapshot::etco2, 0, 100),
                resolveValue("ampScale", req.ampScale(), current, VitalsSnapshot::ampScale, 0.1, 3),
                resolveValue("sysBp", req.sysBp(), current, VitalsSnapshot::sysBp, 0, maxBloodPressure),
                resolveValue("diasBp", req.diasBp(), current, VitalsSnapshot::diasBp, 0, maxBloodPressure)
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
