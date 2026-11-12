package be.pxl.healthcareapi.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record RoomParticipantResponse(
        UUID id,
        UUID userId,
        LocalDateTime joinedAt
) {
}