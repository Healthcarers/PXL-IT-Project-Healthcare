package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.config.SecurityConfig;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.repos.PersonRepo;
import be.pxl.healthcareapi.services.admin.AdminService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.oauth2.jwt.Jwt.withTokenValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
@Import({SecurityConfig.class, AdminService.class})
class AdminControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PersonRepo personRepo;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void getStats_ShouldReturnStatsForAdminRole() throws Exception {
        String token = "admin-token";
        when(jwtDecoder.decode(token)).thenReturn(withTokenValue(token)
                .header("alg", "HS256")
                .subject("admin-id")
                .claim("role", "ADMIN")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .build());
        when(personRepo.count()).thenReturn(12L);
        when(personRepo.countByRole(Role.LECTOR)).thenReturn(2L);
        when(personRepo.countByRole(Role.CURSIST)).thenReturn(9L);

        mockMvc.perform(get("/api/admin/stats")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAccounts").value(12))
                .andExpect(jsonPath("$.lectoren").value(2))
                .andExpect(jsonPath("$.cursisten").value(9));
    }

    @Test
    void getStats_ShouldReturnForbiddenForNonAdminRole() throws Exception {
        String token = "cursist-token";
        when(jwtDecoder.decode(token)).thenReturn(withTokenValue(token)
                .header("alg", "HS256")
                .subject("cursist-id")
                .claim("role", "CURSIST")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .build());

        mockMvc.perform(get("/api/admin/stats")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(personRepo);
    }

    @Test
    void getStats_ShouldReturnUnauthorizedWithoutCookie() throws Exception {
        mockMvc.perform(get("/api/admin/stats"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(personRepo);
    }
}
