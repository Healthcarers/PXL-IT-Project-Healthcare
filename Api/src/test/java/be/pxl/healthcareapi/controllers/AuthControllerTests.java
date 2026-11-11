package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.dto.AuthResponse;
import be.pxl.healthcareapi.dto.LoginRequest;
import be.pxl.healthcareapi.dto.RegisterRequest;
import be.pxl.healthcareapi.config.SecurityConfig;
import be.pxl.healthcareapi.domein.TokenPair;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.services.Authentication.AuthCookieService;
import be.pxl.healthcareapi.services.Authentication.AuthService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.oauth2.jwt.Jwt.withTokenValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
public class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private AuthCookieService authCookieService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void registerUser_ShouldReturnSuccess() throws Exception {
        // Arrange
        RegisterRequest request = new RegisterRequest("test", "user", "test@email.com", "testpass", "testpass");

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

    }

    @Test
    void registerUser_ShouldReturnBadRequestWhenDTOIsInvalid() throws Exception {
        // Arrange
        RegisterRequest request = new RegisterRequest("", "user", "test@email.com", "testpass", "testpass");

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Voornaam is verplicht"));
    }

    @Test
    void registerUser_ShouldReturnBadRequestWhenPasswordsDoNotMatch() throws Exception {
        // Arrange
        String jsonBody = """
        {
            "firstname": "test",
            "lastname": "user",
            "email": "test@email.com",
            "password": "testpass",
            "passwordRepeated": "wrong"
        }
        """;

        // Act
        var result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonBody));

        // Assert
        result.andExpect(status().isBadRequest())
                .andExpect(content().string("De ingevoerde wachtwoorden komen niet overeen"));
    }

    @Test
    void login_ShouldReturnPersonAndSetAuthCookies() throws Exception {
        // Arrange
        LoginRequest request = new LoginRequest("test@email.com", "testpass");
        TokenPair tokens = new TokenPair("access-token", "refresh-token");
        AuthResponse authResponse = new AuthResponse("test", "user", Role.CURSIST);
        ResponseCookie accessCookie = ResponseCookie.from("access_token", tokens.accessToken()).build();
        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", tokens.refreshToken()).build();
        when(authService.login(any(LoginRequest.class))).thenReturn(tokens);
        when(authService.getPersonFromUUID(tokens.accessToken())).thenReturn(authResponse);
        when(authCookieService.createAccessCookie(tokens.accessToken())).thenReturn(accessCookie);
        when(authCookieService.createRefreshCookie(tokens.refreshToken())).thenReturn(refreshCookie);

        // Act
        var result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        // Assert
        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.firstname").value("test"))
                .andExpect(jsonPath("$.lastname").value("user"))
                .andExpect(jsonPath("$.role").value("CURSIST"))
                .andExpect(header().stringValues(
                        HttpHeaders.SET_COOKIE,
                        accessCookie.toString(),
                        refreshCookie.toString()
                ));
        verify(authService).login(request);
        verify(authService).getPersonFromUUID(tokens.accessToken());
    }

    @Test
    void refresh_ShouldReturnSuccessAndSetNewAuthCookies() throws Exception {
        // Arrange
        TokenPair tokens = new TokenPair("new-access-token", "new-refresh-token");
        ResponseCookie accessCookie = ResponseCookie.from("access_token", tokens.accessToken()).build();
        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", tokens.refreshToken()).build();
        when(authService.refresh("old-refresh-token")).thenReturn(tokens);
        when(authCookieService.createAccessCookie(tokens.accessToken())).thenReturn(accessCookie);
        when(authCookieService.createRefreshCookie(tokens.refreshToken())).thenReturn(refreshCookie);

        // Act
        var result = mockMvc.perform(post("/api/auth/refresh")
                .cookie(new Cookie("refresh_token", "old-refresh-token")));

        // Assert
        result.andExpect(status().isOk())
                .andExpect(content().string(""))
                .andExpect(header().stringValues(
                        HttpHeaders.SET_COOKIE,
                        accessCookie.toString(),
                        refreshCookie.toString()
                ));
        verify(authService).refresh("old-refresh-token");
    }

    @Test
    void authorize_ShouldReturnPersonForAccessTokenCookie() throws Exception {
        // Arrange
        String accessToken = "access-token";
        AuthResponse authResponse = new AuthResponse("test", "user", Role.CURSIST);
        when(jwtDecoder.decode(accessToken)).thenReturn(withTokenValue(accessToken)
                .header("alg", "HS256")
                .subject("person-id")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .build());
        when(authService.getPersonFromUUID(accessToken)).thenReturn(authResponse);

        // Act
        var result = mockMvc.perform(get("/api/auth/me")
                .cookie(new Cookie("access_token", accessToken)));

        // Assert
        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.firstname").value("test"))
                .andExpect(jsonPath("$.lastname").value("user"))
                .andExpect(jsonPath("$.role").value("CURSIST"));
        verify(authService).getPersonFromUUID(accessToken);
    }
}
