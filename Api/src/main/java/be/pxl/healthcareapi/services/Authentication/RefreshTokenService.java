package be.pxl.healthcareapi.services.Authentication;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.RefreshToken;
import be.pxl.healthcareapi.repos.RefreshTokenRepo;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepo refreshTokenRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    private static final long REFRESH_TOKEN_DAYS = 30;

    public RefreshTokenService(
            RefreshTokenRepo refreshTokenRepository
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public String createRefreshToken(Person person) {
        byte[] randomBytes = new byte[64];
        secureRandom.nextBytes(randomBytes);

        String rawToken = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setPerson(person);
        refreshToken.setTokenHash(hashToken(rawToken));
        refreshToken.setCreatedAt(Instant.now());
        refreshToken.setExpiresAt(
                Instant.now().plus(REFRESH_TOKEN_DAYS, ChronoUnit.DAYS)
        );

        refreshTokenRepository.save(refreshToken);

        return rawToken;
    }

    public RefreshToken validateRefreshToken(String rawToken) {
        String tokenHash = hashToken(rawToken);

        RefreshToken refreshToken = refreshTokenRepository
                .findByTokenHash(tokenHash)
                .orElseThrow(() ->
                        new BadCredentialsException("Invalid refresh token")
                );

        if (refreshToken.getRevokedAt() != null) {
            throw new BadCredentialsException("Invalid refresh token");
        }

        if (refreshToken.getExpiresAt().isBefore(Instant.now())) {
            throw new BadCredentialsException("Invalid refresh token");
        }

        return refreshToken;
    }

    public void revokeToken(RefreshToken refreshToken) {
        refreshToken.setRevokedAt(Instant.now());
        refreshTokenRepository.save(refreshToken);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(
                    token.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
