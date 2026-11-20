package be.pxl.healthcareapi.domein.tokens;

import be.pxl.healthcareapi.domein.Person;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "access_tokens")
public class AccessToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String jwtId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant revokedAt;

    public AccessToken(){}

    public AccessToken(String jwtId, Person person, Instant expiresAt, Instant createdAt) {
        this.jwtId = jwtId;
        this.person = person;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }
}
