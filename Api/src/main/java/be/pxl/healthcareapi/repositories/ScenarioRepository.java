package be.pxl.healthcareapi.repositories;

import be.pxl.healthcareapi.domein.Scenario;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ScenarioRepository extends JpaRepository<Scenario, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Scenario s where s.id = :id")
    Optional<Scenario> findForUpdate(UUID id);
}
