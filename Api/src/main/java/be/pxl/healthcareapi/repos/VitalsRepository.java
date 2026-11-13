package be.pxl.healthcareapi.repos;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import org.springframework.stereotype.Repository;

import java.util.concurrent.atomic.AtomicReference;
import java.util.function.UnaryOperator;

@Repository
public class VitalsRepository {
    private final AtomicReference<VitalsSnapshot> current =
            new AtomicReference<>(VitalsSnapshot.defaults());

    public VitalsSnapshot current() {
        return current.get();
    }

    public VitalsSnapshot update(UnaryOperator<VitalsSnapshot> change) {
        return current.updateAndGet(change);
    }
}
