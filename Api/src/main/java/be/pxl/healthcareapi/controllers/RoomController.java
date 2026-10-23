package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.services.RoomService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Room createRoom(@Valid @RequestBody CreateRoomRequest request) {
        return roomService.createRoom(
                request.name(),
                request.description()
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
    public Room getRoomByCode(@PathVariable String code) {
        return roomService.getRoomByCode(code);
    }

    @PatchMapping("/{code}/close")
    public Room closeRoom(@PathVariable String code) {
        return roomService.closeRoom(code);
    }
}
