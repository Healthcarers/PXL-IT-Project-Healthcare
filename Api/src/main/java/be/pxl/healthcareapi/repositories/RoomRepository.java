package be.pxl.healthcareapi.repositories;

import be.pxl.healthcareapi.domein.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import be.pxl.healthcareapi.domein.RoomStatus;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    Optional<Room> findByCode(String code);

    boolean existsByCode(String code);
}
