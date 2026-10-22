package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.services.RoomService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Room createRoom(@RequestBody CreateRoomRequest request) {
        return roomService.createRoom(request.name());
    }

    @GetMapping("/{code}")
    public Room getRoomByCode(@PathVariable String code) {
        return roomService.getRoomByCode(code);
    }

    public record CreateRoomRequest(String name) {
    }
}
