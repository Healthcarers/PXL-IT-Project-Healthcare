package be.pxl.healthcareapi.services.admin;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.AdminAccountResponse;
import be.pxl.healthcareapi.dto.AdminStatsResponse;
import be.pxl.healthcareapi.dto.PersonIdRequest;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.repos.PersonRepo;
import be.pxl.healthcareapi.repos.RefreshTokenRepo;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTests {

    @Mock
    private PersonRepo personRepo;

    @Mock
    private RefreshTokenRepo refreshTokenRepo;

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

    @Test
    void setPersonRole_ShouldChangeRoleToLectorAndSavePerson() {
        PersonIdRequest request = new PersonIdRequest(UUID.randomUUID().toString());
        Person person = mock(Person.class);
        when(personService.getPersonByUUID(request)).thenReturn(person);
        when(person.getRole()).thenReturn(Role.CURSIST);

        adminService.setPersonRole(request);

        verify(person).changeRole(Role.LECTOR);
        verify(personRepo).save(person);
    }

    @Test
    void setPersonRole_ShouldRejectPersonWhoIsAlreadyLector() {
        PersonIdRequest request = new PersonIdRequest(UUID.randomUUID().toString());
        Person person = mock(Person.class);
        when(personService.getPersonByUUID(request)).thenReturn(person);
        when(person.getRole()).thenReturn(Role.LECTOR);

        assertThrows(BadRequestException.class, () -> adminService.setPersonRole(request));

        org.mockito.Mockito.verifyNoInteractions(personRepo);
    }

    @Test
    void deletePerson_ShouldDeleteNonAdminAccount() {
        PersonIdRequest request = new PersonIdRequest(UUID.randomUUID().toString());
        Person person = mock(Person.class);
        when(personService.getPersonByUUID(request)).thenReturn(person);
        when(person.getRole()).thenReturn(Role.CURSIST);

        adminService.deletePerson(request);

        var deletionOrder = inOrder(refreshTokenRepo, personRepo);
        deletionOrder.verify(refreshTokenRepo).deleteAllByPerson(person);
        deletionOrder.verify(personRepo).delete(person);
    }

    @Test
    void deletePerson_ShouldRejectAdminAccount() {
        PersonIdRequest request = new PersonIdRequest(UUID.randomUUID().toString());
        Person person = mock(Person.class);
        when(personService.getPersonByUUID(request)).thenReturn(person);
        when(person.getRole()).thenReturn(Role.ADMIN);

        assertThrows(BadRequestException.class, () -> adminService.deletePerson(request));

        org.mockito.Mockito.verifyNoInteractions(personRepo);
    }
}
