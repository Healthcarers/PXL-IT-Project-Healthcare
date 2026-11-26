package be.pxl.healthcareapi.services.authentication;

import be.pxl.healthcareapi.dto.AuthResponse;
import be.pxl.healthcareapi.dto.LoginRequest;
import be.pxl.healthcareapi.dto.RegisterRequest;
import be.pxl.healthcareapi.dto.RegisterResponse;
import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.tokens.RefreshToken;
import be.pxl.healthcareapi.domein.TokenPair;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.repositories.PersonRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final PersonRepository personRepo;
    private final PasswordEncoder passwordEncoder;
    private final AccessTokenService accessTokenService;
    private final JwtDecoder jwtDecoder;


    public RegisterResponse registerUser(RegisterRequest request) {
        String hashedPassword = passwordEncoder.encode(request.password());

        Person user = new Person(request.firstname(), request.lastname(), request.email(), hashedPassword);
        user.setRole(Role.CURSIST);

        personRepo.save(user);

        return new RegisterResponse("Account voor " + user.getFirstname() + " " + user.getLastname() + " is registreerd.");
    }

    public TokenPair login(LoginRequest loginRequest) {
        Optional<Person> personOptional = personRepo.getPersonByEmail(loginRequest.email());
        if (personOptional.isEmpty()) {
            throw new BadRequestException("Login gegevens zijn niet correct");
        }

        Person person = personOptional.get();
        if (!passwordEncoder.matches(loginRequest.password(), person.getPassword())) {
            throw new BadRequestException("Login gegevens zijn niet correct");
        }

        String accesToken = jwtService.generateToken(person.getId(), person.getRole());
        String refreshToken = refreshTokenService.createRefreshToken(person);

        return new TokenPair(accesToken, refreshToken);
    }

    public void logout (String accessToken, String refreshTokenString){
        Jwt jwt = jwtDecoder.decode(accessToken);
        accessTokenService.revoke(jwt.getId());
        RefreshToken refreshToken = refreshTokenService.validateRefreshToken(refreshTokenString);
        refreshTokenService.revokeToken(refreshToken);
    }

    @Transactional
    public TokenPair refresh(String rawRefreshToken) {

        RefreshToken oldToken =
                refreshTokenService.validateRefreshToken(rawRefreshToken);

        Person person = oldToken.getPerson();

        refreshTokenService.revokeToken(oldToken);

        String newAccessToken =
                jwtService.generateToken(person.getId(), person.getRole());

        String newRefreshToken =
                refreshTokenService.createRefreshToken(person);

        return new TokenPair(newAccessToken, newRefreshToken);
    }

    public AuthResponse getPersonFromUUID(String token){
        UUID uuid = jwtService.extractUserId(token);
        Optional<Person> personOptional = personRepo.getPersonById(uuid);
        if (personOptional.isEmpty()){
            throw new BadRequestException("Deze persoon bestaat niet");
        }
        Person person = personOptional.get();

        return new AuthResponse(
                person.getId(),
                person.getFirstname(),
                person.getLastname(),
                person.getRole()
        );
    }
}
