package be.pxl.healthcareapi;

import be.pxl.healthcareapi.domein.Person;
import be.pxl.healthcareapi.domein.ScenarioStatus;
import be.pxl.healthcareapi.domein.enums.Role;
import be.pxl.healthcareapi.dto.ScenarioDto;
import be.pxl.healthcareapi.dto.VitalsUpdateRequest;
import be.pxl.healthcareapi.repositories.PersonRepository;
import be.pxl.healthcareapi.services.RoomService;
import be.pxl.healthcareapi.services.ScenarioService;
import be.pxl.healthcareapi.services.authentication.JwtService;
import be.pxl.healthcareapi.services.person.PersonService;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
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
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

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
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
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
    private PersonService personService;

    @Test
    void contextLoads() {
    }

    @Test
    void successfulJoinSendsRoomSignalOverWebSocket() throws Exception {
        var room = roomService.createRoom("Realtime room", null, UUID.randomUUID());
        Person learner = personRepository.save(new Person("Test", "Learner", "learner@example.com","password"));
        var destination = "/topic/rooms/" + room.getId() + "/members-changed";
        var received = new LinkedBlockingQueue<String>();
        var stomp = new WebSocketStompClient(new StandardWebSocketClient());

        stomp.setMessageConverter(new SimpleMessageConverter());
        var join = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/rooms/" + room.getCode() + "/join"))
                .header("Cookie", "access_token=" + jwtService.generateToken(learner.getId(), Role.CURSIST))
                .timeout(Duration.ofSeconds(5))
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();

        try (var http = HttpClient.newHttpClient()) {
            var session = stomp.connectAsync("ws://localhost:" + port + "/ws", new StompSessionHandlerAdapter() {})
                    .get(5, TimeUnit.SECONDS);
            try {
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

                assertEquals(200, http.send(join, HttpResponse.BodyHandlers.discarding()).statusCode());
                assertEquals("true", received.poll(5, TimeUnit.SECONDS));
                assertTrue(roomService.getRoomParticipants(room.getCode()).stream().anyMatch(member -> member.userId().equals(learner.getId())));

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
    void onlyHostCanAssignPublishedScenarioBeforeStartAndDeletionUnlinksIt() throws Exception {
        var owner = UUID.randomUUID();
        var lector = jwt().jwt(token -> token.subject(owner.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_LECTOR"));
        var otherLector = jwt().jwt(token -> token.subject(UUID.randomUUID().toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_LECTOR"));
        var cursist = jwt().jwt(token -> token.subject(owner.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_CURSIST"));
        var room = roomService.createRoom("Eigen room", null, owner);
        var path = "/api/rooms/" + room.getCode() + "/scenario";
        var vitals = new VitalsUpdateRequest(102.0, 98.0, 15.0, 38.0, 1.0, 120.0, 80.0);
        var draft = scenarioService.create(new ScenarioDto.Create("Concept", "Oefening",
                vitals, List.of("Evaluatiepunt"), ScenarioStatus.DRAFT));
        var published = scenarioService.create(new ScenarioDto.Create("Monitorsimulatie", "Oefening",
                vitals, List.of("Evaluatiepunt"), ScenarioStatus.PUBLISHED));
        var selection = "{\"scenarioId\":\"" + published.id() + "\"}";
        var clear = "{\"scenarioId\":null}";

        mockMvc.perform(get(path).with(lector)).andExpect(status().isNoContent());
        mockMvc.perform(get(path).with(cursist)).andExpect(status().isForbidden());
        mockMvc.perform(put(path).with(otherLector).contentType(MediaType.APPLICATION_JSON).content(selection))
                .andExpect(status().isForbidden());
        mockMvc.perform(put(path).with(lector).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put(path).with(lector).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scenarioId\":\"" + draft.id() + "\"}"))
                .andExpect(status().isConflict());
        mockMvc.perform(put(path).with(lector).contentType(MediaType.APPLICATION_JSON).content(selection))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(published.id().toString()));
        mockMvc.perform(put(path).with(lector).contentType(MediaType.APPLICATION_JSON).content(clear))
                .andExpect(status().isNoContent());
        mockMvc.perform(get(path).with(lector)).andExpect(status().isNoContent());
        mockMvc.perform(put(path).with(lector).contentType(MediaType.APPLICATION_JSON).content(selection))
                .andExpect(status().isOk());

        roomService.startRoom(room.getCode(), owner);
        mockMvc.perform(put(path).with(lector).contentType(MediaType.APPLICATION_JSON).content(clear))
                .andExpect(status().isConflict());
        mockMvc.perform(get(path).with(lector)).andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Monitorsimulatie"))
                .andExpect(jsonPath("$.initialVitals.heartRate").value(102));
        scenarioService.delete(published.id());
        mockMvc.perform(get(path).with(lector)).andExpect(status().isNoContent());
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
