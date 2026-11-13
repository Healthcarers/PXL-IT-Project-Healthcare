package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.dto.PersonIdRequest;
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

}
