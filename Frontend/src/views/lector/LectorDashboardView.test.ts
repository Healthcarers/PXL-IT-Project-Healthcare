// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LectorDashboardView from "./LectorDashboardView.vue";
import App from "../../App.vue";
import router from "../../router/index.ts";
import api from "../../services/refreshService.ts";
import { useRoom } from "../../composables/useRoom";
import { useHeartbeatSound } from "../../composables/useHeartbeatSound";
import { useAuthStore } from "../../stores/Authstore";
import type { Room, RoomParticipant } from "../../types/room";

const {
  pushMock,
  replaceMock,
  loadRoomMock,
  loadParticipantsMock,
  closeRoomMock,
  clearRoomMock,
  subscribeTopicMock,
  heartbeatSoundMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  loadRoomMock: vi.fn(),
  loadParticipantsMock: vi.fn(),
  closeRoomMock: vi.fn(),
  clearRoomMock: vi.fn(),
  subscribeTopicMock: vi.fn(() => vi.fn()),
  heartbeatSoundMock: vi.fn(),
}));

vi.mock("../../config/api", () => ({
  API_BASE_URL: "http://localhost:8090/api",
}));

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-router")>();
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
    }),
  };
});

vi.mock("../../composables/useRoom", () => ({
  useRoom: vi.fn(),
}));

vi.mock("../../composables/useHeartbeatSound.ts", () => ({
  useHeartbeatSound: heartbeatSoundMock,
}));

vi.mock("../../services/stompClient", () => ({
  connected: ref(true),
  subscribeTopic: subscribeTopicMock,
}));

vi.mock("../../services/stompClient.ts", () => ({
  connected: ref(true),
  subscribeTopic: subscribeTopicMock,
}));

vi.mock("vue-chartjs", () => ({
  Line: defineComponent({
    name: "MockLine",
    setup() {
      return () => h("canvas", { "data-testid": "mock-waveform-canvas" });
    },
  }),
}));

