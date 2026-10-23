package be.pxl.healthcareapi.DTO;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(@NotBlank String firstname,
                              @NotBlank String lastname,
                              @NotBlank String email,
                              @NotBlank String password,
                              @NotBlank String passwordRepeated) {}
