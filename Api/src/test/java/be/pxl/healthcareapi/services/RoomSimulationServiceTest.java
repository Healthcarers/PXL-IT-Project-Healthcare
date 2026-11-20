package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.Room;
import be.pxl.healthcareapi.domein.RoomStatus;
import be.pxl.healthcareapi.domein.Scenario;
import be.pxl.healthcareapi.domein.ScenarioStatus;
import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.dto.VitalsResponse;
import be.pxl.healthcareapi.repositories.RoomParticipantRepository;
import be.pxl.healthcareapi.repositories.RoomRepository;
import be.pxl.healthcareapi.repositories.ScenarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import static be.pxl.healthcareapi.services.RoomSimulationService.Action.*;
import static be.pxl.healthcareapi.services.RoomSimulationService.Status.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomSimulationServiceTest {
    @Mock RoomRepository rooms;
    @Mock RoomParticipantRepository participants;
    @Mock ScenarioRepository scenarios;
    @Mock SimpMessagingTemplate messaging;
    private final UUID owner = UUID.randomUUID();
    private final AtomicLong clock = new AtomicLong(1000);
    private final VitalsSnapshot initial = new VitalsSnapshot(132, 89, 26, 48, 1.4, 275, 160);
    private RoomSimulationService service;
    private Room room;
    private Scenario selected;

    @BeforeEach
    void setUp() {
        service = new RoomSimulationService(rooms, participants, scenarios, messaging, clock::get);
        selected = scenario(ScenarioStatus.PUBLISHED, initial);
        room = room("ABC123", selected);
        when(rooms.findForUpdate("ABC123")).thenReturn(Optional.of(room));
    }

    @Test
    void preselectedValuesAndLoadingAnotherScenarioStayIsolatedToTheRoom() {
        Room second = room("DEF456", null);
        when(rooms.findForUpdate("DEF456")).thenReturn(Optional.of(second));
        assertThat(service.getVitals("abc123", owner)).isEqualTo(VitalsResponse.from(initial));
        assertThat(service.getVitals("DEF456", owner)).isEqualTo(VitalsResponse.from(VitalsSnapshot.defaults()));

        var nextVitals = new VitalsSnapshot(40, 75, 8, 24, 0.6, 90, 50);
        var next = scenario(ScenarioStatus.PUBLISHED, nextVitals);
        when(scenarios.findById(next.getId())).thenReturn(Optional.of(next));
        var loaded = service.load("ABC123", owner, next.getId());
        assertThat(loaded.status()).isEqualTo(READY);
        assertThat(loaded.scenario().id()).isEqualTo(next.getId());
        assertThat(loaded.vitals()).isEqualTo(VitalsResponse.from(initial));

        var started = service.control("ABC123", owner, START);
        assertThat(started.vitals()).isEqualTo(VitalsResponse.from(nextVitals));
        assertThat(service.snapshots()).containsEntry("ABC123", nextVitals)
                .containsEntry("DEF456", VitalsSnapshot.defaults());
        verify(messaging).convertAndSend("/topic/rooms/ABC123/vitals", VitalsResponse.from(nextVitals));
        verify(messaging, times(2)).convertAndSend("/topic/rooms/ABC123/simulation-changed", Boolean.TRUE);
        verify(messaging, never()).convertAndSend(eq("/topic/vitals"), any(Object.class));
    }

    @Test
    void pauseFreezesOnlyElapsedTimeResumeContinuesAndRestartResetsIt() {
        service.control("ABC123", owner, START);
        clock.addAndGet(5300);
        assertThat(service.control("ABC123", owner, PAUSE).elapsedMillis()).isEqualTo(5300);
        clock.addAndGet(9000);
        assertThat(service.get("ABC123", owner).elapsedMillis()).isEqualTo(5300);
        assertThat(service.snapshots()).containsEntry("ABC123", initial);
        service.control("ABC123", owner, START);
        clock.addAndGet(1700);
        assertThat(service.get("ABC123", owner).elapsedMillis()).isEqualTo(7000);

        var restarted = service.control("ABC123", owner, RESTART);
        assertThat(restarted.status()).isEqualTo(RUNNING);
        assertThat(restarted.elapsedMillis()).isZero();
        assertThat(restarted.vitals()).isEqualTo(VitalsResponse.from(initial));
        clock.addAndGet(4000);
        assertThat(service.get("ABC123", owner).elapsedMillis()).isEqualTo(4000);
    }

    @Test
    void rejectsNonHostsUnstartedRoomsDraftsAndInvalidTransitions() {
        assertThatThrownBy(() -> service.control("ABC123", UUID.randomUUID(), START))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.control("ABC123", owner, PAUSE))
                .isInstanceOf(IllegalStateException.class);
        var draft = scenario(ScenarioStatus.DRAFT, initial);
        when(scenarios.findById(draft.getId())).thenReturn(Optional.of(draft));
        assertThatThrownBy(() -> service.load("ABC123", owner, draft.getId()))
                .isInstanceOf(IllegalStateException.class);
        service.control("ABC123", owner, START);
        assertThatThrownBy(() -> service.control("ABC123", owner, START))
                .isInstanceOf(IllegalStateException.class);
        room.close();
        assertThatThrownBy(() -> service.control("ABC123", owner, RESTART))
                .isInstanceOf(IllegalStateException.class);
        ReflectionTestUtils.setField(room, "status", RoomStatus.OPEN);
        assertThatThrownBy(() -> service.get("ABC123", owner)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void emptyRoomRequiresAScenarioAndOnlyMembersCanReadVitals() {
        room.assignScenario(null);
        assertThatThrownBy(() -> service.control("ABC123", owner, START))
                .isInstanceOf(IllegalStateException.class);
        UUID learner = UUID.randomUUID();
        when(participants.existsByRoomIdAndUserId(room.getId(), learner)).thenReturn(true);
        assertThat(service.getVitals("ABC123", learner)).isEqualTo(VitalsResponse.from(VitalsSnapshot.defaults()));
        assertThatThrownBy(() -> service.getVitals("ABC123", UUID.randomUUID()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void closeRemovesRuntimeOnlyAfterCommitNotRollback() {
        service.get("ABC123", owner);
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.endAfterCommit("abc123");
            assertThat(service.snapshots()).containsKey("ABC123");
            var synchronization = TransactionSynchronizationManager.getSynchronizations().getFirst();
            synchronization.afterCompletion(1);
            assertThat(service.snapshots()).containsKey("ABC123");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.endAfterCommit("abc123");
            TransactionSynchronizationManager.getSynchronizations().getFirst().afterCommit();
            assertThat(service.snapshots()).doesNotContainKey("ABC123");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private Room room(String code, Scenario scenario) {
        var result = new Room(code, "Simulatie", owner);
        ReflectionTestUtils.setField(result, "id", UUID.randomUUID());
        result.assignScenario(scenario);
        result.start();
        return result;
    }

    private Scenario scenario(ScenarioStatus status, VitalsSnapshot values) {
        var result = new Scenario("Oefening", "Beschrijving", values, List.of("Evaluatie"), status);
        ReflectionTestUtils.setField(result, "id", UUID.randomUUID());
        return result;
    }
}
