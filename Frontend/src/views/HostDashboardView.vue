<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useRoom } from '../composables/useRoom'
import { roomService } from '../services/roomService'
import { scenarioService } from '../services/scenarioService'
import { connected, subscribeTopic } from '../services/stompClient'
import { useAuthStore } from '../stores/Authstore'
import type { RoomScenario } from '../types/room'

const props = defineProps<{ code: string }>()
const auth = useAuthStore()
const router = useRouter()
const { currentRoom, participants, loading, error, loadRoom, startRoom, closeRoom, clearRoom } = useRoom()
const scenarios = ref<RoomScenario[]>([])
const selected = ref<RoomScenario>()
const scenarioError = ref('')
const participantsError = ref('')
const loadingScenarios = ref(false)
const saving = ref(false)
const copyMessage = ref('')
const returningToCreate = ref(false)
const startModalOpen = ref(false)
const startingRoom = ref(false)
let returnTimer: ReturnType<typeof setTimeout> | undefined
let version = 0
let latestParticipantRequest = 0

const room = computed(() => currentRoom.value?.code === props.code.toUpperCase() ? currentRoom.value : null)
const isHost = computed(() => !!auth.person && room.value?.ownerId === auth.person.id)
const openHostRoom = computed(() => isHost.value && room.value?.status === 'OPEN' ? room.value : undefined)
const host = computed(() => participants.value.find(p => p.userId === room.value?.ownerId))
const learners = computed(() => participants.value.filter(p => p.userId !== room.value?.ownerId))
const hasLearners = computed(() => learners.value.length > 0)
const values = computed(() => selected.value?.initialVitals)
const busy = computed(() => loading.value || saving.value || loadingScenarios.value || startingRoom.value)
const labels = {
  OPEN: 'Wacht op cursisten',
  STARTED: 'Simulatie gestart',
  CLOSED: 'Room gesloten',
}
const statusLabel = computed(() => {
  if (!room.value) return ''
  if (room.value.status === 'OPEN' && hasLearners.value) {
    const count = learners.value.length
    return count === 1 ? '1 cursist in de room' : `${count} cursisten in de room`
  }
  return labels[room.value.status]
})

async function refreshParticipants(code: string) {
  const request = ++latestParticipantRequest
  const dashboard = version
  const isCurrent = () => request === latestParticipantRequest && dashboard === version
  try {
    const members = await roomService.getParticipants(code)
    if (!isCurrent()) return
    participants.value = members
    participantsError.value = ''
  } catch {
    if (isCurrent()) participantsError.value = 'De deelnemers konden niet worden opgehaald.'
  }
}

async function refreshDashboard() {
  const request = version
  const code = props.code
  scenarioError.value = ''
  try {
    if (!auth.person) await auth.isAuthenticated()
    await loadRoom(code)
    if (request !== version) return
    await Promise.all([refreshParticipants(code), isHost.value ? loadScenarios(code, request) : undefined])
  } catch {
    // useRoom toont laadfouten via error.
  }
}

async function loadScenarios(code: string, request: number) {
  loadingScenarios.value = true
  try {
    const [assigned, catalogue] = await Promise.all([
      roomService.getScenario(code),
      room.value?.status === 'OPEN' ? scenarioService.list() : Promise.resolve([]),
    ])
    if (request !== version) return
    selected.value = assigned
    scenarios.value = catalogue.filter(scenario => scenario.status === 'PUBLISHED')
  } catch {
    if (request === version) scenarioError.value = 'De scenario’s konden niet worden opgehaald. Probeer te vernieuwen.'
  } finally {
    if (request === version) loadingScenarios.value = false
  }
}

async function chooseScenario(event: Event) {
  const select = event.target
  if (!(select instanceof HTMLSelectElement) || busy.value || !isHost.value || room.value?.status !== 'OPEN') return

  const request = version
  saving.value = true
  scenarioError.value = ''
  try {
    const result = await roomService.assignScenario(props.code, select.value || null)
    if (request === version) selected.value = result
  } catch (cause) {
    if (request !== version) return
    select.value = selected.value?.id ?? ''
    scenarioError.value = cause instanceof Error ? cause.message : 'Het scenario kon niet worden opgeslagen.'
  } finally {
    if (request === version) saving.value = false
  }
}

async function handleStart() {
  if (!startModalOpen.value || busy.value || !isHost.value || room.value?.status !== 'OPEN') return
  const request = version
  startingRoom.value = true
  try {
    const started = await startRoom()
    if (started?.status !== 'STARTED' || request !== version) return
    const failure = await router.replace({ name: 'lector-dashboard', params: { code: started.code } })
    if (failure && request === version) error.value = 'Het lectordashboard kon niet worden geopend.'
  } catch {
    if (request === version && !error.value) error.value = 'De simulatie kon niet worden gestart of het lectordashboard kon niet worden geopend.'
  } finally {
    if (request === version) {
      startingRoom.value = false
      startModalOpen.value = false
    }
  }
}

