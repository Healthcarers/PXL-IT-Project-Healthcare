package be.pxl.healthcareapi.services.authentication;

import be.pxl.healthcareapi.domein.tokens.AccessToken;
import be.pxl.healthcareapi.exception.NotFoundException;
import be.pxl.healthcareapi.repositories.AccessTokenRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AccesTokenServiceTests {

    @Mock
    private AccessTokenRepository accessTokenRepository;

    @InjectMocks
    private AccessTokenService accessTokenService;

    @Test
    void revoke_shouldSetRevokedAt_whenAccessTokenExists() {
        // Arrange
        String jwtId = UUID.randomUUID().toString();

        AccessToken accessToken = new AccessToken();
        accessToken.setRevokedAt(null);

        when(accessTokenRepository.findByJwtId(jwtId))
                .thenReturn(Optional.of(accessToken));

        // Act
        accessTokenService.revoke(jwtId);

        // Assert
        assertNotNull(accessToken.getRevokedAt());
        assertTrue(accessToken.getRevokedAt().isBefore(Instant.now().plusSeconds(1)));

        verify(accessTokenRepository).findByJwtId(jwtId);
    }

    @Test
    void revoke_shouldThrowNotFoundException_whenAccessTokenDoesNotExist() {
        // Arrange
        String jwtId = UUID.randomUUID().toString();

        when(accessTokenRepository.findByJwtId(jwtId))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(NotFoundException.class,
                () -> accessTokenService.revoke(jwtId));

        verify(accessTokenRepository).findByJwtId(jwtId);
    }
}
