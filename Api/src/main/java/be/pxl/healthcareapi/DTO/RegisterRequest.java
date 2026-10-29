package be.pxl.healthcareapi.DTO;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.Length;

public record RegisterRequest(
        @NotBlank(message = "Voornaam is verplicht")
        @Size(min = 2, message = "Voornaam moet minstens 2 tekens lang zijn")
        @Size(max = 50, message = "Voornaam mag maximaal 50 tekens lang zijn")
        String firstname,

        @NotBlank(message = "Achternaam is verplicht")
        @Size(min = 2, message = "Achternaam moet minstens 2 tekens lang zijn")
        @Size(max = 50, message = "Achternaam mag maximaal 50 tekens lang zijn")
        String lastname,

        @NotBlank(message = "E-mailadres is verplicht")
        @Email(message = "Voer een geldig e-mailadres in")
        String email,

        @NotBlank(message = "Wachtwoord is verplicht")
        @Size(min = 8, message = "Wachtwoord moet minimaal 8 tekens lang zijn")
        String password,

        @NotBlank(message = "Herhaal wachtwoord is verplicht")
        String passwordRepeated
) {
    public RegisterRequest {
        if (password != null && !password.equals(passwordRepeated)) {
            throw new IllegalArgumentException("De ingevoerde wachtwoorden komen niet overeen");
        }
    }
}
