package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.DTO.LoginRequest;
import be.pxl.healthcareapi.DTO.LoginResponse;
import be.pxl.healthcareapi.DTO.RegisterRequest;
import be.pxl.healthcareapi.DTO.RegisterResponse;
import be.pxl.healthcareapi.domein.TokenPair;
import be.pxl.healthcareapi.services.Authentication.AuthCookieService;
import be.pxl.healthcareapi.services.Authentication.AuthService;
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

    public AuthController(AuthService authService, AuthCookieService authCookieService){
        this.authService = authService;
        this.authCookieService = authCookieService;
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

