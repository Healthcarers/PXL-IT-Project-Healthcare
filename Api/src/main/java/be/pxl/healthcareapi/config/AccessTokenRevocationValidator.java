package be.pxl.healthcareapi.config;

import be.pxl.healthcareapi.repositories.AccessTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
@Component
public class AccessTokenRevocationValidator implements OAuth2TokenValidator<Jwt> {
    private final AccessTokenRepository accessTokenRepository;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        var accessToken = accessTokenRepository.findByJwtId(token.getId());

        if (accessToken.isEmpty()
                || accessToken.get().getRevokedAt() != null) {
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error(
                            "invalid_token",
                            "Access token is revoked or unknown",
                            null
                    )
            );
        }
        return OAuth2TokenValidatorResult.success();
    }
}