async function handleClose() {
  if (!window.confirm('Wil je deze room sluiten?')) return
  const request = version
  try {
    const closed = await closeRoom()
    if (closed?.status !== 'CLOSED' || request !== version) return
    returningToCreate.value = true
    returnTimer = setTimeout(() => {
      clearRoom()
      void router.replace({ name: 'create-room' })
    }, 5000)
  } catch {
    // useRoom toont de fout via error.
  }
}

function cancelPending() {
  version++
  startModalOpen.value = false
  startingRoom.value = false
  clearTimeout(returnTimer)
  returningToCreate.value = false
  selected.value = undefined
  scenarios.value = []
  saving.value = false
  loadingScenarios.value = false
  copyMessage.value = ''
  participants.value = []
  participantsError.value = ''
}

async function copyRoomCode() {
  if (!room.value) return
  try {
    await navigator.clipboard.writeText(room.value.code)
    copyMessage.value = 'Roomcode gekopieerd.'
  } catch {
    copyMessage.value = 'De roomcode kon niet worden gekopieerd.'
  }
}

onMounted(refreshDashboard)
watch(() => openHostRoom.value?.id, (id, _, onCleanup) => {
  const code = openHostRoom.value?.code
  if (!id || !code) return

  const unsubscribe = subscribeTopic<boolean>(`/topic/rooms/${id}/members-changed`, changed => {
    if (changed === true && openHostRoom.value?.id === id) void refreshParticipants(code)
  })
  onCleanup(unsubscribe)
}, { immediate: true })

watch([() => openHostRoom.value?.code, connected], ([code, online], previous, onCleanup) => {
  if (!code) return

  let active = true
  let timer: ReturnType<typeof setTimeout>
  const interval = online ? 15000 : 2000
  const poll = async () => {
    await refreshParticipants(code)
    if (active) timer = setTimeout(poll, interval)
  }

  if (online && previous?.[0] === code && !previous[1]) void poll()
  else timer = setTimeout(poll, interval)
  onCleanup(() => {
    active = false
    clearTimeout(timer)
  })
}, { immediate: true })
watch(() => props.code, () => {
  cancelPending()
  void refreshDashboard()
})
onUnmounted(cancelPending)
</script>

