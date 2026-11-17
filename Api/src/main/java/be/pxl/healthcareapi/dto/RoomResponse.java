package be.pxl.healthcareapi.dto;

import be.pxl.healthcareapi.domein.RoomStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record RoomResponse(
        UUID id,
        String code,
        String name,
        String description,
        LocalDateTime createdAt,
        RoomStatus status,
        UUID ownerId,
        long participantCount
) {
}
