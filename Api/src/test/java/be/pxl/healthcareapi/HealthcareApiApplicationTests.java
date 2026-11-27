package be.pxl.healthcareapi;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.ScenarioStatus;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.ScenarioDto;
import be.pxl.healthcareapi.dto.VitalsUpdateRequest;
import be.pxl.healthcareapi.dto.VitalsResponse;
import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.services.RoomSimulationService;
import be.pxl.healthcareapi.repositories.PersonRepository;
import be.pxl.healthcareapi.services.RoomService;
import be.pxl.healthcareapi.services.ScenarioService;
import be.pxl.healthcareapi.services.authentication.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.messaging.converter.SimpleMessageConverter;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.broker.SimpleBrokerMessageHandler;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import tools.jackson.databind.ObjectMapper;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthcareApiApplicationTests {

    @Autowired
    private RoomService roomService;

    @Autowired
    private ScenarioService scenarioService;

    @Autowired
    private MockMvc mockMvc;

    @LocalServerPort
    private int port;

    @Autowired
    private SimpleBrokerMessageHandler broker;

    @Autowired
    private JwtService jwtService;
    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoomSimulationService simulations;

    @Test
    void contextLoads() {
    }

    @Test
    void successfulJoinSendsRoomSignalOverWebSocket() throws Exception {
        var room = roomService.createRoom("Realtime room", null, UUID.randomUUID());
        var learner = createPerson(Role.CURSIST);
        var destination = "/topic/rooms/" + room.getId() + "/members-changed";
        var received = new LinkedBlockingQueue<String>();
        var stomp = new WebSocketStompClient(new StandardWebSocketClient());

        stomp.setMessageConverter(new SimpleMessageConverter());
        var join = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/rooms/" + room.getCode() + "/join"))
                .header("Cookie", "access_token=" + jwtService.generateToken(learner, Role.CURSIST))
                .timeout(Duration.ofSeconds(5))
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();

        try (var http = HttpClient.newHttpClient()) {
            var session = stomp.connectAsync("ws://localhost:" + port + "/ws", new StompSessionHandlerAdapter() {})
                    .get(5, TimeUnit.SECONDS);
            try {
                subscribe(session, destination, received);

                assertEquals(200, http.send(join, HttpResponse.BodyHandlers.discarding()).statusCode());
                assertEquals("true", received.poll(5, TimeUnit.SECONDS));
                assertTrue(roomService.getRoomParticipants(room.getCode()).stream().anyMatch(member -> member.userId().equals(learner)));

                assertEquals(409, http.send(join, HttpResponse.BodyHandlers.discarding()).statusCode());
                assertNull(received.poll(250, TimeUnit.MILLISECONDS));
            } finally {
                session.disconnect();
            }
        } finally {
            stomp.stop();
        }
    }

    @Test
    void scenarioPlaybackProvidesLearnerVitalsAndRoomIsolation() throws Exception {
        var owner = createPerson(Role.LECTOR);
        var otherOwner = createPerson(Role.LECTOR);
        var learner = createPerson(Role.CURSIST);
        var initial = new VitalsUpdateRequest(132.0, 89.0, 26.0, 48.0, 1.4, 275.0, 160.0);
        var scenario = scenarioService.create(new ScenarioDto.Create("Live oefening", "Roomisolatie",
                initial, List.of("Evaluatie"), ScenarioStatus.PUBLISHED));
        var room = roomService.createRoom("Live monitor", null, owner);
        var other = roomService.createRoom("Onafhankelijke monitor", null, otherOwner);
        roomService.assignScenario(room.getCode(), owner, scenario.id());
        roomService.joinRoom(room.getCode(), learner);
        roomService.startRoom(room.getCode(), owner);
        roomService.startRoom(other.getCode(), otherOwner);
        var root = "/api/rooms/" + room.getCode();
        var expected = objectMapper.valueToTree(scenario.initialVitals());
        var defaults = objectMapper.valueToTree(VitalsResponse.from(VitalsSnapshot.defaults()));
        var received = new LinkedBlockingQueue<String>();
        var otherReceived = new LinkedBlockingQueue<String>();
        var waves = new LinkedBlockingQueue<String>();
        var stomp = new WebSocketStompClient(new StandardWebSocketClient());
        stomp.setMessageConverter(new SimpleMessageConverter());
        try (var http = HttpClient.newHttpClient()) {
            var globalBefore = http.send(request("/api/vitals", owner, Role.LECTOR).GET().build(),
                    HttpResponse.BodyHandlers.ofString()).body();
            var first = http.send(request(root + "/vitals", learner, Role.CURSIST).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, first.statusCode());
            assertEquals(expected, objectMapper.readTree(first.body()));
            var otherBefore = http.send(request("/api/rooms/" + other.getCode() + "/vitals", otherOwner, Role.LECTOR)
                    .GET().build(), HttpResponse.BodyHandlers.ofString());
            assertEquals(defaults, objectMapper.readTree(otherBefore.body()));

            var session = stomp.connectAsync("ws://localhost:" + port + "/ws", new StompSessionHandlerAdapter() {})
                    .get(5, TimeUnit.SECONDS);
            try {
                subscribe(session, "/topic/rooms/" + room.getCode() + "/vitals", received);
                subscribe(session, "/topic/rooms/" + other.getCode() + "/vitals", otherReceived);
                subscribe(session, "/topic/rooms/" + room.getCode() + "/waveform/ibp", waves);
                assertNull(otherReceived.poll(250, TimeUnit.MILLISECONDS));
                assertEquals(globalBefore, http.send(request("/api/vitals", owner, Role.LECTOR).GET().build(),
                        HttpResponse.BodyHandlers.ofString()).body());
            } finally {
                session.disconnect();
            }
        } finally {
            stomp.stop();
            roomService.closeRoom(room.getCode());
            roomService.closeRoom(other.getCode());
        }
        assertTrue(!simulations.snapshots().containsKey(room.getCode()));
    }

    @Test
    void scenarioPlaybackPublishesWaveforms() throws Exception {
        var owner = createPerson(Role.LECTOR);
        var learner = createPerson(Role.CURSIST);
        var initial = new VitalsUpdateRequest(132.0, 89.0, 26.0, 48.0, 1.4, 275.0, 160.0);
        var scenario = scenarioService.create(new ScenarioDto.Create("Waveform oefening", "Roomisolatie",
                initial, List.of("Evaluatie"), ScenarioStatus.PUBLISHED));
        var room = roomService.createRoom("Waveform monitor", null, owner);
        roomService.assignScenario(room.getCode(), owner, scenario.id());
        roomService.joinRoom(room.getCode(), learner);
        roomService.startRoom(room.getCode(), owner);
        var waves = new LinkedBlockingQueue<String>();
        var stomp = new WebSocketStompClient(new StandardWebSocketClient());
        stomp.setMessageConverter(new SimpleMessageConverter());
        try {
            try (var http = HttpClient.newHttpClient()) {
                assertEquals(200, http.send(request("/api/rooms/" + room.getCode() + "/vitals", learner, Role.CURSIST)
                        .GET().build(), HttpResponse.BodyHandlers.discarding()).statusCode());
            }
            var session = stomp.connectAsync("ws://localhost:" + port + "/ws", new StompSessionHandlerAdapter() {})
                    .get(5, TimeUnit.SECONDS);
            try {
                subscribe(session, "/topic/rooms/" + room.getCode() + "/waveform/ibp", waves);
                double peak = 0;
                for (int i = 0; i < 40 && peak < 250; i++) {
                    var message = waves.poll(5, TimeUnit.SECONDS);
                    assertNotNull(message, "Room IBP waveform was not delivered");
                    for (var sample : objectMapper.readTree(message).path("samples")) {
                        peak = Math.max(peak, sample.asDouble());
                    }
                }
                assertTrue(peak > 250, "Scenario pressure must not be clipped at the legacy 200 mmHg limit");
            } finally {
                session.disconnect();
            }
        } finally {
            stomp.stop();
            roomService.closeRoom(room.getCode());
        }
    }

    @Test
    void simulationRouteRequiresAuthenticationAndHost() throws Exception {
        var owner = UUID.randomUUID();
        var lector = jwt().jwt(token -> token.subject(owner.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_LECTOR"));
        var cursist = jwt().jwt(token -> token.subject(owner.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_CURSIST"));
        var room = roomService.createRoom("Afgeschermde simulatie", null, owner);
        var path = "/api/rooms/" + room.getCode() + "/simulation";
        mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(path).with(cursist)).andExpect(status().isForbidden());
        mockMvc.perform(get(path).with(lector)).andExpect(status().isConflict());
    }

    @Test
    void simulationRouteRejectsNonMembers() throws Exception {
        var owner = UUID.randomUUID();
        var other = jwt().jwt(token -> token.subject(UUID.randomUUID().toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_LECTOR"));
        var room = roomService.createRoom("Afgeschermde simulatie", null, owner);
        var path = "/api/rooms/" + room.getCode() + "/simulation";
        roomService.startRoom(room.getCode(), owner);
        mockMvc.perform(get(path).with(other)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/rooms/" + room.getCode() + "/vitals").with(other))
                .andExpect(status().isForbidden());
    }

    @Test
    void simulationRouteRejectsInvalidCommands() throws Exception {
        var owner = UUID.randomUUID();
        var lector = jwt().jwt(token -> token.subject(owner.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_LECTOR"));
        var room = roomService.createRoom("Afgeschermde simulatie", null, owner);
        var path = "/api/rooms/" + room.getCode() + "/simulation";
        for (String invalid : List.of("{}", "{\"action\":null}", "{\"action\":\"UNKNOWN\"}", "{\"action\":\"STOP\"}")) {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path).with(lector)
                    .contentType(MediaType.APPLICATION_JSON).content(invalid)).andExpect(status().isBadRequest());
        }
    }

    @Test
    void simulationRouteRejectsCommandsForClosedRooms() throws Exception {
        var owner = UUID.randomUUID();
        var lector = jwt().jwt(token -> token.subject(owner.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_LECTOR"));
        var room = roomService.createRoom("Afgeschermde simulatie", null, owner);
        var path = "/api/rooms/" + room.getCode() + "/simulation";
        mockMvc.perform(put(path + "/scenario").with(lector).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        roomService.closeRoom(room.getCode());
        mockMvc.perform(get(path).with(lector)).andExpect(status().isConflict());
    }

    private UUID createPerson(Role role) {
        var person = new Person("Test", role.name(), UUID.randomUUID() + "@example.com", "password");
        person.setRole(role);
        return personRepository.save(person).getId();
    }

    private HttpRequest.Builder request(String path, UUID user, Role role) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Cookie", "access_token=" + jwtService.generateToken(user, role))
                .timeout(Duration.ofSeconds(5));
    }

    private void subscribe(StompSession session, String destination, LinkedBlockingQueue<String> received) {
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                received.add(new String((byte[]) payload, StandardCharsets.UTF_8));
            }
        });
        var headers = SimpMessageHeaderAccessor.create();
        headers.setDestination(destination);
        var probe = MessageBuilder.createMessage(new byte[0], headers.getMessageHeaders());
        assertTimeoutPreemptively(Duration.ofSeconds(5), () -> {
            while (broker.getSubscriptionRegistry().findSubscriptions(probe).isEmpty()) {
                Thread.sleep(10);
            }
        }, "STOMP subscription was not registered");
    }

    @Test
    void looksUpOnlyTheLecturersOwnActiveRoom() throws Exception {
        var owner = UUID.randomUUID();
        var otherOwner = UUID.randomUUID();
        var path = "/api/rooms/mine/active";
        var lector = jwt().jwt(token -> token.subject(owner.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_LECTOR"));
        var cursist = jwt().jwt(token -> token.subject(owner.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_CURSIST"));
        var ownRoom = roomService.createRoom("Eigen room", null, owner);
        var closedRoom = roomService.createRoom("Gesloten room", null, owner);
        roomService.closeRoom(closedRoom.getCode());
        roomService.createRoom("Room van een ander", null, otherOwner);

        mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(path).with(cursist)).andExpect(status().isForbidden());
        mockMvc.perform(get(path).with(lector))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ownRoom.getCode()));

        roomService.startRoom(ownRoom.getCode(), owner);
        mockMvc.perform(get(path).with(lector))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ownRoom.getCode()));

        roomService.closeRoom(ownRoom.getCode());
        mockMvc.perform(get(path).with(lector)).andExpect(status().isNoContent());
    }

}
