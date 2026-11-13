
package be.pxl.healthcareapi.dto;

import be.pxl.healthcareapi.domein.enums.Role;
import java.util.UUID;

public record AuthResponse(
        UUID id,
        String firstname,
        String lastname,
        Role role
) {
}
