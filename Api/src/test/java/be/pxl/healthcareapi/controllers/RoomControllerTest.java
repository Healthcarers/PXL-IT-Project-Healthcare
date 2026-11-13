
package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.domein.RoomParticipant;
import be.pxl.healthcareapi.domein.RoomStatus;
import be.pxl.healthcareapi.dto.RoomParticipantResponse;
import be.pxl.healthcareapi.dto.RoomResponse;
import be.pxl.healthcareapi.exception.NotFoundException;
import be.pxl.healthcareapi.services.RoomService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RoomController.class)
class RoomControllerTest {

    private final UUID ownerId = UUID.randomUUID();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomService roomService;

    @Test
    void createRoomReturnsCreatedRoom() throws Exception {
        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description",
                ownerId
        );

        when(roomService.createRoom(
                "Test room",
                "Test description",
                ownerId
        )).thenReturn(room);

        mockMvc.perform(post("/api/rooms")
                        .with(jwt().jwt(jwt -> jwt.subject(ownerId.toString())))
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                        {
                            "name": "Test room",
                            "description": "Test description"
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("ABC123"))
                .andExpect(jsonPath("$.name").value("Test room"))
                .andExpect(jsonPath("$.description").value("Test description"))
                .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test
    void getRoomByCodeReturnsRoom() throws Exception {
        RoomResponse response = new RoomResponse(
                UUID.randomUUID(),
                "ABC123",
                "Test room",
                "Test description",
                LocalDateTime.now(),
                RoomStatus.OPEN,
                ownerId,
                3
        );

        when(roomService.getRoomDetails("ABC123"))
                .thenReturn(response);

        mockMvc.perform(get("/api/rooms/ABC123")
                        .with(user("testuser")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("ABC123"))
                .andExpect(jsonPath("$.name").value("Test room"))
                .andExpect(jsonPath("$.description").value("Test description"))
                .andExpect(jsonPath("$.ownerId").value(ownerId.toString()))
                .andExpect(jsonPath("$.participantCount").value(3))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    void createRoomWithoutNameReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .with(user("testuser"))
                        .with(csrf())
                        .header("X-User-Id", ownerId.toString())
                        .contentType("application/json")
                        .content("""
                            {
                                "description": "Test description"
                            }
                            """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createRoomWithBlankNameReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .with(user("testuser"))
                        .with(csrf())
                        .header("X-User-Id", ownerId.toString())
                        .contentType("application/json")
                        .content("""
                            {
                                "name": "   ",
                                "description": "Test description"
                            }
                            """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getRoomByCodeReturnsNotFoundWhenRoomDoesNotExist() throws Exception {
        when(roomService.getRoomDetails("UNKNOWN"))
                .thenThrow(new NotFoundException("Room niet gevonden: UNKNOWN"));

        mockMvc.perform(get("/api/rooms/UNKNOWN")
                        .with(user("testuser")))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Room niet gevonden: UNKNOWN"));
    }

    @Test
    void joinRoomReturnsCreatedParticipant() throws Exception {
        UUID userId = UUID.randomUUID();

        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description",
                UUID.randomUUID()
        );

        RoomParticipant participant = new RoomParticipant(room, userId);

        when(roomService.joinRoom("ABC123", userId))
                .thenReturn(participant);

        mockMvc.perform(post("/api/rooms/ABC123/join")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.joinedAt").exists());

        verify(roomService).joinRoom("ABC123", userId);
    }

    @Test
    void getRoomParticipants_returnsParticipants() throws Exception {
        UUID participantId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        RoomParticipantResponse participant = new RoomParticipantResponse(
                participantId,
                userId,
                "test",
                "user",
                LocalDateTime.now()
        );

        when(roomService.getRoomParticipants("ABC123"))
                .thenReturn(List.of(participant));

        mockMvc.perform(get("/api/rooms/ABC123/members")
                        .with(user("testuser"))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(participantId.toString()))
                .andExpect(jsonPath("$[0].userId").value(userId.toString()))
                .andExpect(jsonPath("$[0].firstname").value("test"))
                .andExpect(jsonPath("$[0].lastname").value("user"))
                .andExpect(jsonPath("$[0].joinedAt").exists());
    }

    @Test
    void getRoomParticipantsReturnsEmptyList() throws Exception {
        when(roomService.getRoomParticipants("ABC123"))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/rooms/ABC123/members")
                        .with(user("testuser")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void startRoomReturnsStartedRoom() throws Exception {
        UUID userId = UUID.randomUUID();

        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description",
                userId
        );

        room.start();

        when(roomService.startRoom("ABC123", userId))
                .thenReturn(room);

        mockMvc.perform(post("/api/rooms/ABC123/start")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("ABC123"))
                .andExpect(jsonPath("$.status").value("STARTED"));
    }

    @Test
    void joinRoomWhenRoomIsUnavailableReturnsConflict() throws Exception {
        UUID userId = UUID.randomUUID();

        when(roomService.joinRoom("ABC123", userId))
                .thenThrow(new IllegalStateException(
                        "Deze room is niet meer beschikbaar."
                ));

        mockMvc.perform(post("/api/rooms/ABC123/join")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                        .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(content().string(
                        "Deze room is niet meer beschikbaar."
                ));
    }

    @Test
    void startRoomWhenUserIsNotOwnerReturnsConflict() throws Exception {
        UUID userId = UUID.randomUUID();

        when(roomService.startRoom("ABC123", userId))
                .thenThrow(new IllegalStateException(
                        "Alleen de host kan deze room starten."
                ));

        mockMvc.perform(post("/api/rooms/ABC123/start")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                        .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(content().string(
                        "Alleen de host kan deze room starten."
                ));
    }

    @Test
    void closeRoomReturnsClosedRoom() throws Exception {
        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description",
                ownerId
        );

        room.close();

        when(roomService.closeRoom("ABC123"))
                .thenReturn(room);

        mockMvc.perform(patch("/api/rooms/ABC123/close")
                        .with(user("testuser"))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("ABC123"))
                .andExpect(jsonPath("$.status").value("CLOSED"));

        verify(roomService).closeRoom("ABC123");
    }

    @Test
    void closeRoomWhenRoomDoesNotExistReturnsNotFound() throws Exception {
        when(roomService.closeRoom("UNKNOWN"))
                .thenThrow(new NotFoundException(
                        "Room niet gevonden: UNKNOWN"
                ));

        mockMvc.perform(patch("/api/rooms/UNKNOWN/close")
                        .with(user("testuser"))
                        .with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Room niet gevonden: UNKNOWN"));

        verify(roomService).closeRoom("UNKNOWN");
    }

    @Test
    void closeRoomWhenRoomIsStartedReturnsClosedRoom() throws Exception {
        Room room = new Room("ABC123", "Test room", ownerId);
        room.start();

        when(roomService.closeRoom("ABC123")).thenReturn(room);

        mockMvc.perform(patch("/api/rooms/ABC123/close")
                        .with(user("testuser"))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("STARTED"));
    }

    @Test
    void getStartedRoomReturnsStartedStatus() throws Exception {
        RoomResponse response = new RoomResponse(
                UUID.randomUUID(),
                "ABC123",
                "Test room",
                "Test description",
                LocalDateTime.now(),
                RoomStatus.STARTED,
                ownerId,
                3
        );

        when(roomService.getRoomDetails("ABC123")).thenReturn(response);

        mockMvc.perform(get("/api/rooms/ABC123")
                        .with(user("testuser")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("STARTED"))
                .andExpect(jsonPath("$.participantCount").value(3));
    }

    @Test
    void getClosedRoomReturnsClosedStatus() throws Exception {
        RoomResponse response = new RoomResponse(
                UUID.randomUUID(),
                "ABC123",
                "Test room",
                "Test description",
                LocalDateTime.now(),
                RoomStatus.CLOSED,
                ownerId,
                2
        );

        when(roomService.getRoomDetails("ABC123")).thenReturn(response);

        mockMvc.perform(get("/api/rooms/ABC123")
                        .with(user("testuser")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.participantCount").value(2));
    }

    @Test
    void createRoomWithNameTooLongReturnsBadRequest() throws Exception {
        String longName = "a".repeat(256);

        mockMvc.perform(post("/api/rooms")
                        .with(user("testuser"))
                        .with(csrf())
                        .header("X-User-Id", ownerId.toString())
                        .contentType("application/json")
                        .content("{\"name\":\"" + longName + "\"}"))
                .andExpect(status().isBadRequest());

        verify(roomService, never())
                .createRoom(anyString(), any(), any(UUID.class));
    }

    @Test
    void createRoomWithDescriptionTooLongReturnsBadRequest() throws Exception {
        String longDescription = "a".repeat(1001);

        mockMvc.perform(post("/api/rooms")
                        .with(user("testuser"))
                        .with(csrf())
                        .header("X-User-Id", ownerId.toString())
                        .contentType("application/json")
                        .content("{\"name\":\"Test room\",\"description\":\""
                                + longDescription + "\"}"))
                .andExpect(status().isBadRequest());

        verify(roomService, never())
                .createRoom(anyString(), any(), any(UUID.class));
    }

    @Test
    void createRoomWithInvalidUserIdReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .with(jwt().jwt(jwt -> jwt.subject("invalid-uuid")))
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                            {
                                "name": "Test room",
                                "description": "Test description"
                            }
                            """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(roomService);
    }

    @Test
    void joinRoomWithInvalidUserIdReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/rooms/ABC123/join")
                        .with(jwt().jwt(jwt -> jwt.subject("invalid-uuid")))
                        .with(csrf()))
                .andExpect(status().isBadRequest());

        verify(roomService, never())
                .joinRoom(anyString(), any(UUID.class));
    }

    @Test
    void joinRoomWhenRoomDoesNotExistReturnsNotFound() throws Exception {
        UUID userId = UUID.randomUUID();

        when(roomService.joinRoom("UNKNOWN", userId))
                .thenThrow(new NotFoundException(
                        "Room niet gevonden: UNKNOWN"
                ));

        mockMvc.perform(post("/api/rooms/UNKNOWN/join")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                        .with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Room niet gevonden: UNKNOWN"));
    }

    @Test
    void getRoomParticipantsWhenRoomDoesNotExistReturnsNotFound() throws Exception {
        when(roomService.getRoomParticipants("UNKNOWN"))
                .thenThrow(new NotFoundException(
                        "Room niet gevonden: UNKNOWN"
                ));

        mockMvc.perform(get("/api/rooms/UNKNOWN/members")
                        .with(user("testuser")))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Room niet gevonden: UNKNOWN"));
    }
}
