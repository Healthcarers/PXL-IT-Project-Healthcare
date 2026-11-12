
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRoom } from '../composables/useRoom'
import { getCurrentUserId } from '../services/api'

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
  startRoom,
  closeRoom,
} = useRoom()

const currentUserId = getCurrentUserId()

const isHost = computed(
  () => currentRoom.value?.ownerId === currentUserId,
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

async function refreshDashboard() {
  try {
    await loadRoom(props.code)
    await loadParticipants(props.code)

    console.log('HOST DEBUG:', {
      currentUserId,
      ownerId: currentRoom.value?.ownerId,
      isHost: currentRoom.value?.ownerId === currentUserId,
    })
  } catch {
    // Fout wordt weergegeven via useRoom().
  }
}

async function handleStart() {
  if (!window.confirm('Wil je de simulatie starten?')) return

  try {
    await startRoom()
    await refreshDashboard()
  } catch {
    // Fout wordt weergegeven via useRoom().
  }
}

async function handleClose() {
  if (!window.confirm('Wil je deze room sluiten?')) return

  try {
    await closeRoom()
    await refreshDashboard()
  } catch {
    // Fout wordt weergegeven via useRoom().
  }
}

async function copyRoomCode() {
  if (!currentRoom.value) return

  try {
    await navigator.clipboard.writeText(currentRoom.value.code)
  } catch {
    // Kopiëren niet beschikbaar.
  }
}

onMounted(refreshDashboard)
watch(() => props.code, refreshDashboard)
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
        <template v-if="currentRoom">
          <div class="mb-6 h-1 w-14 bg-[#ae9a64]"></div>

          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Healthcare Simulator · Hostdashboard
              </p>

              <h1 class="mt-2 text-3xl font-extrabold">
                {{ currentRoom.name }}
              </h1>

              <p class="mt-2 text-sm text-gray-500">
                Je beheert deze simulatie.
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

          <div class="mt-8 grid gap-4 sm:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-[#faf9f6] p-5">
              <p class="text-xs font-bold uppercase tracking-wider text-gray-400">
                Roomcode
              </p>

              <div class="mt-2 flex items-center justify-between gap-3">
                <span class="font-mono text-2xl font-extrabold tracking-widest">
                  {{ currentRoom.code }}
                </span>

                <button
                  class="text-sm font-semibold underline"
                  @click="copyRoomCode"
                >
                  Kopiëren
                </button>
              </div>
            </div>

            <div class="rounded-xl border border-gray-200 bg-[#faf9f6] p-5">
              <p class="text-xs font-bold uppercase tracking-wider text-gray-400">
                Deelnemers
              </p>

              <p class="mt-2 text-2xl font-extrabold">
                {{ participants.length }}
              </p>
            </div>
          </div>

          <div v-if="currentRoom.description" class="mt-8">
            <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">
              Opdracht
            </h2>

            <p class="mt-2 whitespace-pre-wrap leading-relaxed">
              {{ currentRoom.description }}
            </p>
          </div>

          <div class="mt-8 border-t border-gray-200 pt-6">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-xl font-bold">Deelnemers in de room</h2>

              <button
                class="text-sm font-semibold text-gray-500 underline hover:text-black"
                :disabled="loading"
                @click="refreshDashboard"
              >
                Vernieuwen
              </button>
            </div>

            <ul v-if="participants.length" class="mt-4 space-y-3">
              <li
                v-for="participant in participants"
                :key="participant.id"
                class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3"
              >
                <div>
                  <p class="font-semibold">
                    {{ participant.userId === currentRoom.ownerId ? 'Host' : 'Deelnemer' }}
                  </p>

                  <p class="mt-1 break-all text-xs text-gray-400">
                    {{ participant.userId }}
                  </p>
                </div>

                <span
                  v-if="participant.userId === currentRoom.ownerId"
                  class="rounded-full bg-[#f4f0e6] px-3 py-1 text-xs font-bold text-[#806d3d]"
                >
                  Host
                </span>
              </li>
            </ul>

            <p v-else class="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
              Er zijn nog geen deelnemers.
            </p>
          </div>

          <div class="mt-8 border-t border-gray-200 pt-6">
            <p v-if="!isHost" class="text-sm text-red-700">
              Je bent niet de eigenaar van deze room.
            </p>

            <template v-else>
              <button
                v-if="currentRoom.status === 'OPEN'"
                :disabled="loading"
                class="w-full rounded-lg bg-black px-5 py-4 font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
                @click="handleStart"
              >
                {{ loading ? 'Bezig...' : 'Simulatie starten' }}
              </button>

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

              <button
                v-if="currentRoom.status === 'OPEN'"
                :disabled="loading"
                class="mt-3 w-full rounded-lg border border-red-700 px-5 py-3 font-bold text-red-800 transition hover:bg-red-50 disabled:opacity-50"
                @click="handleClose"
              >
                Room sluiten
              </button>
            </template>
          </div>
        </template>

        <div v-else-if="loading" class="py-12 text-center text-gray-500">
          Dashboard wordt geladen...
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
      </div>
    </section>
  </main>
</template>
