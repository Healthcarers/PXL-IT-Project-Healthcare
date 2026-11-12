package be.pxl.healthcareapi.services.authentication;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.RefreshToken;
import be.pxl.healthcareapi.domein.TokenPair;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.AuthResponse;
import be.pxl.healthcareapi.dto.LoginRequest;
import be.pxl.healthcareapi.dto.RegisterRequest;
import be.pxl.healthcareapi.dto.RegisterResponse;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.repos.PersonRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTests {
    @Mock
    private PersonRepo personRepo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    @Test
    void registerUser_shouldSavePersonWithHashedPasswordAndReturnResponse() {
        // Arrange
        RegisterRequest request = new RegisterRequest(
                "test", "user", "test@email.com", "testpass", "testpass"
        );
        when(passwordEncoder.encode(request.password())).thenReturn("hashed-password");
        ArgumentCaptor<Person> personCaptor = ArgumentCaptor.forClass(Person.class);

        // Act
        RegisterResponse response = authService.registerUser(request);

        // Assert
        verify(personRepo).save(personCaptor.capture());
        Person savedPerson = personCaptor.getValue();
        assertEquals("test", savedPerson.getFirstname());
        assertEquals("user", savedPerson.getLastname());
        assertEquals("test@email.com", savedPerson.getEmail());
        assertEquals("hashed-password", savedPerson.getPassword());
        assertEquals(Role.CURSIST, savedPerson.getRole());
        assertEquals("Account voor test user is registreerd.", response.message());
    }

    @Test
    void login_shouldReturnAccessAndRefreshTokensWhenCredentialsAreValid() {
        // Arrange
        LoginRequest request = new LoginRequest("test@email.com", "testpass");
        UUID personId = UUID.randomUUID();
        Person person = mock(Person.class);
        when(personRepo.getPersonByEmail(request.email())).thenReturn(Optional.of(person));
        when(person.getPassword()).thenReturn("hashed-password");
        when(person.getId()).thenReturn(personId);
        when(person.getRole()).thenReturn(Role.CURSIST);
        when(passwordEncoder.matches(request.password(), "hashed-password")).thenReturn(true);
        when(jwtService.generateToken(personId, Role.CURSIST)).thenReturn("access-token");
        when(refreshTokenService.createRefreshToken(person)).thenReturn("refresh-token");

        // Act
        TokenPair tokens = authService.login(request);

        // Assert
        assertEquals(new TokenPair("access-token", "refresh-token"), tokens);
        verify(passwordEncoder).matches(request.password(), "hashed-password");
        verify(jwtService).generateToken(personId, Role.CURSIST);
        verify(refreshTokenService).createRefreshToken(person);
    }

    @Test
    void login_shouldThrowWhenPersonDoesNotExist() {
        // Arrange
        LoginRequest request = new LoginRequest("missing@email.com", "testpass");
        when(personRepo.getPersonByEmail(request.email())).thenReturn(Optional.empty());

        // Act
        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> authService.login(request)
        );

        // Assert
        assertEquals("Login gegevens zijn niet correct", exception.getMessage());
        verifyNoInteractions(passwordEncoder, jwtService, refreshTokenService);
    }

    @Test
    void login_shouldThrowWhenPasswordIsIncorrect() {
        // Arrange
        LoginRequest request = new LoginRequest("test@email.com", "wrong-password");
        Person person = mock(Person.class);
        when(personRepo.getPersonByEmail(request.email())).thenReturn(Optional.of(person));
        when(person.getPassword()).thenReturn("hashed-password");
        when(passwordEncoder.matches(request.password(), "hashed-password")).thenReturn(false);

        // Act
        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> authService.login(request)
        );

        // Assert
        assertEquals("Login gegevens zijn niet correct", exception.getMessage());
        verifyNoInteractions(jwtService, refreshTokenService);
    }

    @Test
    void refresh_shouldRevokeOldTokenAndReturnNewTokenPair() {
        // Arrange
        String oldRawToken = "old-refresh-token";
        Person person = mock(Person.class);
        RefreshToken oldToken = mock(RefreshToken.class);
        UUID personId = UUID.randomUUID();
        when(refreshTokenService.validateRefreshToken(oldRawToken)).thenReturn(oldToken);
        when(oldToken.getPerson()).thenReturn(person);
        when(person.getId()).thenReturn(personId);
        when(person.getRole()).thenReturn(Role.LECTOR);
        when(jwtService.generateToken(personId, Role.LECTOR)).thenReturn("new-access-token");
        when(refreshTokenService.createRefreshToken(person)).thenReturn("new-refresh-token");

        // Act
        TokenPair tokens = authService.refresh(oldRawToken);

        // Assert
        assertEquals(new TokenPair("new-access-token", "new-refresh-token"), tokens);
        verify(refreshTokenService).revokeToken(oldToken);
        verify(jwtService).generateToken(personId, Role.LECTOR);
        verify(refreshTokenService).createRefreshToken(person);
    }

    @Test
    void refresh_shouldPropagateErrorWhenRefreshTokenIsInvalid() {
        // Arrange
        String rawToken = "invalid-refresh-token";
        when(refreshTokenService.validateRefreshToken(rawToken))
                .thenThrow(new BadCredentialsException("Ongeldige refresh token"));

        // Act
        BadCredentialsException exception = assertThrows(
                BadCredentialsException.class,
                () -> authService.refresh(rawToken)
        );

        // Assert
        assertEquals("Ongeldige refresh token", exception.getMessage());
        verify(refreshTokenService, never()).revokeToken(any());
        verifyNoInteractions(jwtService);
    }

    @Test
    void getPersonFromUUID_shouldReturnPersonDetailsWhenPersonExists() {
        // Arrange
        String accessToken = "access-token";
        UUID personId = UUID.randomUUID();
        Person person = mock(Person.class);
        when(jwtService.extractUserId(accessToken)).thenReturn(personId);
        when(personRepo.getPersonById(personId)).thenReturn(Optional.of(person));
        when(person.getFirstname()).thenReturn("test");
        when(person.getLastname()).thenReturn("user");
        when(person.getRole()).thenReturn(Role.CURSIST);

        // Act
        AuthResponse response = authService.getPersonFromUUID(accessToken);

        // Assert
        assertEquals(new AuthResponse("test", "user", Role.CURSIST), response);
        verify(personRepo).getPersonById(personId);
    }

    @Test
    void getPersonFromUUID_shouldThrowWhenPersonDoesNotExist() {
        // Arrange
        String accessToken = "access-token";
        UUID personId = UUID.randomUUID();
        when(jwtService.extractUserId(accessToken)).thenReturn(personId);
        when(personRepo.getPersonById(personId)).thenReturn(Optional.empty());

        // Act
        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> authService.getPersonFromUUID(accessToken)
        );

        // Assert
        assertEquals("Deze persoon bestaat niet", exception.getMessage());
    }
}
