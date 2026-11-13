
package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.domein.RoomParticipant;
import be.pxl.healthcareapi.dto.RoomParticipantResponse;
import be.pxl.healthcareapi.dto.RoomResponse;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.services.RoomService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    private UUID getUserIdFromJwt(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Ongeldige gebruikers-ID");
        }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Room createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID ownerId = getUserIdFromJwt(jwt);

        return roomService.createRoom(
                request.name(),
                request.description(),
                ownerId
        );
    }

    public record CreateRoomRequest(
            @NotBlank(message = "Naam is verplicht")
            @Size(max = 255, message = "Naam mag maximaal 255 tekens bevatten")
            String name,

            @Size(max = 1000, message = "Beschrijving mag maximaal 1000 tekens bevatten")
            String description
    ) {
    }

    @GetMapping("/{code}")
    public RoomResponse getRoomByCode(@PathVariable String code) {
        return roomService.getRoomDetails(code);
    }

    @PatchMapping("/{code}/close")
    public Room closeRoom(@PathVariable String code) {
        return roomService.closeRoom(code);
    }

    @PostMapping("/{code}/join")
    public RoomParticipant joinRoom(
            @PathVariable String code,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = getUserIdFromJwt(jwt);

        return roomService.joinRoom(code, userId);
    }

    @GetMapping("/{code}/members")
    public List<RoomParticipantResponse> getRoomParticipants(
            @PathVariable String code
    ) {
        return roomService.getRoomParticipants(code);
    }

    @PostMapping("/{code}/start")
    public Room startRoom(
            @PathVariable String code,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = getUserIdFromJwt(jwt);

        return roomService.startRoom(code, userId);
    }
}
