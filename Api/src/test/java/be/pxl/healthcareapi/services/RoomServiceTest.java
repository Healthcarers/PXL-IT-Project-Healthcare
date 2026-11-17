
package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.domein.RoomParticipant;
import be.pxl.healthcareapi.domein.RoomStatus;
import be.pxl.healthcareapi.dto.RoomResponse;
import be.pxl.healthcareapi.exception.NotFoundException;
import be.pxl.healthcareapi.repositories.RoomParticipantRepository;
import be.pxl.healthcareapi.repositories.RoomRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import be.pxl.healthcareapi.repositories.PersonRepository;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    private final UUID ownerId = UUID.randomUUID();

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RoomParticipantRepository roomParticipantRepository;

    @Mock
    private PersonRepository personRepository;

    @InjectMocks
    private RoomService roomService;

    @Test
    void createRoomSavesRoomWithCorrectDetails() {
        when(roomRepository.existsByCode(any(String.class)))
                .thenReturn(false);

        when(roomRepository.save(any(Room.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Room result = roomService.createRoom(
                "Test room",
                "Test description",
                ownerId
        );

        assertNotNull(result);
        assertEquals("Test room", result.getName());
        assertEquals("Test description", result.getDescription());
        assertEquals(ownerId, result.getOwnerId());
        assertNotNull(result.getCode());
        assertEquals(6, result.getCode().length());

        verify(roomRepository).save(any(Room.class));
    }

    @Test
    void createRoomGeneratesAnotherCodeWhenCodeAlreadyExists() {
        when(roomRepository.existsByCode(any(String.class)))
                .thenReturn(true, false);

        when(roomRepository.save(any(Room.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Room result = roomService.createRoom(
                "Test room",
                "Test description",
                ownerId
        );

        assertNotNull(result);
        assertEquals(6, result.getCode().length());
        assertEquals(ownerId, result.getOwnerId());

        verify(roomRepository, times(2)).existsByCode(any(String.class));
        verify(roomRepository).save(any(Room.class));
    }

    @Test
    void getRoomByCodeReturnsRoom() {
        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description",
                ownerId
        );

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        Room result = roomService.getRoomByCode("ABC123");

        assertNotNull(result);
        assertEquals("ABC123", result.getCode());
        assertEquals("Test room", result.getName());
        assertEquals("Test description", result.getDescription());
        assertEquals(ownerId, result.getOwnerId());

        verify(roomRepository).findByCode("ABC123");
    }

    @Test
    void getRoomByCodeConvertsCodeToUppercase() {
        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description",
                ownerId
        );

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        Room result = roomService.getRoomByCode("abc123");

        assertEquals("ABC123", result.getCode());
        verify(roomRepository).findByCode("ABC123");
    }

    @Test
    void getRoomByCodeThrowsNotFoundExceptionWhenRoomDoesNotExist() {
        when(roomRepository.findByCode("NOT123"))
                .thenReturn(Optional.empty());

        NotFoundException exception = assertThrows(
                NotFoundException.class,
                () -> roomService.getRoomByCode("NOT123")
        );

        assertEquals(
                "Room niet gevonden: NOT123",
                exception.getMessage()
        );
    }

    @Test
    void startRoomStartsRoomWhenUserIsOwner() {
        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description",
                ownerId
        );

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        when(roomRepository.save(any(Room.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Room result = roomService.startRoom("ABC123", ownerId);

        assertEquals(RoomStatus.STARTED, result.getStatus());
        verify(roomRepository).save(room);
    }

    @Test
    void startRoomThrowsExceptionWhenUserIsNotOwner() {
        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description",
                ownerId
        );

        UUID otherUserId = UUID.randomUUID();

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> roomService.startRoom("ABC123", otherUserId)
        );

        assertEquals(
                "Alleen de host kan deze room starten.",
                exception.getMessage()
        );

        verify(roomRepository, never()).save(any(Room.class));
    }

    @Test
    void startRoomThrowsExceptionWhenRoomIsAlreadyStarted() {
        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description",
                ownerId
        );

        room.start();

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        assertThrows(
                IllegalStateException.class,
                () -> roomService.startRoom("ABC123", ownerId)
        );

        verify(roomRepository, never()).save(any(Room.class));
    }

    @Test
    void getRoomDetailsReturnsRoomWithParticipantCount() {
        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description",
                ownerId
        );

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        when(roomParticipantRepository.countByRoomId(room.getId()))
                .thenReturn(3L);

        RoomResponse result = roomService.getRoomDetails("ABC123");

        assertNotNull(result);
        assertEquals("ABC123", result.code());
        assertEquals("Test room", result.name());
        assertEquals("Test description", result.description());
        assertEquals(ownerId, result.ownerId());
        assertEquals(RoomStatus.OPEN, result.status());
        assertEquals(3, result.participantCount());

        verify(roomParticipantRepository).countByRoomId(room.getId());
    }

    @Test
    void createRoom_addsOwnerAsParticipant() {
        when(roomRepository.existsByCode(anyString())).thenReturn(false);
        when(roomRepository.save(any(Room.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        roomService.createRoom("Test room", "Beschrijving", ownerId);

        ArgumentCaptor<RoomParticipant> captor =
                ArgumentCaptor.forClass(RoomParticipant.class);

        verify(roomParticipantRepository).save(captor.capture());

        RoomParticipant participant = captor.getValue();

        assertEquals(ownerId, participant.getUserId());
        assertEquals(ownerId, participant.getRoom().getOwnerId());
    }

    @Test
    void joinRoom_userAlreadyJoined_throwsException() {
        UUID roomId = UUID.randomUUID();

        Room room = new Room("ABC123", "Test room", ownerId);

        ReflectionTestUtils.setField(room, "id", roomId);

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        when(roomParticipantRepository.existsByRoomIdAndUserId(roomId, ownerId))
                .thenReturn(true);

        assertThrows(
                IllegalStateException.class,
                () -> roomService.joinRoom("ABC123", ownerId)
        );

        verify(roomParticipantRepository, never())
                .save(any(RoomParticipant.class));
    }

    @Test
    void joinRoom_roomAlreadyStarted_throwsException() {
        UUID roomId = UUID.randomUUID();

        Room room = new Room("ABC123", "Test room", ownerId);
        ReflectionTestUtils.setField(room, "id", roomId);
        room.start();

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        assertThrows(
                IllegalStateException.class,
                () -> roomService.joinRoom("ABC123", UUID.randomUUID())
        );

        verify(roomParticipantRepository, never())
                .save(any(RoomParticipant.class));
    }

    @Test
    void startRoom_closedRoom_throwsException() {
        UUID roomId = UUID.randomUUID();

        Room room = new Room("ABC123", "Test room", ownerId);
        ReflectionTestUtils.setField(room, "id", roomId);
        room.close();

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        assertThrows(
                IllegalStateException.class,
                () -> roomService.startRoom("ABC123", ownerId)
        );

        verify(roomRepository, never()).save(any(Room.class));
    }

    @Test
    void startRoom_userIsNotOwner_throwsException() {
        UUID roomId = UUID.randomUUID();
        UUID anotherUserId = UUID.randomUUID();

        Room room = new Room("ABC123", "Test room", ownerId);
        ReflectionTestUtils.setField(room, "id", roomId);

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        assertThrows(
                IllegalStateException.class,
                () -> roomService.startRoom("ABC123", anotherUserId)
        );

        verify(roomRepository, never()).save(any(Room.class));
    }

    @Test
    void joinRoom_closedRoom_throwsException() {
        UUID roomId = UUID.randomUUID();

        Room room = new Room("ABC123", "Test room", ownerId);
        ReflectionTestUtils.setField(room, "id", roomId);
        room.close();

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        assertThrows(
                IllegalStateException.class,
                () -> roomService.joinRoom("ABC123", UUID.randomUUID())
        );

        verify(roomParticipantRepository, never())
                .save(any(RoomParticipant.class));
    }

    @Test
    void closeRoom_openRoom_setsStatusToClosed() {
        Room room = new Room("ABC123", "Test room", ownerId);

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        roomService.closeRoom("ABC123");

        assertEquals(RoomStatus.CLOSED, room.getStatus());

        verify(roomRepository).save(room);
    }

    @Test
    void joinRoom_userNotYetJoined_savesParticipant() {
        UUID roomId = UUID.randomUUID();
        UUID participantUserId = UUID.randomUUID();

        Room room = new Room("ABC123", "Test room", ownerId);
        ReflectionTestUtils.setField(room, "id", roomId);

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        when(roomParticipantRepository.existsByRoomIdAndUserId(
                roomId, participantUserId))
                .thenReturn(false);

        when(roomParticipantRepository.save(any(RoomParticipant.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        RoomParticipant result =
                roomService.joinRoom("ABC123", participantUserId);

        assertNotNull(result);
        assertEquals(roomId, result.getRoom().getId());
        assertEquals(participantUserId, result.getUserId());
        assertNotNull(result.getJoinedAt());

        verify(roomParticipantRepository).save(any(RoomParticipant.class));
    }
}
