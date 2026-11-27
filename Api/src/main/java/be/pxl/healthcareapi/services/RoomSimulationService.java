package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.domein.RoomStatus;
import be.pxl.healthcareapi.domein.ScenarioStatus;
import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.dto.RoomScenarioResponse;
import be.pxl.healthcareapi.dto.VitalsResponse;
import be.pxl.healthcareapi.exception.NotFoundException;
import be.pxl.healthcareapi.repositories.RoomParticipantRepository;
import be.pxl.healthcareapi.repositories.RoomRepository;
import be.pxl.healthcareapi.repositories.ScenarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import java.util.stream.Collectors;

@Service
public class RoomSimulationService {
    public enum Status { READY, RUNNING, PAUSED }
    public enum Action { START, PAUSE, RESTART }
    public record State(RoomScenarioResponse scenario, Status status, long elapsedMillis, VitalsResponse vitals) {}

    private static final Logger log = LoggerFactory.getLogger(RoomSimulationService.class);
    private final RoomRepository rooms;
    private final RoomParticipantRepository participants;
    private final ScenarioRepository scenarios;
    private final SimpMessagingTemplate messaging;
    private final LongSupplier clock;
    private final Map<String, RoomSimulationSession> sessions = new ConcurrentHashMap<>();

    @Autowired
    public RoomSimulationService(RoomRepository rooms, RoomParticipantRepository participants,
                                 ScenarioRepository scenarios, SimpMessagingTemplate messaging) {
        this(rooms, participants, scenarios, messaging, () -> System.nanoTime() / 1_000_000);
    }

    RoomSimulationService(RoomRepository rooms, RoomParticipantRepository participants,
                          ScenarioRepository scenarios, SimpMessagingTemplate messaging, LongSupplier clock) {
        this.rooms = rooms;
        this.participants = participants;
        this.scenarios = scenarios;
        this.messaging = messaging;
        this.clock = clock;
    }

    @Transactional
    public State get(String code, UUID userId) {
        return session(hostRoom(code, userId)).state(clock);
    }

    @Transactional
    public VitalsResponse getVitals(String code, UUID userId) {
        Room room = startedRoom(code);
        if (!room.getOwnerId().equals(userId) &&
                !participants.existsByRoomIdAndUserId(room.getId(), userId)) {
            throw new AccessDeniedException("Je neemt niet deel aan deze room.");
        }
        return session(room).state(clock).vitals();
    }

    @Transactional
    public State load(String code, UUID userId, UUID scenarioId) {
        Room room = hostRoom(code, userId);
        var scenario = scenarios.findById(scenarioId)
                .orElseThrow(() -> new NotFoundException("Scenario niet gevonden: " + scenarioId));
        if (scenario.getStatus() != ScenarioStatus.PUBLISHED) {
            throw new IllegalStateException("Je kunt alleen een gepubliceerd scenario laden.");
        }
        RoomSimulationSession session = session(room);
        synchronized (session) {
            session.scenario = RoomScenarioResponse.from(scenario);
            session.initial = scenario.getInitialVitals();
            session.status = Status.READY;
            session.elapsed = 0;
            publish(room.getCode(), session);
            return session.state(clock);
        }
    }

    @Transactional
    public State control(String code, UUID userId, Action action) {
        Room room = hostRoom(code, userId);
        RoomSimulationSession session = session(room);
        synchronized (session) {
            applyAction(session, action);
            publish(room.getCode(), session);
            return session.state(clock);
        }
    }

    public Map<String, VitalsSnapshot> snapshots() {
        return sessions.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, entry -> {
            synchronized (entry.getValue()) {
                return entry.getValue().vitals;
            }
        }));
    }

    public void endAfterCommit(String code) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sessions.remove(code.toUpperCase());
                }
            });
        } else {
            sessions.remove(code.toUpperCase());
        }
    }

    private Room startedRoom(String code) {
        Room room = rooms.findForUpdate(code.toUpperCase())
                .orElseThrow(() -> new NotFoundException("Room niet gevonden: " + code));
        if (room.getStatus() != RoomStatus.STARTED) {
            throw new IllegalStateException("De simulatie van deze room is niet actief.");
        }
        return room;
    }

    private Room hostRoom(String code, UUID userId) {
        Room room = startedRoom(code);
        if (!room.getOwnerId().equals(userId)) {
            throw new AccessDeniedException("Alleen de host kan het scenario bedienen.");
        }
        return room;
    }

    private RoomSimulationSession session(Room room) {
        return sessions.computeIfAbsent(room.getCode(), ignored -> createSession(room));
    }

    private RoomSimulationSession createSession(Room room) {
        var selected = room.getScenario();
        return new RoomSimulationSession(
                selected == null ? null : RoomScenarioResponse.from(selected),
                selected == null ? VitalsSnapshot.defaults() : selected.getInitialVitals());
    }

    private void applyAction(RoomSimulationSession session, Action action) {
        switch (action) {
            case START -> start(session);
            case PAUSE -> pause(session);
            case RESTART -> restart(session);
        }
    }

    private void start(RoomSimulationSession session) {
        if (session.status == Status.RUNNING) {
            throw new IllegalStateException("Het scenario is al gestart.");
        }
        requireScenario(session);
        if (session.status != Status.PAUSED) resetVitals(session);
        session.startedAt = clock.getAsLong();
        session.status = Status.RUNNING;
    }

    private void pause(RoomSimulationSession session) {
        if (session.status != Status.RUNNING) {
            throw new IllegalStateException("Start het scenario voordat je pauzeert.");
        }
        session.elapsed = session.elapsedMillis(clock);
        session.status = Status.PAUSED;
    }

    private void restart(RoomSimulationSession session) {
        requireScenario(session);
        resetVitals(session);
        session.startedAt = clock.getAsLong();
        session.status = Status.RUNNING;
    }

    private static void resetVitals(RoomSimulationSession session) {
        session.vitals = session.initial;
        session.elapsed = 0;
    }

    private static void requireScenario(RoomSimulationSession session) {
        if (session.scenario == null) throw new IllegalStateException("Laad eerst een scenario.");
    }

    private void publish(String code, RoomSimulationSession session) {
        try {
            messaging.convertAndSend("/topic/rooms/" + code + "/vitals", VitalsResponse.from(session.vitals));
            messaging.convertAndSend("/topic/rooms/" + code + "/simulation-changed", Boolean.TRUE);
        } catch (MessagingException exception) {
            log.warn("Kon de simulatie-update voor room {} niet versturen.", code, exception);
        }
    }

}
