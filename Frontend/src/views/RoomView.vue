
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRoom } from '../composables/useRoom'

const props = defineProps<{
  code: string
}>()

const router = useRouter()

const {
  currentRoom,
  participants,
  loading,
  error,
  loadRoom,
  loadParticipants,
  joinRoom,
  startRoom,
  closeRoom,
} = useRoom()

const currentUserId = import.meta.env.VITE_DEV_USER_ID as string

const isHost = computed(() =>
  currentRoom.value?.ownerId === currentUserId,
)

const isParticipant = computed(() =>
  isHost.value ||
  participants.value.some(
    participant => participant.userId === currentUserId,
  ),
)

const hostCount = computed(() =>
  participants.value.filter(
    participant => participant.userId === currentRoom.value?.ownerId,
  ).length,
)

const statusLabel = computed(() => {
  switch (currentRoom.value?.status) {
    case 'OPEN':
      return 'Wacht op deelnemers'
    case 'STARTED':
      return 'Simulatie gestart'
    case 'CLOSED':
      return 'Room gesloten'
    default:
      return 'Laden...'
  }
})

const sortedParticipants = computed(() => {
  return [...participants.value].sort((a, b) => {
    if (a.userId === currentRoom.value?.ownerId) return -1
    if (b.userId === currentRoom.value?.ownerId) return 1
    return 0
  })
})

async function refreshRoom() {
  try {
    await loadRoom(props.code)
    await loadParticipants(props.code)
  } catch {
    // De foutmelding wordt weergegeven via useRoom().
  }
}

async function handleJoin() {
  try {
    await joinRoom()
  } catch {
    // De foutmelding wordt weergegeven via useRoom().
  }
}

async function handleStart() {
  try {
    await startRoom()
  } catch {
    // De foutmelding wordt weergegeven via useRoom().
  }
}

async function handleClose() {
  if (!window.confirm('Ben je zeker dat je deze room wilt sluiten?')) {
    return
  }

  try {
    await closeRoom()
  } catch {
    // De foutmelding wordt weergegeven via useRoom().
  }
}

async function copyRoomCode() {
  if (!currentRoom.value) return

  try {
    await navigator.clipboard.writeText(currentRoom.value.code)
  } catch {
    error.value = 'De roomcode kon niet worden gekopieerd.'
  }
}

onMounted(refreshRoom)

watch(() => props.code, refreshRoom)
</script>

