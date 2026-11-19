
package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.config.WebSocketConfig;
import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.domein.RoomParticipant;
import be.pxl.healthcareapi.dto.RoomParticipantResponse;
import be.pxl.healthcareapi.dto.RoomResponse;
import be.pxl.healthcareapi.dto.RoomScenarioResponse;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.services.RoomService;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {
    private static final Logger log = LoggerFactory.getLogger(RoomController.class);

    private final RoomService roomService;
    private final SimpMessagingTemplate messaging;

    public RoomController(RoomService roomService, SimpMessagingTemplate messaging) {
        this.roomService = roomService;
        this.messaging = messaging;
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

    @GetMapping("/mine/active")
    public ResponseEntity<ActiveRoomResponse> getActiveRoom(@AuthenticationPrincipal Jwt jwt) {
        return roomService.findActiveRoomCode(getUserIdFromJwt(jwt))
                .map(code -> ResponseEntity.ok(new ActiveRoomResponse(code)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    public record ActiveRoomResponse(String code) {
    }

    @GetMapping("/{code}")
    public RoomResponse getRoomByCode(@PathVariable String code) {
        return roomService.getRoomDetails(code);
    }

    @GetMapping("/{code}/scenario")
    public ResponseEntity<RoomScenarioResponse> getScenario(@PathVariable String code,
                                                            @AuthenticationPrincipal Jwt jwt) {
        return roomService.getScenario(code, getUserIdFromJwt(jwt))
                .map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/{code}/scenario")
    public ResponseEntity<RoomScenarioResponse> assignScenario(@PathVariable String code,
                                                               @AuthenticationPrincipal Jwt jwt,
                                                               @RequestBody AssignScenarioRequest request) {
        return roomService.assignScenario(code, getUserIdFromJwt(jwt), request.scenarioId())
                .map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    public record AssignScenarioRequest(
            @JsonProperty(required = true) UUID scenarioId
    ) {
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

        RoomParticipant participant = roomService.joinRoom(code, userId);
        try {
            messaging.convertAndSend(WebSocketConfig.ROOM_EVENTS_PREFIX + participant.getRoom().getId() + "/members-changed",
                    Boolean.TRUE);
        } catch (MessagingException e) {
            log.warn("Kon de deelnemersupdate voor room {} niet versturen.", code, e);
        }
        return participant;
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
