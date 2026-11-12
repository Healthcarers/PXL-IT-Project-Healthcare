package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.PersonIdRequest;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.exception.NotFoundException;
import be.pxl.healthcareapi.repos.PersonRepo;
import be.pxl.healthcareapi.services.person.PersonService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PersonServiceTests {

    @Mock
    private PersonRepo personRepo;

    @InjectMocks
    private PersonService personService;

    @Test
    void getPersonByUUID_ShouldReturnPersonWhenFound() {
        UUID id = UUID.randomUUID();
        Person person = new Person("Test", "User", "test@email.com", "password");
        when(personRepo.findById(id)).thenReturn(Optional.of(person));

        Person result = personService.getPersonByUUID(new PersonIdRequest(id.toString()));

        assertSame(person, result);
        verify(personRepo).findById(id);
    }

    @Test
    void getPersonByUUID_ShouldThrowNotFoundWhenPersonDoesNotExist() {
        UUID id = UUID.randomUUID();
        when(personRepo.findById(id)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> personService.getPersonByUUID(new PersonIdRequest(id.toString())));
    }

    @Test
    void setPersonRole_ShouldChangeRoleToLectorAndSavePerson() {
        UUID id = UUID.randomUUID();
        Person person = new Person("Test", "User", "test@email.com", "password");
        person.changeRole(Role.CURSIST);
        when(personRepo.findById(id)).thenReturn(Optional.of(person));

        personService.setPersonRole(new PersonIdRequest(id.toString()));

        assertEquals(Role.LECTOR, person.getRole());
        verify(personRepo).save(person);
    }

    @Test
    void setPersonRole_ShouldThrowBadRequestWhenPersonIsAlreadyLector() {
        UUID id = UUID.randomUUID();
        Person person = new Person("Test", "User", "test@email.com", "password");
        person.changeRole(Role.LECTOR);
        when(personRepo.findById(id)).thenReturn(Optional.of(person));

        assertThrows(BadRequestException.class,
                () -> personService.setPersonRole(new PersonIdRequest(id.toString())));

        verifyNoInteractionsAfterFindById(id);
    }

    @Test
    void deletePerson_ShouldDeletePersonWhenNotAdmin() {
        UUID id = UUID.randomUUID();
        Person person = new Person("Test", "User", "test@email.com", "password");
        person.changeRole(Role.CURSIST);
        when(personRepo.findById(id)).thenReturn(Optional.of(person));

        personService.deletePerson(new PersonIdRequest(id.toString()));

        verify(personRepo).delete(person);
    }

    @Test
    void deletePerson_ShouldThrowBadRequestWhenPersonIsAdmin() {
        UUID id = UUID.randomUUID();
        Person person = new Person("Test", "User", "test@email.com", "password");
        person.changeRole(Role.ADMIN);
        when(personRepo.findById(id)).thenReturn(Optional.of(person));

        assertThrows(BadRequestException.class,
                () -> personService.deletePerson(new PersonIdRequest(id.toString())));

        verifyNoInteractionsAfterFindById(id);
    }

    private void verifyNoInteractionsAfterFindById(UUID id) {
        verify(personRepo).findById(id);
        verifyNoMoreInteractions(personRepo);
    }
}
