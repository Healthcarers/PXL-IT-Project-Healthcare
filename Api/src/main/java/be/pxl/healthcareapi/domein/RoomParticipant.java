
package be.pxl.healthcareapi.domein;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Entity
@Table(
        name = "room_participants",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_room_participant",
                        columnNames = {"room_id", "user_id"}
                )
        }
)
public class RoomParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private LocalDateTime joinedAt;

    protected RoomParticipant() {
        // Vereist door JPA
    }

    public RoomParticipant(Room room, UUID userId) {
        this.room = room;
        this.userId = userId;
        this.joinedAt = LocalDateTime.now();
    }
}
