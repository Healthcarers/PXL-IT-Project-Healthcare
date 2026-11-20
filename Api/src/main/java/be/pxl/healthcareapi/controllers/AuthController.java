package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.dto.*;
import be.pxl.healthcareapi.domein.TokenPair;
import be.pxl.healthcareapi.services.authentication.AuthCookieService;
import be.pxl.healthcareapi.services.authentication.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookieService authCookieService;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> registerUser(@Valid @RequestBody RegisterRequest request){
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerUser(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> AuthenticateUser(@Valid @RequestBody LoginRequest loginRequest){
        TokenPair tokenPair = authService.login(loginRequest);
        AuthResponse authResponse = authService.getPersonFromUUID(tokenPair.accessToken());
        return ResponseEntity.ok().headers(createHeader(tokenPair)).body(authResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> LogoutUser (@CookieValue (name = "access_token") String accesToken, @CookieValue (name = "refresh_token") String refreshToken){
        authService.logout(accesToken, refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, authCookieService.createEmptyAccesCookie().toString())
                .header(HttpHeaders.SET_COOKIE, authCookieService.createEmptyRefreshCookie().toString())
                .build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(
            @CookieValue(
                    name = "refresh_token"
            ) String refreshToken
    ) {
        TokenPair tokens = authService.refresh(refreshToken);

        return ResponseEntity.ok().headers(createHeader(tokens)).build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> authorize(@CookieValue(name = "access_token") String accesToken){
        return ResponseEntity.status(HttpStatus.OK).body(authService.getPersonFromUUID(accesToken));
    }

    private HttpHeaders createHeader(TokenPair tokens) {
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
        return headers;
    }
}