<template>
  <main class="min-h-screen bg-[#f7f5f0] px-4 py-10 text-black">
    <section class="mx-auto w-full max-w-4xl">

      <button
        class="mb-6 text-sm font-semibold text-gray-500 hover:text-black"
        @click="router.push({ name: 'home' })"
      >
        ← Terug naar startpagina
      </button>

      <div class="rounded-2xl border border-[#d6d5d2] bg-white p-6 sm:p-10">

        <div class="mb-6 h-1 w-14 bg-[#ae9a64]"></div>

        <template v-if="currentRoom">

          <!-- Room header -->
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Healthcare Simulator
              </p>

              <h1 class="mt-2 text-3xl font-extrabold">
                {{ currentRoom.name }}
              </h1>

              <p class="mt-2 text-sm text-gray-500">
                {{ isHost ? 'Jouw room' : 'Gedeelde room' }}
              </p>
            </div>

            <span
              class="rounded-full px-4 py-2 text-xs font-bold"
              :class="{
                'bg-green-50 text-green-800': currentRoom.status === 'OPEN',
                'bg-blue-50 text-blue-800': currentRoom.status === 'STARTED',
                'bg-red-50 text-red-800': currentRoom.status === 'CLOSED',
              }"
            >
              {{ statusLabel }}
            </span>
          </div>

          <!-- Room code -->
          <div class="mt-8 rounded-xl bg-[#f7f5f0] p-5">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Roomcode
                </p>

                <p class="mt-1 font-mono text-3xl font-extrabold tracking-[0.2em]">
                  {{ currentRoom.code }}
                </p>

                <p class="mt-2 text-xs text-gray-500">
                  Deel deze code met andere deelnemers.
                </p>
              </div>

              <button
                class="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-bold hover:bg-gray-100"
                @click="copyRoomCode"
              >
                Code kopiëren
              </button>
            </div>
          </div>

          <!-- Description -->
          <div v-if="currentRoom.description" class="mt-8">
            <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">
              Opdracht
            </h2>

            <p class="mt-2 whitespace-pre-wrap leading-relaxed">
              {{ currentRoom.description }}
            </p>
          </div>

          <!-- Statistics -->
          <div class="mt-8 grid grid-cols-2 gap-4">
            <div class="rounded-xl border border-gray-200 p-5">
              <p class="text-sm text-gray-500">Totaal deelnemers</p>
              <p class="mt-2 text-3xl font-extrabold">
                {{ participants.length }}
              </p>
            </div>

            <div class="rounded-xl border border-gray-200 p-5">
              <p class="text-sm text-gray-500">Hosts</p>
              <p class="mt-2 text-3xl font-extrabold">
                {{ hostCount }}
              </p>
            </div>
          </div>

          <!-- Participants -->
          <div class="mt-8 border-t border-gray-200 pt-6">

            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-bold">Deelnemers</h2>
                <p class="mt-1 text-sm text-gray-500">
                  Overzicht van iedereen in deze room.
                </p>
              </div>

              <button
                class="text-sm font-semibold text-gray-500 hover:text-black"
                :disabled="loading"
                @click="refreshRoom"
              >
                Vernieuwen
              </button>
            </div>

            <ul class="mt-5 space-y-3">
              <li
                v-for="participant in sortedParticipants"
                :key="participant.id"
                class="flex items-center justify-between rounded-xl border border-gray-200 p-4"
                :class="{
                  'border-[#ae9a64] bg-[#faf8f2]':
                    participant.userId === currentRoom.ownerId,
                }"
              >
                <div class="min-w-0">
                  <p class="font-bold">
                    {{ participant.userId === currentRoom.ownerId
                      ? 'Room host'
                      : 'Deelnemer' }}
                    <span
                      v-if="participant.userId === currentUserId"
                      class="ml-1 text-xs text-gray-400"
                    >
                      (Jij)
                    </span>
                  </p>

                  <p class="mt-1 truncate text-xs text-gray-400">
                    {{ participant.userId }}
                  </p>

                  <p class="mt-1 text-xs text-gray-400">
                    Deelgenomen:
                    {{ new Date(participant.joinedAt).toLocaleString('nl-BE') }}
                  </p>
                </div>

                <span
                  v-if="participant.userId === currentRoom.ownerId"
                  class="ml-3 rounded-full bg-[#f4f0e6] px-3 py-1 text-xs font-bold text-[#806d3d]"
                >
                  Host
                </span>
                <span
                  v-else
                  class="ml-3 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                >
                  Deelnemer
                </span>
              </li>
            </ul>

            <p
              v-if="participants.length === 0"
              class="mt-4 text-sm text-gray-500"
            >
              Er zijn nog geen deelnemers.
            </p>
          </div>

          <!-- Host dashboard -->
          <div
            v-if="isHost"
            class="mt-8 rounded-xl border border-[#d6d5d2] p-6"
          >
            <p class="text-xs font-bold uppercase tracking-wider text-[#806d3d]">
              Host dashboard
            </p>

            <h2 class="mt-2 text-xl font-extrabold">
              Roombeheer
            </h2>

            <p class="mt-2 text-sm text-gray-500">
              Je beheert deze room. Je kunt de simulatie starten of de room sluiten.
            </p>

            <div
              v-if="currentRoom.status === 'OPEN'"
              class="mt-6 space-y-3"
            >
              <button
                :disabled="loading"
                class="w-full rounded-lg bg-black px-5 py-4 font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
                @click="handleStart"
              >
                {{ loading ? 'Bezig...' : 'Simulatie starten' }}
              </button>

              <button
                :disabled="loading"
                class="w-full rounded-lg border border-red-300 px-5 py-4 font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                @click="handleClose"
              >
                Room sluiten
              </button>
            </div>

            <div
              v-else-if="currentRoom.status === 'STARTED'"
              class="mt-6 rounded-lg bg-blue-50 p-4 text-sm font-semibold text-blue-800"
            >
              De simulatie is gestart. De room kan niet meer worden gestart.
            </div>

            <div
              v-else
              class="mt-6 rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800"
            >
              Deze room is gesloten.
            </div>
          </div>

          <!-- Participant dashboard -->
          <div
            v-else
            class="mt-8 border-t border-gray-200 pt-6"
          >
            <button
              v-if="!isParticipant && currentRoom.status === 'OPEN'"
              :disabled="loading"
              class="w-full rounded-lg bg-black px-5 py-4 font-bold text-white hover:bg-gray-800 disabled:opacity-50"
              @click="handleJoin"
            >
              {{ loading ? 'Bezig met deelnemen...' : 'Deelnemen aan room' }}
            </button>

            <p
              v-else-if="isParticipant && currentRoom.status === 'OPEN'"
              class="rounded-lg bg-green-50 p-4 text-sm font-semibold text-green-800"
            >
              Je neemt deel aan deze room. De host kan de simulatie starten.
            </p>

            <p
              v-else-if="currentRoom.status === 'STARTED'"
              class="rounded-lg bg-blue-50 p-4 text-sm font-semibold text-blue-800"
            >
              De simulatie is gestart.
            </p>

            <p
              v-else
              class="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800"
            >
              Deze room is gesloten.
            </p>
          </div>

        </template>

        <div v-else-if="loading" class="py-12 text-center text-gray-500">
          Room wordt geladen...
        </div>

        <div v-else class="py-8">
          <h1 class="text-2xl font-bold">Room niet beschikbaar</h1>
          <p class="mt-2 text-sm text-gray-500">
            Controleer de roomcode of probeer opnieuw.
          </p>
        </div>

        <p
          v-if="error"
          role="alert"
          class="mt-6 rounded-lg border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {{ error }}
        </p>

        <button
          v-if="currentRoom && error"
          class="mt-3 text-sm font-semibold underline"
          @click="refreshRoom"
        >
          Opnieuw proberen
        </button>

      </div>
    </section>
  </main>
</template>
