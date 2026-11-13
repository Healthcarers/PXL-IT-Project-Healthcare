package be.pxl.healthcareapi.dto;

import be.pxl.healthcareapi.domein.enums.Role;

import java.time.LocalDate;
import java.util.UUID;

public record AdminAccountResponse(
        UUID id,
        String firstname,
        String lastname,
        String email,
        Role role,
        LocalDate createdAt
) {
}