<template>
  <main class="min-h-[calc(100vh-3.5rem)] bg-[#f7f5f0] px-4 py-8 text-black lg:px-8 lg:py-10">
    <section class="mx-auto max-w-7xl rounded-xl border border-[#e2ded6] bg-white p-5 sm:p-8 lg:p-10">
      <template v-if="room">
        <div class="mb-3 h-0.5 w-14 bg-[#ae9a64]"></div>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-600">Hostdashboard</p>
            <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">{{ room.name }}</h1>
            <p class="mt-3 text-base text-gray-600">Deel de roomcode met je cursisten. Je kan intussen het scenario kiezen.</p>
          </div>
          <span role="status" aria-label="Roomstatus" class="rounded-full px-4 py-2 text-sm font-bold" :class="{
            'bg-amber-100 text-amber-800': room.status === 'OPEN' && !hasLearners,
            'bg-green-100 text-green-800': room.status === 'OPEN' && hasLearners,
            'bg-blue-100 text-blue-800': room.status === 'STARTED',
            'bg-red-100 text-red-800': room.status === 'CLOSED',
          }"><span aria-hidden="true">●</span> {{ statusLabel }}</span>
        </div>

        <div class="mt-6 grid gap-6 md:grid-cols-2 lg:gap-8">
          <div class="min-w-0 space-y-4">
            <div class="grid gap-4 min-[400px]:grid-cols-2">
              <div class="rounded-xl bg-[#131315] p-4 text-white lg:p-5">
                <div class="flex flex-wrap items-center justify-between gap-1">
                  <span class="text-xs font-bold uppercase tracking-wider text-gray-300">Roomcode</span>
                  <button type="button" class="rounded border border-white/40 px-3 py-1.5 text-sm hover:bg-white/15"
                    @click="copyRoomCode">Kopiëren</button>
                </div>
                <p class="mt-3 text-2xl font-extrabold tracking-widest sm:text-3xl">{{ room.code }}</p>
                <p v-if="copyMessage" role="status" class="mt-1 text-xs">{{ copyMessage }}</p>
              </div>
              <div class="rounded-xl border border-[#e2ded6] bg-[#f4f2ed] p-4 lg:p-5">
                <p class="text-xs font-bold uppercase tracking-wider text-gray-600">Cursisten</p>
                <p class="mt-3 flex flex-wrap items-baseline gap-2">
                  <span class="text-2xl font-extrabold sm:text-3xl">{{ learners.length }}</span>
                  <span class="text-sm text-gray-600">verbonden</span>
                </p>
              </div>
            </div>
            <div v-if="room.description" class="rounded-xl border border-[#e2ded6] p-4 lg:p-5">
              <h2 class="text-xs font-bold uppercase tracking-wider text-gray-600">Opdracht voor de cursisten</h2>
              <p class="mt-2 whitespace-pre-wrap text-base">{{ room.description }}</p>
            </div>
            <section v-if="isHost" class="rounded-xl border border-[#ae9a64] bg-[#faf9f6] p-4 lg:p-5">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label for="room-scenario" class="text-xs font-bold uppercase tracking-wider text-[#80602a]">Scenario</label>
                <span class="text-sm text-gray-600">{{ room.status === 'OPEN' ? 'Wijzigbaar tot de start' : 'Niet meer wijzigbaar' }}</span>
              </div>
              <select id="room-scenario" class="min-h-12 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base disabled:opacity-70"
                :value="selected?.id ?? ''" :disabled="busy || room.status !== 'OPEN'" @change="chooseScenario">
                <option value="">{{ loadingScenarios ? 'Scenario’s laden…' : 'Geen scenario' }}</option>
                <option v-if="selected && !scenarios.some(s => s.id === selected?.id)" :value="selected.id">{{ selected.name }}</option>
                <option v-for="scenario in scenarios" :key="scenario.id" :value="scenario.id">{{ scenario.name }}</option>
              </select>
              <ul v-if="values" class="mt-3 flex flex-wrap gap-2 text-sm font-semibold" aria-label="Basiswaarden">
                <li class="rounded-full bg-green-100 px-2 py-0.5 text-green-800">HF {{ values.heartRate }}</li>
                <li class="rounded-full bg-red-100 px-2 py-0.5 text-red-800">BD {{ values.sysIbp }}/{{ values.diasIbp }}</li>
                <li class="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">SpO₂ {{ values.spo2 }} %</li>
                <li class="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">etCO₂ {{ values.etco2 }}</li>
              </ul>
              <p v-if="saving" role="status" class="mt-2 text-xs">Scenariokeuze opslaan…</p>
              <p v-if="scenarioError" role="alert" class="mt-2 text-xs text-red-800">{{ scenarioError }}</p>
            </section>
          </div>

          <section aria-labelledby="participants-heading">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="participants-heading" class="text-xl font-extrabold">Deelnemers</h2>
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span>{{ participants.length }} in de room</span>
                <button type="button" class="underline" :disabled="busy" @click="refreshDashboard">Vernieuwen</button>
              </div>
              <p v-if="participantsError" role="alert" class="mb-3 text-sm text-red-800">{{ participantsError }}</p>
            </div>
            <ul class="space-y-2">
              <li v-if="host" class="flex items-center justify-between gap-2 rounded-xl border border-[#e2ded6] bg-[#f4f2ed] px-4 py-3">
                <div>
                  <p class="font-semibold">{{ host.firstname }} {{ host.lastname }}</p>
                  <p class="text-sm text-gray-600">Lector</p>
                </div>
                <span class="rounded-full bg-[#ebe2cb] px-2 py-1 text-xs font-bold text-[#80602a]">Host</span>
              </li>
              <li v-for="participant in learners" :key="participant.id" class="rounded-xl border border-[#e2ded6] px-4 py-3">
                <p class="font-semibold">{{ participant.firstname }} {{ participant.lastname }}</p>
                <p class="text-sm text-gray-600">Cursist</p>
              </li>
            </ul>
            <div v-if="!learners.length" class="mt-3 rounded-xl border border-dashed border-[#d6d5d2] p-5 text-center">
              <p class="font-semibold">Nog geen cursisten</p>
              <p class="text-sm text-gray-600">Cursisten kunnen joinen met code {{ room.code }}.</p>
            </div>
          </section>
        </div>

        <div class="mt-6 border-t border-gray-200 pt-5">
          <p v-if="!isHost" class="text-sm text-red-700">Je bent niet de eigenaar van deze room.</p>
          <p v-else-if="room.status === 'CLOSED'" role="status" class="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">
            {{ returningToCreate
              ? 'Deze room is gesloten. Je gaat over 5 seconden terug naar Room aanmaken.'
              : 'Deze room is gesloten.' }}
          </p>
          <div v-else class="flex flex-wrap gap-3">
            <button type="button" :disabled="busy"
              class="min-h-12 w-full rounded-lg border border-black px-6 py-3 text-base font-bold hover:bg-gray-100 disabled:opacity-50 sm:w-56"
              @click="handleClose">Room sluiten</button>
            <button v-if="room.status === 'OPEN'" type="button" :disabled="busy"
              class="min-h-12 min-w-40 flex-1 rounded-lg bg-black px-6 py-3 text-base font-bold text-white hover:bg-gray-800 disabled:opacity-50"
              @click="startModalOpen = true">Simulatie starten</button>
          </div>
        </div>
      </template>
      <p v-else-if="loading" role="status" class="py-12 text-center text-gray-500">Dashboard wordt geladen...</p>
      <h1 v-else class="py-8 text-2xl font-bold">Room niet beschikbaar</h1>
      <p v-if="error" role="alert" class="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{{ error }}</p>
    </section>
    <ConfirmModal :open="startModalOpen" title="Simulatie starten?"
      message="Wil je de simulatie starten? De verbonden cursisten gaan naar de monitor en jij opent het lectordashboard."
      confirm-label="Simulatie starten" :loading="startingRoom"
      @cancel="startModalOpen = false" @confirm="handleStart" />
  </main>
</template>
