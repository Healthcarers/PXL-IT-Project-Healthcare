package be.pxl.healthcareapi.services.authentication;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.domein.tokens.AccessToken;
import be.pxl.healthcareapi.repositories.AccessTokenRepository;
import be.pxl.healthcareapi.services.person.PersonService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JwtService {
    private final JwtEncoder jwtEncoder;
    private final JwtDecoder jwtDecoder;
    private final AccessTokenRepository accessTokenRepository;
    private final PersonService personService;

    public String generateToken(UUID userId, Role role) {

        Instant now = Instant.now();
        Instant expiration = now.plusSeconds(900);

        String jwtId = UUID.randomUUID().toString();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("healthcare-api")
                .issuedAt(now)
                .expiresAt(expiration)
                .subject(userId.toString())
                .claim("role", role.name())
                .id(jwtId)
                .build();

        JwsHeader header = JwsHeader
                .with(MacAlgorithm.HS256)
                .build();

        String token = jwtEncoder.encode(
                JwtEncoderParameters.from(header, claims)
        ).getTokenValue();

        Person person = personService.getPersonByUUID(userId);

        AccessToken accessToken = new AccessToken(
                jwtId,
                person,
                expiration,
                now
        );

        accessTokenRepository.save(accessToken);

        return token;
    }

    public UUID extractUserId(String token) {
        Jwt jwt = jwtDecoder.decode(token);
        return UUID.fromString(jwt.getSubject());
    }
}
