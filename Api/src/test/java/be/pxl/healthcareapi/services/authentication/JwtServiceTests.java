package be.pxl.healthcareapi.services.authentication;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.*;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtServiceTests {

    @Mock
    private JwtEncoder jwtEncoder;

    @Mock
    private JwtDecoder jwtDecoder;

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(jwtEncoder, jwtDecoder);
    }

    @Test
    void generateToken_shouldGenerateJwtWithCorrectClaims() {
        // Arrange
        UUID userId = UUID.randomUUID();

        Jwt generatedJwt = Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .issuer("healthcare-api")
                .subject(userId.toString())
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .build();

        when(jwtEncoder.encode(any(JwtEncoderParameters.class)))
                .thenReturn(generatedJwt);

        // Act
        String token = jwtService.generateToken(userId);

        // Assert
        assertEquals("test-token", token);

        ArgumentCaptor<JwtEncoderParameters> captor =
                ArgumentCaptor.forClass(JwtEncoderParameters.class);

        verify(jwtEncoder).encode(captor.capture());

        JwtClaimsSet claims = captor.getValue().getClaims();

        assertEquals("healthcare-api", claims.getClaim("iss"));
        assertEquals(userId.toString(), claims.getSubject());
        assertNotNull(claims.getIssuedAt());
        assertNotNull(claims.getExpiresAt());

        assertEquals(
                900,
                claims.getExpiresAt().getEpochSecond()
                        - claims.getIssuedAt().getEpochSecond()
        );
    }

    @Test
    void extractUserId_shouldReturnCorrectUUID() {
        // Arrange
        UUID expectedUserId = UUID.randomUUID();

        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject(expectedUserId.toString())
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .build();

        when(jwtDecoder.decode("test-token")).thenReturn(jwt);

        // Act
        UUID result = jwtService.extractUserId("test-token");

        // Assert
        assertEquals(expectedUserId, result);
        verify(jwtDecoder).decode("test-token");
    }

    @Test
    void extractUserId_shouldThrowExceptionWhenSubjectIsNotUUID() {
        // Arrange
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject("not-a-valid-uuid")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .build();

        when(jwtDecoder.decode("test-token")).thenReturn(jwt);

        // Act & Assert
        assertThrows(
                IllegalArgumentException.class,
                () -> jwtService.extractUserId("test-token")
        );
    }
}
