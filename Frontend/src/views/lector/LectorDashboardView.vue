<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import CursistPreviewCard from "../../components/lector/CursistPreviewCard.vue";
import ConfirmModal from "../../components/ConfirmModal.vue";
import LectorTopbar from "../../components/lector/LectorTopbar.vue";
import { useRoom } from "../../composables/useRoom";
import { useAuthStore } from "../../stores/Authstore";
import ParametersPanel from "../../components/lector/ParametersPanel.vue";
import { DEFAULT_PARAMETERS, type Parameters } from "../../types/lector.ts";

const PARTICIPANTS_POLL_MS = 5000;

const props = defineProps<{
  code: string;
}>();
const emit = defineEmits<{ "request-logout": [] }>();

const router = useRouter();
const authStore = useAuthStore();

const {
  currentRoom,
  participants,
  error,
  loadRoom,
  loadParticipants,
  closeRoom,
  clearRoom,
} = useRoom();

const previewCollapsed = ref(false);
const logoutModalOpen = ref(false);
const closeRoomModalOpen = ref(false);
const closingRoom = ref(false);
const statusNotice = ref<string | null>(null);
const parameters = ref<Parameters>({
  ...DEFAULT_PARAMETERS,
});
const returningToCreate = ref(false);

let participantsPollInterval: ReturnType<typeof setInterval> | null = null;
let pollingParticipants = false;
let returnTimer: ReturnType<typeof setTimeout> | undefined;
let dashboardVersion = 0;

function cancelPendingReturn() {
  dashboardVersion++;
  clearTimeout(returnTimer);
  returningToCreate.value = false;
  closeRoomModalOpen.value = false;
  closingRoom.value = false;
}

const displayRoomCode = computed(
  () => currentRoom.value?.code ?? props.code.toUpperCase(),
);

const lectorName = computed(() => {
  const person = authStore.person;
  if (!person) return "Lector";
  const fullName = [person.firstname, person.lastname]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || "Lector";
});

const cursistCount = computed(() => {
  const ownerId = currentRoom.value?.ownerId;
  if (!ownerId) return participants.value.length;
  return participants.value.filter((p) => p.userId !== ownerId).length;
});

function stopParticipantsPolling() {
  if (participantsPollInterval !== null) {
    clearInterval(participantsPollInterval);
    participantsPollInterval = null;
  }
}

async function pollParticipants() {
  if (pollingParticipants) return;
  pollingParticipants = true;
  try {
    await loadParticipants(props.code);
  } catch {
    // Error wordt weergegeven via useRoom().
  } finally {
    pollingParticipants = false;
  }
}

function startParticipantsPolling() {
  stopParticipantsPolling();
  participantsPollInterval = setInterval(() => {
    void pollParticipants();
  }, PARTICIPANTS_POLL_MS);
}

async function initializeDashboard() {
  stopParticipantsPolling();

  try {
    if (!authStore.person) {
      await authStore.isAuthenticated();
    }

    const room = await loadRoom(props.code);
    const currentUserId = authStore.person?.id ?? null;

    if (
      !currentUserId ||
      room.ownerId !== currentUserId ||
      room.status !== "STARTED"
    ) {
      await router.replace({
        name: "host-dashboard",
        params: { code: room.code ?? props.code },
      });
      return;
    }

    await loadParticipants(props.code);
    startParticipantsPolling();
  } catch {
    // Foutmelding wordt beheerd door useRoom().
  }
}

async function handleConfirmCloseRoom() {
  if (closingRoom.value || returningToCreate.value) return;
  const request = dashboardVersion;
  closingRoom.value = true;
  try {
    const closed = await closeRoom();
    if (request !== dashboardVersion || closed?.status !== "CLOSED") return;
    closeRoomModalOpen.value = false;
    stopParticipantsPolling();
    returningToCreate.value = true;
    returnTimer = setTimeout(async () => {
      clearRoom();
      try {
        const failure = await router.push({ name: "create-room" });
        if (failure && request === dashboardVersion)
          error.value = "Room aanmaken kon niet worden geopend.";
      } catch {
        if (request === dashboardVersion)
          error.value = "Room aanmaken kon niet worden geopend.";
      }
    }, 5000);
  } catch {
    if (request === dashboardVersion) closeRoomModalOpen.value = false;
  } finally {
    if (request === dashboardVersion) closingRoom.value = false;
  }
}

