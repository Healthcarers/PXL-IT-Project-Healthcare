package be.pxl.healthcareapi.services.authentication;

import be.pxl.healthcareapi.domein.tokens.AccessToken;
import be.pxl.healthcareapi.exception.NotFoundException;
import be.pxl.healthcareapi.repositories.AccessTokenRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AccessTokenService {
    private final AccessTokenRepository accessTokenRepository;

    @Transactional
    public void revoke(String jwtId) {

        AccessToken accessToken = accessTokenRepository.findByJwtId(jwtId)
                .orElseThrow(() -> new NotFoundException("Access token kan niet gevonden worden"));

        accessToken.setRevokedAt(Instant.now());
    }
}
