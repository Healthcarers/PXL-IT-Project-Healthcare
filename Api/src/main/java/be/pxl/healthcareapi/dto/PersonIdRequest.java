package be.pxl.healthcareapi.dto;

import jakarta.validation.constraints.NotBlank;

public record PersonIdRequest(@NotBlank String uuid) {
}
