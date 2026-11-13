
package be.pxl.healthcareapi.repositories;

import be.pxl.healthcareapi.domein.RoomParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, UUID> {

    List<RoomParticipant> findByRoomId(UUID roomId);

    boolean existsByRoomIdAndUserId(UUID roomId, UUID userId);

    long countByRoomId(UUID roomId);
}
