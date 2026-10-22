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

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected Room() {
        // Vereist door JPA
    }

    public Room(String code, String name) {
        this.code = code;
        this.name = name;
        this.createdAt = LocalDateTime.now();
    }

}
