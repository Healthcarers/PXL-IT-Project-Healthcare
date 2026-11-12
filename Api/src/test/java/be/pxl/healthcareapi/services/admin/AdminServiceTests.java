package be.pxl.healthcareapi.services.admin;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.AdminAccountResponse;
import be.pxl.healthcareapi.dto.AdminStatsResponse;
import be.pxl.healthcareapi.repos.PersonRepo;
import be.pxl.healthcareapi.services.person.PersonService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTests {

    @Mock
    private PersonRepo personRepo;

    @Mock
    private PersonService personService;

    @InjectMocks
    private AdminService adminService;

    @Test
    void getStats_ShouldReturnLiveCountsFromPersonRepo() {
        when(personRepo.count()).thenReturn(15L);
        when(personRepo.countByRole(Role.LECTOR)).thenReturn(3L);
        when(personRepo.countByRole(Role.CURSIST)).thenReturn(11L);

        AdminStatsResponse result = adminService.getStats();

        assertEquals(15L, result.totalAccounts());
        assertEquals(3L, result.lectoren());
        assertEquals(11L, result.cursisten());
    }

    @Test
    void getAccounts_ShouldReturnAccountDetailsWithoutPasswords() {
        UUID id = UUID.randomUUID();
        Person person = mock(Person.class);
        when(person.getId()).thenReturn(id);
        when(person.getFirstname()).thenReturn("Ada");
        when(person.getLastname()).thenReturn("Lovelace");
        when(person.getEmail()).thenReturn("ada@example.com");
        when(person.getRole()).thenReturn(Role.LECTOR);
        when(person.getCreatedAt()).thenReturn(LocalDate.of(2025, 1, 2));
        when(personRepo.findAll()).thenReturn(List.of(person));

        List<AdminAccountResponse> result = adminService.getAccounts();

        assertEquals(
                List.of(new AdminAccountResponse(
                        id,
                        "Ada",
                        "Lovelace",
                        "ada@example.com",
                        Role.LECTOR,
                        LocalDate.of(2025, 1, 2)
                )),
                result
        );
    }
}
