package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.DTO.*;
import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.TokenPair;
import be.pxl.healthcareapi.services.Authentication.AuthCookieService;
import be.pxl.healthcareapi.services.Authentication.AuthService;
import be.pxl.healthcareapi.services.PersonService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthCookieService authCookieService;
    private final PersonService personService;

    public AuthController(AuthService authService, AuthCookieService authCookieService, PersonService personService){
        this.authService = authService;
        this.authCookieService = authCookieService;
        this.personService = personService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> registerUser(@Valid @RequestBody RegisterRequest request){
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerUser(request));
    }

    @PostMapping("/login")
    public ResponseEntity<Void> AuthenticateUser(@Valid @RequestBody LoginRequest loginRequest){
        TokenPair tokenPair = authService.login(loginRequest);
        return createTokenResponse(tokenPair);
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(
            @CookieValue(
                    name = "refresh_token",
                    required = false
            ) String refreshToken
    ) {
        TokenPair tokens = authService.refresh(refreshToken);

        return createTokenResponse(tokens);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> authorize(@CookieValue(name = "access_token") String accesToken){
        return ResponseEntity.status(HttpStatus.OK).body(personService.getPersonFromUUID(accesToken));
    }

    private ResponseEntity<Void> createTokenResponse(TokenPair tokens) {
        HttpHeaders headers = new HttpHeaders();

        headers.add(
                HttpHeaders.SET_COOKIE,
                authCookieService.createAccessCookie(
                        tokens.accessToken()
                ).toString()
        );

        headers.add(
                HttpHeaders.SET_COOKIE,
                authCookieService.createRefreshCookie(
                        tokens.refreshToken()
                ).toString()
        );

        return ResponseEntity.ok()
                .headers(headers)
                .build();
    }
}

