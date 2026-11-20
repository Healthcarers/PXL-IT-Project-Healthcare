package be.pxl.healthcareapi.repositories;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.domein.RoomStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    Optional<Room> findByCode(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Room r where r.code = :code")
    Optional<Room> findForUpdate(String code);

    @Query("select r.ownerId from Room r where r.code = :code")
    Optional<UUID> findOwnerIdByCode(String code);

    Optional<Room> findFirstByOwnerIdAndStatusInOrderByCreatedAtDescIdDesc(UUID ownerId, Collection<RoomStatus> statuses);

    boolean existsByCode(String code);
}
