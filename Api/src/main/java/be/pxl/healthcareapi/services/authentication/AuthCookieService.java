package be.pxl.healthcareapi.services.authentication;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
//TODO secure op true zetten voor prod.
public class AuthCookieService {
    public ResponseCookie createAccessCookie(String accesToken) {
        return ResponseCookie.from("access_token", accesToken)
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofMinutes(15))
                .build();
    }

    public ResponseCookie createRefreshCookie(String refreshToken) {
        return ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(Duration.ofDays(30))
                .build();
    }
    public ResponseCookie createEmptyAccesCookie(){
        return ResponseCookie.from("access_token", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
    }

    public ResponseCookie createEmptyRefreshCookie(){
        return ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
    }
}
