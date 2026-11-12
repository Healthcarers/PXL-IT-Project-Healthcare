package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.domein.RoomStatus;
import be.pxl.healthcareapi.dto.RoomParticipantResponse;
import be.pxl.healthcareapi.dto.RoomResponse;
import be.pxl.healthcareapi.repositories.RoomRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import be.pxl.healthcareapi.domein.RoomParticipant;
import be.pxl.healthcareapi.repositories.RoomParticipantRepository;
import java.util.UUID;
import java.util.List;

@Service
public class RoomService {

    private final RoomRepository roomRepository;

    private final RoomParticipantRepository roomParticipantRepository;

    public RoomService(RoomRepository roomRepository, RoomParticipantRepository roomParticipantRepository) {
        this.roomRepository = roomRepository;
        this.roomParticipantRepository = roomParticipantRepository;
    }

    @Transactional
    public Room createRoom(String name, String description, UUID ownerId) {
        String code = generateUniqueCode();

        Room room = new Room(code, name, description, ownerId);
        Room savedRoom = roomRepository.save(room);

        RoomParticipant host = new RoomParticipant(savedRoom, ownerId);
        roomParticipantRepository.save(host);

        return savedRoom;
    }

    private String generateUniqueCode() {
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        String code;

        do {
            StringBuilder builder = new StringBuilder();

            for (int i = 0; i < 6; i++) {
                int index = (int) (Math.random() * characters.length());
                builder.append(characters.charAt(index));
            }

            code = builder.toString();

        } while (roomRepository.existsByCode(code));

        return code;
    }

    public Room getRoomByCode(String code) {
        return roomRepository.findByCode(code.toUpperCase())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Room niet gevonden: " + code
                        ));
    }

    public Room closeRoom(String code) {
        Room room = getRoomByCode(code);

        if (room.getStatus() == RoomStatus.CLOSED) {
            throw new IllegalStateException("Deze room is al gesloten.");
        }

        room.close();

        return roomRepository.save(room);
    }

    public RoomParticipant joinRoom(String code, UUID userId) {
        Room room = getRoomByCode(code);

        if (room.getStatus() != RoomStatus.OPEN) {
            throw new IllegalStateException("Deze room is niet meer beschikbaar.");
        }

        if (roomParticipantRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
            throw new IllegalStateException("Je neemt al deel aan deze room.");
        }

        RoomParticipant participant = new RoomParticipant(room, userId);

        return roomParticipantRepository.save(participant);
    }

    public List<RoomParticipantResponse> getRoomParticipants(String code) {
        Room room = getRoomByCode(code);

        return roomParticipantRepository.findByRoomId(room.getId())
                .stream()
                .map(participant -> new RoomParticipantResponse(
                        participant.getId(),
                        participant.getUserId(),
                        participant.getJoinedAt()
                ))
                .toList();
    }

    public Room startRoom(String code, UUID userId) {
        Room room = getRoomByCode(code);

        if (!room.getOwnerId().equals(userId)) {
            throw new IllegalStateException(
                    "Alleen de host kan deze room starten."
            );
        }

        if (room.getStatus() != RoomStatus.OPEN) {
            throw new IllegalStateException(
                    "Deze room kan niet meer gestart worden."
            );
        }

        room.start();

        return roomRepository.save(room);
    }

    public RoomResponse getRoomDetails(String code) {
        Room room = getRoomByCode(code);

        long participantCount =
                roomParticipantRepository.countByRoomId(room.getId());

        return new RoomResponse(
                room.getId(),
                room.getCode(),
                room.getName(),
                room.getDescription(),
                room.getCreatedAt(),
                room.getStatus(),
                room.getOwnerId(),
                participantCount
        );
    }
}