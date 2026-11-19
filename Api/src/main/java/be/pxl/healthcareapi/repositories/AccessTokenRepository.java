package be.pxl.healthcareapi.repositories;

import be.pxl.healthcareapi.domein.tokens.AccessToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AccessTokenRepository extends JpaRepository<AccessToken, UUID> {
    Optional<AccessToken> findByJwtId(String jwtId);
}
