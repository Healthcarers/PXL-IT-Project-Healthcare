package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.DTO.RegisterRequest;
import be.pxl.healthcareapi.config.SecurityConfig;
import be.pxl.healthcareapi.services.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
                .andExpect(jsonPath("$.firstname").value("must not be blank"));
    }

    @Test
    void registerUser_ShouldReturnBadRequestWhenPasswordsDoNotMatch() throws Exception {
        // Arrange
        RegisterRequest request = new RegisterRequest("test", "user", "test@email.com", "testpass", "wrong");

        when(authService.registerUser(any(RegisterRequest.class)))
                .thenThrow(new IllegalArgumentException("Passwords do not match"));

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Passwords do not match"));
    }
}
