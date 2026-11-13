package be.pxl.healthcareapi.config;

import jakarta.servlet.http.Cookie;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, BearerTokenResolver cookieBearerTokenResolver) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/ws", "/ws/**").permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/refresh"
                        ).permitAll()

                        // Alleen lectoren mogen rooms aanmaken en starten
                        .requestMatchers(HttpMethod.POST, "/api/rooms")
                        .hasRole("LECTOR")

                        .requestMatchers(HttpMethod.POST, "/api/rooms/*/start")
                        .hasRole("LECTOR")

                        // Alleen cursisten mogen deelnemen
                        .requestMatchers(HttpMethod.POST, "/api/rooms/*/join")
                        .hasRole("CURSIST")

                        // Alleen lectoren mogen rooms sluiten
                        .requestMatchers(HttpMethod.PATCH, "/api/rooms/*/close")
                        .hasRole("LECTOR")

                        // Roomgegevens bekijken
                        .requestMatchers(HttpMethod.GET, "/api/rooms/**")
                        .permitAll()

                        //TODO: replace permitAll() with the commented methods. Kept like this so bruno/postman still works
                        .requestMatchers(HttpMethod.GET, "/api/vitals", "/api/channels").permitAll()//.hasAnyRole("CURSIST", "LECTOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/vitals").permitAll()//.hasRole("LECTOR")
                        .anyRequest().authenticated()
                )

                .oauth2ResourceServer(oauth2 -> oauth2
                        .bearerTokenResolver(cookieBearerTokenResolver)
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                );

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
        authoritiesConverter.setAuthoritiesClaimName("role");
        authoritiesConverter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter authenticationConverter = new JwtAuthenticationConverter();
        authenticationConverter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
        return authenticationConverter;
    }

    @Bean
    public BearerTokenResolver cookieBearerTokenResolver() {
        return request -> {
            if (request.getCookies() == null) {
                return null;
            }

            String path = request.getRequestURI();
            if (path.equals("/api/auth/login") || path.equals("/api/auth/register") || path.equals("/api/auth/refresh")) {
                return null;
            }

            return Arrays.stream(request.getCookies())
                    .filter(cookie ->
                            "access_token".equals(cookie.getName())
                    )
                    .map(Cookie::getValue)
                    .findFirst()
                    .orElse(null);
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}