describe("LectorDashboardView.vue", () => {
  let currentRoom: ReturnType<typeof ref<Room | null>>;
  let participants: ReturnType<typeof ref<RoomParticipant[]>>;
  let loading: ReturnType<typeof ref<boolean>>;
  let error: ReturnType<typeof ref<string | null>>;

  const startedRoom: Room = {
    id: "room-1",
    code: "48K7QX",
    name: "Reanimatie 2B",
    description: null,
    createdAt: "2026-01-01T10:00:00Z",
    status: "STARTED",
    ownerId: "lector-1",
    participantCount: 4,
  };

  const roomParticipants: RoomParticipant[] = [
    {
      id: "p-host",
      userId: "lector-1",
      firstname: "Inge",
      lastname: "Maes",
      joinedAt: "2026-01-01T10:00:00Z",
    },
    {
      id: "p-1",
      userId: "cursist-1",
      firstname: "Jan",
      lastname: "Peeters",
      joinedAt: "2026-01-01T10:01:00Z",
    },
    {
      id: "p-2",
      userId: "cursist-2",
      firstname: "Lotte",
      lastname: "Janssens",
      joinedAt: "2026-01-01T10:02:00Z",
    },
    {
      id: "p-3",
      userId: "cursist-3",
      firstname: "Bram",
      lastname: "Willems",
      joinedAt: "2026-01-01T10:03:00Z",
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    const authStore = useAuthStore();
    authStore.person = {
      id: "lector-1",
      firstname: "Inge",
      lastname: "Maes",
      role: "LECTOR",
    };

    currentRoom = ref<Room | null>(startedRoom);
    participants = ref<RoomParticipant[]>(roomParticipants);
    loading = ref(false);
    error = ref<string | null>(null);

    loadRoomMock.mockResolvedValue(startedRoom);
    loadParticipantsMock.mockResolvedValue(roomParticipants);
    closeRoomMock.mockResolvedValue({ ...startedRoom, status: "CLOSED" });

    vi.mocked(useRoom).mockReturnValue({
      currentRoom,
      participants,
      loading,
      error,
      loadRoom: loadRoomMock,
      loadParticipants: loadParticipantsMock,
      closeRoom: closeRoomMock,
      clearRoom: clearRoomMock,
    } as unknown as ReturnType<typeof useRoom>);

    vi.spyOn(api, "get").mockImplementation((url: string) => {
      if (url === "/vitals") {
        return Promise.resolve({
          data: {
            heartRate: 75,
            spo2: 98,
            etco2: 38,
            respRate: 15,
            ampScale: 1.0,
            sysBp: 120,
            diasBp: 80,
          },
        });
      }
      return Promise.reject(new Error("Unexpected GET " + url));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mountDashboard() {
    return mount(LectorDashboardView, {
      props: { code: "48K7QX" },
    });
  }

  it("toont roomcode, lector, cursistenaantal, live preview zonder audio en sectieplaceholders", async () => {
    const wrapper = mountDashboard();
    await flushPromises();

    const roomDetails = wrapper.get('header').text();
    expect(roomDetails).toContain("Room 48K7QX");
    expect(roomDetails).toContain("Lector: Inge Maes");
    expect(roomDetails).toContain("3 cursisten verbonden");
    expect(roomDetails).toContain("Room sluiten");
    expect(wrapper.findAll("header")).toHaveLength(1);
    expect(wrapper.find('[aria-label="Roomgegevens"]').exists()).toBe(false);
    expect(wrapper.find("nav").exists()).toBe(false);

    expect(wrapper.text()).toContain("Wat de cursist ziet");
    expect(wrapper.text()).toContain("LIVE");
    expect(wrapper.text()).toContain("Parameters (realtime)");
    expect(wrapper.text()).toContain("Scenario");
    expect(wrapper.findAll('[data-testid="mock-waveform-canvas"]')).toHaveLength(4);
    expect(useHeartbeatSound).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("toont in de volledige app één compacte roomheader met de uitlog-dropdown onder Lector", async () => {
    const store = useAuthStore();
    vi.spyOn(store, "isAuthenticated").mockResolvedValue(store.person!);
    await router.push("/host/rooms/48K7QX/dashboard");
    const wrapper = mount(App, { global: { plugins: [router] } });
    try {
      await flushPromises();
      expect(wrapper.findAll("header")).toHaveLength(1);
      expect(wrapper.find("nav").exists()).toBe(false);
      const header = wrapper.get("header");
      expect(header.text()).toContain("Room 48K7QX");
      expect(header.text()).toContain("Lector: Inge Maes");
      expect(header.text()).toContain("3 cursisten verbonden");
      expect(wrapper.find('[aria-label="Roomgegevens"]').exists()).toBe(false);
      const profile = header.get('button[aria-controls="lector-profile-menu"]');
      expect(profile.text()).toBe("Lector");
      await profile.trigger("click");
      await header.get('[role="menuitem"]').trigger("click");
      expect(wrapper.get('[role="dialog"]').text()).toContain("Uitloggen?");
      await wrapper.get('[role="dialog"]').findAll("button")
        .find(button => button.text() === "Annuleren")!.trigger("click");
      await header.findAll("button").find(button => button.text() === "Room sluiten")!.trigger("click");
      expect(wrapper.get('[role="dialog"]').text()).toContain("Room sluiten?");
    } finally {
      wrapper.unmount();
    }
  });

  it("klapt het cursistscherm in en uit via Inklappen en Cursistscherm tonen zonder de grafieken te unmounten", async () => {
    const wrapper = mountDashboard();
    await flushPromises();

    const previewSection = wrapper.get('section[aria-label="Wat de cursist ziet"]');
    expect(previewSection.attributes("style") ?? "").not.toContain("display: none");

    const collapseBtn = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("Inklappen"));
    expect(collapseBtn).toBeDefined();

    await collapseBtn!.trigger("click");
    expect(previewSection.attributes("style")).toContain("display: none");
    expect(wrapper.text()).toContain("Cursistscherm tonen");
    expect(wrapper.findAll('[data-testid="mock-waveform-canvas"]')).toHaveLength(4);

    const expandBtn = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("Cursistscherm tonen"));
    await expandBtn!.trigger("click");
    expect(previewSection.attributes("style") ?? "").not.toContain("display: none");

    wrapper.unmount();
  });

  it("stuurt een lector die niet de eigenaar is of een niet-gestarte room opent terug naar host-dashboard", async () => {
    loadRoomMock.mockResolvedValueOnce({
      ...startedRoom,
      status: "OPEN",
    });

    const wrapperOpen = mountDashboard();
    await flushPromises();

    expect(replaceMock).toHaveBeenCalledWith({
      name: "host-dashboard",
      params: { code: "48K7QX" },
    });
    expect(loadParticipantsMock).not.toHaveBeenCalled();
    wrapperOpen.unmount();

    replaceMock.mockClear();
    loadRoomMock.mockResolvedValueOnce({
      ...startedRoom,
      ownerId: "andere-lector-id",
    });

    const wrapperOtherOwner = mountDashboard();
    await flushPromises();

    expect(replaceMock).toHaveBeenCalledWith({
      name: "host-dashboard",
      params: { code: "48K7QX" },
    });
    wrapperOtherOwner.unmount();
  });

  it("sluit de room meteen en navigeert pas na vijf seconden terug naar /rooms/new", async () => {
    vi.useFakeTimers();
    const wrapper = mountDashboard();
    try {
      await flushPromises();
      const closeBtn = wrapper.findAll('header button')
        .find((btn) => btn.text().trim() === "Room sluiten")!;
      await closeBtn.trigger("click");
      const dialog = wrapper.get('[role="dialog"]');
      expect(dialog.text()).toContain("Room sluiten?");
      await dialog.findAll("button")
        .find((btn) => btn.text().trim() === "Room sluiten")!.trigger("click");
      await flushPromises();

      expect(closeRoomMock).toHaveBeenCalledOnce();
      expect(wrapper.get('[role="status"]').text()).toContain("over 5 seconden");
      expect(closeBtn.attributes("disabled")).toBeDefined();
      await vi.advanceTimersByTimeAsync(4999);
      expect(pushMock).not.toHaveBeenCalled();
      expect(clearRoomMock).not.toHaveBeenCalled();
      expect(loadParticipantsMock).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(1);
      expect(clearRoomMock).toHaveBeenCalledOnce();
      expect(pushMock).toHaveBeenCalledExactlyOnceWith({ name: "create-room" });
    } finally {
      wrapper.unmount();
      vi.useRealTimers();
    }
  });

  it.each([false, true])("annuleert de terugkeertimer bij verlaten of wisselen van room (wisselen: %s)", async (changeRoom) => {
    vi.useFakeTimers();
    const wrapper = mountDashboard();
    try {
      await flushPromises();
      await wrapper.findAll("header button").find(button => button.text() === "Room sluiten")!.trigger("click");
      await wrapper.get('[role="dialog"]').findAll("button")
        .find(button => button.text() === "Room sluiten")!.trigger("click");
      await flushPromises();
      if (changeRoom) await wrapper.setProps({ code: "NEW123" });
      else wrapper.unmount();
      await vi.advanceTimersByTimeAsync(5000);
      expect(pushMock).not.toHaveBeenCalled();
      expect(clearRoomMock).not.toHaveBeenCalled();
    } finally {
      if (changeRoom) wrapper.unmount();
      vi.useRealTimers();
    }
  });

  it("navigeert niet terug wanneer het sluiten mislukt", async () => {
    vi.useFakeTimers();
    closeRoomMock.mockImplementationOnce(async () => {
      error.value = "De room kon niet worden gesloten.";
      throw new Error(error.value);
    });
    const wrapper = mountDashboard();
    try {
      await flushPromises();
      await wrapper.findAll("header button").find(button => button.text() === "Room sluiten")!.trigger("click");
      await wrapper.get('[role="dialog"]').findAll("button")
        .find(button => button.text() === "Room sluiten")!.trigger("click");
      await flushPromises();
      expect(wrapper.get('[role="alert"]').text()).toContain("De room kon niet worden gesloten.");
      expect(wrapper.find('[role="status"]').exists()).toBe(false);
      await vi.advanceTimersByTimeAsync(5000);
      expect(pushMock).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
      vi.useRealTimers();
    }
  });

  it("beveiligt de /host/rooms/:code/dashboard route voor alleen de LECTOR-rol", async () => {
    const lectorRoute = router
      .getRoutes()
      .find((r) => r.name === "lector-dashboard");
    expect(lectorRoute).toBeDefined();
    expect(lectorRoute?.meta).toEqual({ requiresAuth: true, role: "LECTOR" });

    const store = useAuthStore();

    const authSpy = vi
      .spyOn(store, "isAuthenticated")
      .mockRejectedValue(new Error("Not authenticated"));
    await router.push("/host/rooms/48K7QX/dashboard");
    expect(router.currentRoute.value.name).toBe("login");

    authSpy.mockResolvedValue({
      id: "cursist-1",
      firstname: "Test",
      lastname: "Cursist",
      role: "CURSIST",
    });
    await router.push("/host/rooms/48K7QX/dashboard");
    expect(router.currentRoute.value.name).toBe("unauthorized");

    authSpy.mockResolvedValue({
      id: "lector-1",
      firstname: "Inge",
      lastname: "Maes",
      role: "LECTOR",
    });
    await router.push("/host/rooms/48K7QX/dashboard");
    expect(router.currentRoute.value.name).toBe("lector-dashboard");
  });
});
