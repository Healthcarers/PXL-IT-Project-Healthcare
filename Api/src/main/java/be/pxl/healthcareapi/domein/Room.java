package be.pxl.healthcareapi.domein;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Entity
@Table(name = "rooms")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 6)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomStatus status;

    protected Room() {
        // Vereist door JPA
    }

    public Room(String code, String name) {
        this(code, name, null);
    }

    public Room(String code, String name, String description) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.createdAt = LocalDateTime.now();
        this.status = RoomStatus.OPEN;
    }

    public void close() {
        this.status = RoomStatus.CLOSED;
    }
}