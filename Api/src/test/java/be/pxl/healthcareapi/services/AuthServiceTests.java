package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.DTO.RegisterRequest;
import be.pxl.healthcareapi.DTO.RegisterResponse;
import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.repos.PersonRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;


import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTests {
    @Mock
    private PersonRepo personRepo;

    @Mock
    private PasswordEncoder encoder;

    @InjectMocks
    private AuthService authService;

    @Captor
    private ArgumentCaptor<Person> argumentCaptor;


    @Test
    public void registerUser_ShouldSaveUserAndHashPassword(){
        //Arrange
        RegisterRequest registerRequest = new RegisterRequest("test", "user", "test@email.com", "testpass", "testpass");

        when(encoder.encode("testpass")).thenReturn("geheime_hash_string");

        //Act
        authService.registerUser(registerRequest);

        verify(personRepo, times(1)).save(argumentCaptor.capture());

        Person person = argumentCaptor.getValue();

        //Assert
        assertEquals("test", person.getFirstname());
        assertEquals("user", person.getLastname());
        assertEquals("geheime_hash_string", person.getPassword());

    }

    @Test
    public void registerUser_ShouldReturnCorrectResponse(){
        //Arrange
        RegisterRequest registerRequest = new RegisterRequest("test", "user", "test@email.com", "testpass", "testpass");

        when(encoder.encode("testpass")).thenReturn("geheime_hash_string");

        //Act
        RegisterResponse response = authService.registerUser(registerRequest);

        //Assert
        assertEquals("Account for test user has been registered.", response.message());
    }
}
