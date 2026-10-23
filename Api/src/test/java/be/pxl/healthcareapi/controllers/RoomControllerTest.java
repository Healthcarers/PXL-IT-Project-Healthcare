package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.services.RoomService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RoomController.class)
class RoomControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomService roomService;

    @Test
    void createRoomReturnsCreatedRoom() throws Exception {
        // Arrange
        Room room = new Room("ABC123", "Test room", "Test description");

        when(roomService.createRoom(
                "Test room",
                "Test description"
        )).thenReturn(room);

        // Act & Assert
        mockMvc.perform(post("/api/rooms")
                        .with(user("testuser"))
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
        // Arrange
        Room room = new Room("ABC123", "Test room", "Test description");

        when(roomService.getRoomByCode("ABC123"))
                .thenReturn(room);

        // Act & Assert
        mockMvc.perform(get("/api/rooms/ABC123")
                        .with(user("testuser")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("ABC123"))
                .andExpect(jsonPath("$.name").value("Test room"))
                .andExpect(jsonPath("$.description").value("Test description"))
                .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test
    void createRoomWithoutNameReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .with(user("testuser"))
                        .with(csrf())
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
        when(roomService.getRoomByCode("UNKNOWN"))
                .thenThrow(new IllegalArgumentException("Room niet gevonden: UNKNOWN"));

        mockMvc.perform(get("/api/rooms/UNKNOWN")
                        .with(user("testuser")))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Room niet gevonden: UNKNOWN"));
    }
}