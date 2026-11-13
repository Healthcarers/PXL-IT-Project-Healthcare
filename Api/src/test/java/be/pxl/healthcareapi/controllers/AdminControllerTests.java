package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.config.SecurityConfig;
import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.PersonIdRequest;
import be.pxl.healthcareapi.repos.PersonRepo;
import be.pxl.healthcareapi.repos.RefreshTokenRepo;
import be.pxl.healthcareapi.services.admin.AdminService;
import be.pxl.healthcareapi.services.person.PersonService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.oauth2.jwt.Jwt.withTokenValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
    private RefreshTokenRepo refreshTokenRepo;

    @MockitoBean
    private PersonService personService;

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

    @Test
    void getAccounts_ShouldReturnAccountDetailsForAdminRole() throws Exception {
        String token = "admin-token";
        UUID accountId = UUID.randomUUID();
        Person person = mock(Person.class);
        when(person.getId()).thenReturn(accountId);
        when(person.getFirstname()).thenReturn("Ada");
        when(person.getLastname()).thenReturn("Lovelace");
        when(person.getEmail()).thenReturn("ada@example.com");
        when(person.getRole()).thenReturn(Role.LECTOR);
        when(person.getCreatedAt()).thenReturn(LocalDate.of(2025, 1, 2));
        when(personRepo.findAll()).thenReturn(List.of(person));
        when(jwtDecoder.decode(token)).thenReturn(withTokenValue(token)
                .header("alg", "HS256")
                .subject("admin-id")
                .claim("role", "ADMIN")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .build());

        mockMvc.perform(get("/api/admin/accounts")
                        .cookie(new Cookie("access_token", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(accountId.toString()))
                .andExpect(jsonPath("$[0].firstname").value("Ada"))
                .andExpect(jsonPath("$[0].lastname").value("Lovelace"))
                .andExpect(jsonPath("$[0].email").value("ada@example.com"))
                .andExpect(jsonPath("$[0].role").value("LECTOR"))
                .andExpect(jsonPath("$[0].createdAt").value("2025-01-02"));
    }

    @Test
    void deletePerson_ShouldDeleteAccountForAdminRole() throws Exception {
        String token = "admin-token";
        PersonIdRequest request = new PersonIdRequest(UUID.randomUUID().toString());
        Person person = mock(Person.class);
        when(personService.getPersonByUUID(request)).thenReturn(person);
        when(person.getRole()).thenReturn(Role.CURSIST);
        when(jwtDecoder.decode(token)).thenReturn(withTokenValue(token)
                .header("alg", "HS256")
                .subject("admin-id")
                .claim("role", "ADMIN")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .build());

        mockMvc.perform(delete("/api/admin/delete")
                        .cookie(new Cookie("access_token", token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"uuid\":\"" + request.uuid() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string(""));

        verify(personService).getPersonByUUID(request);
        var deletionOrder = inOrder(refreshTokenRepo, personRepo);
        deletionOrder.verify(refreshTokenRepo).deleteAllByPerson(person);
        deletionOrder.verify(personRepo).delete(person);
    }

    @Test
    void deletePerson_ShouldReturnForbiddenForNonAdminRole() throws Exception {
        String token = "cursist-token";
        when(jwtDecoder.decode(token)).thenReturn(withTokenValue(token)
                .header("alg", "HS256")
                .subject("cursist-id")
                .claim("role", "CURSIST")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .build());

        mockMvc.perform(delete("/api/admin/delete")
                        .cookie(new Cookie("access_token", token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"uuid\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(personRepo, refreshTokenRepo, personService);
    }
}