onMounted(() => {
  void initializeDashboard();
});

watch(
  () => props.code,
  () => {
    cancelPendingReturn();
    void initializeDashboard();
  },
);

onUnmounted(() => {
  cancelPendingReturn();
  stopParticipantsPolling();
});
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#050506] text-white">
    <LectorTopbar
      :room-code="displayRoomCode"
      :lector-name="lectorName"
      :cursist-count="cursistCount"
      :closing="closingRoom"
      @close-room="closeRoomModalOpen = true"
      @request-logout="logoutModalOpen = true"
    />

    <main
      class="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6"
    >
      <div
        v-if="statusNotice"
        role="status"
        class="flex items-center justify-between gap-3 rounded-xl border border-[#ae9a64]/60 bg-[#141418] px-4 py-3 text-sm text-[#e4e4e7]"
      >
        <span>{{ statusNotice }}</span>
        <button
          type="button"
          aria-label="Sluit melding"
          class="rounded-lg px-2 py-1 text-xs font-semibold text-[#a1a1aa] transition hover:bg-white/10 hover:text-white"
          @click="statusNotice = null"
        >
          Sluiten
        </button>
      </div>
    </main>

    <LectorTopbar
      :room-code="displayRoomCode"
      :lector-name="lectorName"
      :cursist-count="cursistCount"
      :closing="closingRoom || returningToCreate"
      @close-room="closeRoomModalOpen = true"
      @request-logout="emit('request-logout')"
    />
    <main
      class="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-4 px-4 py-4 sm:px-6"
    >
      <p
        v-if="returningToCreate"
        role="status"
        class="rounded-xl border border-[#ae9a64]/60 bg-[#141418] px-4 py-3 text-sm text-[#e4e4e7]"
      >
        Deze room is gesloten. Je gaat over 5 seconden terug naar Room aanmaken.
      </p>
      <div
        v-if="error"
        role="alert"
        class="flex items-center justify-between gap-3 rounded-xl border border-[#ef4444] bg-[#ef4444]/10 px-4 py-3 text-sm text-[#fecaca]"
      >
        <span>{{ error }}</span>
        <button
          type="button"
          class="rounded-lg border border-[#ef4444]/60 px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#ef4444]/20"
          @click="initializeDashboard"
        >
          Opnieuw proberen
        </button>
      </div>

      <div
        class="grid flex-1 grid-cols-1 items-start gap-5"
        :class="
          previewCollapsed
            ? 'lg:grid-cols-[270px_minmax(0,1fr)]'
            : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]'
        "
      >
        <div class="flex flex-col gap-5">
          <CursistPreviewCard
            :collapsed="previewCollapsed"
            @toggle-collapse="previewCollapsed = !previewCollapsed"
          />

          <section
            aria-label="Scenario"
            class="rounded-2xl border border-[#222228] bg-[#0e0e11] p-4 sm:p-5"
          >
            <p class="!m-0 text-xs font-medium text-[#8e8e99]">Scenario</p>
            <p class="!m-0 mt-2 text-sm text-[#71717a]">
              Scenario-bediening wordt in een aparte feature toegevoegd.
            </p>
          </section>
        </div>

        <ParametersPanel
          v-model:parameters="parameters"
          :expanded="previewCollapsed"
        />
      </div>
    </main>

    <ConfirmModal
      :open="closeRoomModalOpen"
      title="Room sluiten?"
      message="Weet je zeker dat je deze room wilt sluiten? De simulatie wordt beëindigd voor alle verbonden cursisten."
      cancel-label="Annuleren"
      confirm-label="Room sluiten"
      :loading="closingRoom"
      @cancel="closeRoomModalOpen = false"
      @confirm="handleConfirmCloseRoom"
    />
  </div>
</template>
