package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.repositories.RoomRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock
    private RoomRepository roomRepository;

    @InjectMocks
    private RoomService roomService;

    @Test
    void createRoomSavesRoomWithCorrectDetails() {
        // Arrange
        when(roomRepository.existsByCode(any(String.class)))
                .thenReturn(false);

        when(roomRepository.save(any(Room.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Room result = roomService.createRoom(
                "Test room",
                "Test description"
        );

        // Assert
        assertNotNull(result);
        assertEquals("Test room", result.getName());
        assertEquals("Test description", result.getDescription());
        assertNotNull(result.getCode());
        assertEquals(6, result.getCode().length());

        verify(roomRepository).save(any(Room.class));
    }

    @Test
    void createRoomGeneratesAnotherCodeWhenCodeAlreadyExists() {
        // Arrange
        when(roomRepository.existsByCode(any(String.class)))
                .thenReturn(true, false);

        when(roomRepository.save(any(Room.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Room result = roomService.createRoom(
                "Test room",
                "Test description"
        );

        // Assert
        assertNotNull(result);
        assertEquals(6, result.getCode().length());
        verify(roomRepository, times(2)).existsByCode(any(String.class));
        verify(roomRepository).save(any(Room.class));
    }

    @Test
    void getRoomByCodeReturnsRoom() {
        // Arrange
        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description"
        );

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        // Act
        Room result = roomService.getRoomByCode("ABC123");

        // Assert
        assertNotNull(result);
        assertEquals("ABC123", result.getCode());
        assertEquals("Test room", result.getName());
        assertEquals("Test description", result.getDescription());

        verify(roomRepository).findByCode("ABC123");
    }

    @Test
    void getRoomByCodeConvertsCodeToUppercase() {
        // Arrange
        Room room = new Room(
                "ABC123",
                "Test room",
                "Test description"
        );

        when(roomRepository.findByCode("ABC123"))
                .thenReturn(Optional.of(room));

        // Act
        Room result = roomService.getRoomByCode("abc123");

        // Assert
        assertEquals("ABC123", result.getCode());
        verify(roomRepository).findByCode("ABC123");
    }

    @Test
    void getRoomByCodeThrowsExceptionWhenRoomDoesNotExist() {
        // Arrange
        when(roomRepository.findByCode("NOT123"))
                .thenReturn(Optional.empty());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> roomService.getRoomByCode("NOT123")
        );

        assertEquals(
                "Room niet gevonden: NOT123",
                exception.getMessage()
        );
    }
}