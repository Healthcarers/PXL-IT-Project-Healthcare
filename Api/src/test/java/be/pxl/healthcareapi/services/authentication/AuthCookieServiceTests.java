package be.pxl.healthcareapi.services.authentication;

import be.pxl.healthcareapi.services.Authentication.AuthCookieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import static org.junit.jupiter.api.Assertions.*;

class AuthCookieServiceTests {

    private AuthCookieService authCookieService;

    @BeforeEach
    void setUp() {
        authCookieService = new AuthCookieService();
    }

    @Test
    void createAccessCookie_shouldCreateCorrectCookie() {
        // Arrange
        String accessToken = "test-access-token";

        // Act
        ResponseCookie cookie =
                authCookieService.createAccessCookie(accessToken);

        // Assert
        assertEquals("access_token", cookie.getName());
        assertEquals(accessToken, cookie.getValue());
        assertTrue(cookie.isHttpOnly());
        assertFalse(cookie.isSecure());
        assertEquals("Lax", cookie.getSameSite());
        assertEquals("/", cookie.getPath());
        assertEquals(900, cookie.getMaxAge().getSeconds());
    }

    @Test
    void createRefreshCookie_shouldCreateCorrectCookie() {
        // Arrange
        String refreshToken = "test-refresh-token";

        // Act
        ResponseCookie cookie =
                authCookieService.createRefreshCookie(refreshToken);

        // Assert
        assertEquals("refresh_token", cookie.getName());
        assertEquals(refreshToken, cookie.getValue());
        assertTrue(cookie.isHttpOnly());
        assertFalse(cookie.isSecure());
        assertEquals("Lax", cookie.getSameSite());
        assertEquals("/api/auth", cookie.getPath());
        assertEquals(2592000, cookie.getMaxAge().getSeconds());
    }
}
