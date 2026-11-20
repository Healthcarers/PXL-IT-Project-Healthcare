package be.pxl.healthcareapi.repositories;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    void deleteAllByPerson(Person person);
}
