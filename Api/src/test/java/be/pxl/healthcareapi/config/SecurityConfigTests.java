package be.pxl.healthcareapi.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityConfigTests {

    @Test
    void jwtAuthenticationConverter_shouldMapRoleClaimToRoleAuthority() {
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject("person-id")
                .claim("role", "LECTOR")
                .build();

        var authentication = new SecurityConfig()
                .jwtAuthenticationConverter()
                .convert(jwt);

        assertTrue(authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_LECTOR")));
    }
}
