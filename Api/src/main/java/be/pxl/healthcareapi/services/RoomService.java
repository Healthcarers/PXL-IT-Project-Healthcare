package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.repositories.RoomRepository;
import org.springframework.stereotype.Service;

@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public Room createRoom(String name) {
        String code = generateUniqueCode();

        Room room = new Room(code, name);

        return roomRepository.save(room);
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
                        new IllegalArgumentException("Room niet gevonden: " + code));
    }
}
