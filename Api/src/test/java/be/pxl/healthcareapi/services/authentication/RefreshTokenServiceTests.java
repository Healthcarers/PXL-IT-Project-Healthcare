package be.pxl.healthcareapi.services.authentication;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.RefreshToken;
import be.pxl.healthcareapi.repos.RefreshTokenRepo;
import be.pxl.healthcareapi.services.Authentication.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RefreshTokenServiceTests {

    private record CreatedRefreshToken(String rawToken, RefreshToken storedToken) {}

    @Mock
    private RefreshTokenRepo refreshTokenRepo;

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        refreshTokenService = new RefreshTokenService(refreshTokenRepo);
    }

    @Test
    void createRefreshToken_shouldSaveHashedTokenAndReturnRawToken() {
        //Arrange
        Person person = new Person("Test", "User", "test@example.com", "password");
        Instant beforeCreation = Instant.now();

        //Act
        String rawToken = refreshTokenService.createRefreshToken(person);

        //Assert
        Instant afterCreation = Instant.now();
        ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepo).save(tokenCaptor.capture());
        RefreshToken savedToken = tokenCaptor.getValue();

        assertEquals(64, Base64.getUrlDecoder().decode(rawToken).length);
        assertEquals(person, savedToken.getPerson());
        assertNotEquals(rawToken, savedToken.getTokenHash());
        assertTrue(savedToken.getTokenHash().matches("[0-9a-f]{64}"));
        assertFalse(savedToken.getCreatedAt().isBefore(beforeCreation));
        assertFalse(savedToken.getCreatedAt().isAfter(afterCreation));
        assertFalse(savedToken.getExpiresAt().isBefore(beforeCreation.plus(30, ChronoUnit.DAYS)));
        assertFalse(savedToken.getExpiresAt().isAfter(afterCreation.plus(30, ChronoUnit.DAYS)));
        assertNull(savedToken.getRevokedAt());
    }

    @Test
    void validateRefreshToken_shouldReturnMatchingUnrevokedUnexpiredToken() {
        //Arrange
        CreatedRefreshToken createdToken = createStoredToken();
        RefreshToken storedToken = createdToken.storedToken();
        storedToken.setExpiresAt(Instant.now().plus(1, ChronoUnit.DAYS));
        when(refreshTokenRepo.findByTokenHash(storedToken.getTokenHash())).thenReturn(Optional.of(storedToken));

        //Act
        RefreshToken result = refreshTokenService.validateRefreshToken(createdToken.rawToken());

        //Assert
        assertSame(storedToken, result);
        verify(refreshTokenRepo).findByTokenHash(storedToken.getTokenHash());
    }

    @Test
    void validateRefreshToken_shouldThrowWhenTokenDoesNotExist() {
        //Arrange
        String rawToken = "unknown-refresh-token";
        when(refreshTokenRepo.findByTokenHash(anyString())).thenReturn(Optional.empty());

        //Act + Assert
        assertThrows(
                BadCredentialsException.class,
                () -> refreshTokenService.validateRefreshToken(rawToken)
        );
    }

    @Test
    void validateRefreshToken_shouldThrowWhenTokenIsRevoked() {
        //Arrange
        CreatedRefreshToken createdToken = createStoredToken();
        RefreshToken storedToken = createdToken.storedToken();
        storedToken.setExpiresAt(Instant.now().plus(1, ChronoUnit.DAYS));
        storedToken.setRevokedAt(Instant.now());
        when(refreshTokenRepo.findByTokenHash(storedToken.getTokenHash())).thenReturn(Optional.of(storedToken));

        //Act + Assert
        assertThrows(
                BadCredentialsException.class,
                () -> refreshTokenService.validateRefreshToken(createdToken.rawToken())
        );
    }

    @Test
    void validateRefreshToken_shouldThrowWhenTokenIsExpired() {
        //Arrange
        CreatedRefreshToken createdToken = createStoredToken();
        RefreshToken storedToken = createdToken.storedToken();
        storedToken.setExpiresAt(Instant.now().minus(1, ChronoUnit.SECONDS));
        when(refreshTokenRepo.findByTokenHash(storedToken.getTokenHash())).thenReturn(Optional.of(storedToken));

        //Act + Assert
        assertThrows(
                BadCredentialsException.class,
                () -> refreshTokenService.validateRefreshToken(createdToken.rawToken())
        );
    }

    @Test
    void revokeToken_shouldSetRevokedAtAndSaveToken() {
        //Arrange
        RefreshToken refreshToken = new RefreshToken();
        Instant beforeRevocation = Instant.now();

        //Act
        refreshTokenService.revokeToken(refreshToken);

        //Assert
        Instant afterRevocation = Instant.now();
        assertNotNull(refreshToken.getRevokedAt());
        assertFalse(refreshToken.getRevokedAt().isBefore(beforeRevocation));
        assertFalse(refreshToken.getRevokedAt().isAfter(afterRevocation));
        verify(refreshTokenRepo).save(refreshToken);
    }

    private CreatedRefreshToken createStoredToken() {
        Person person = new Person("Test", "User", "test@example.com", "password");
        String rawToken = refreshTokenService.createRefreshToken(person);
        ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepo).save(tokenCaptor.capture());
        return new CreatedRefreshToken(rawToken, tokenCaptor.getValue());
    }
}
