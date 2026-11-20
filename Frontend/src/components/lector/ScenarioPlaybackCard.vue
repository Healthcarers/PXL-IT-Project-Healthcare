<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { connected, subscribeTopic } from '../../services/stompClient'
import { scenarioService, type Scenario } from '../../services/scenarioService'
import { roomSimulationService, type RoomSimulation, type SimulationAction } from '../../services/roomSimulationService'
import LectorConfirmModal from './LectorConfirmModal.vue'

const props = defineProps<{ code: string; disabled?: boolean }>()
const state = ref<RoomSimulation>()
const busy = ref(false)
const error = ref('')
const pickerError = ref('')
const pickerOpen = ref(false)
const restartModalOpen = ref(false)
const catalogue = ref<Scenario[]>([])
const selectedId = ref('')
const loadingCatalogue = ref(false)
const now = ref(Date.now())
let receivedAt = Date.now()
let generation = 0
let latestRequest = 0
let clockTimer: ReturnType<typeof setInterval> | undefined
const unavailable = computed(() => props.disabled || busy.value || !state.value)
const elapsed = computed(() => {
  const milliseconds = (state.value?.elapsedMillis ?? 0) +
    (state.value?.status === 'RUNNING' ? Math.max(0, now.value - receivedAt) : 0)
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
})
const labels = { READY: 'Klaar om te starten', RUNNING: 'Actief', PAUSED: 'Gepauzeerd' }

function failure(cause: unknown) {
  const data = axios.isAxiosError(cause) ? cause.response?.data : null
  return typeof data === 'string' && data.trim() ? data : 'De scenario-bediening is mislukt. Probeer het opnieuw.'
}

function apply(result: RoomSimulation) {
  state.value = result
  receivedAt = Date.now()
  now.value = receivedAt
  error.value = ''
}

async function refresh() {
  if (busy.value || props.disabled) return
  const request = ++latestRequest
  const version = generation
  try {
    const result = await roomSimulationService.get(props.code)
    if (version === generation && request === latestRequest) apply(result)
  } catch (cause) {
    if (version === generation && request === latestRequest) error.value = failure(cause)
  }
}

async function control(action: SimulationAction) {
  if (unavailable.value) return
  const version = generation
  latestRequest++
  busy.value = true
  error.value = ''
  try {
    const result = await roomSimulationService.control(props.code, action)
    if (version === generation) apply(result)
  } catch (cause) {
    if (version === generation) error.value = failure(cause)
  } finally {
    if (version === generation) busy.value = false
  }
}

function confirmRestart() {
  if (!restartModalOpen.value || unavailable.value) return
  restartModalOpen.value = false
  void control('RESTART')
}

async function openPicker() {
  if (props.disabled || busy.value) return
  const version = generation
  pickerOpen.value = true
  pickerError.value = ''
  selectedId.value = state.value?.scenario?.id ?? ''
  loadingCatalogue.value = true
  try {
    const scenarios = await scenarioService.list()
    if (version === generation) catalogue.value = scenarios.filter(scenario => scenario.status === 'PUBLISHED')
  } catch (cause) {
    if (version === generation) pickerError.value = failure(cause)
  } finally {
    if (version === generation) loadingCatalogue.value = false
  }
}

async function loadScenario() {
  if (busy.value || loadingCatalogue.value || props.disabled) return
  if (!catalogue.value.some(scenario => scenario.id === selectedId.value)) {
    pickerError.value = 'Kies een gepubliceerd scenario.'
    return
  }
  const version = generation
  latestRequest++
  busy.value = true
  pickerError.value = ''
  try {
    const result = await roomSimulationService.load(props.code, selectedId.value)
    if (version !== generation) return
    apply(result)
    pickerOpen.value = false
  } catch (cause) {
    if (version === generation) pickerError.value = failure(cause)
  } finally {
    if (version === generation) busy.value = false
  }
}

watch(() => props.code, (code, _, onCleanup) => {
  generation++
  state.value = undefined
  busy.value = false
  pickerOpen.value = false
  restartModalOpen.value = false
  catalogue.value = []
  void refresh()
  const unsubscribe = subscribeTopic<boolean>(`/topic/rooms/${code.toUpperCase()}/simulation-changed`, () => void refresh())
  const stopConnectionWatch = watch(connected, online => { if (online) void refresh() })
  const fallback = setInterval(() => void refresh(), 5000)
  onCleanup(() => {
    generation++
    unsubscribe()
    stopConnectionWatch()
    clearInterval(fallback)
  })
}, { immediate: true })

watch(() => props.disabled, disabled => {
  if (disabled) {
    pickerOpen.value = false
    restartModalOpen.value = false
  }
})
onMounted(() => { clockTimer = setInterval(() => { now.value = Date.now() }, 250) })
onUnmounted(() => clearInterval(clockTimer))
</script>

<template>
  <section aria-label="Scenario" class="rounded-2xl border border-[#29292f] bg-[#111113] p-5 sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm text-[#a1a1aa]">Scenario</p>
        <h2 class="mt-1 text-xl font-bold wrap-anywhere">{{ state?.scenario?.name ?? 'Geen scenario geladen' }}</h2>
      </div>
      <div class="text-right text-sm text-[#a1a1aa]">
        <p aria-label="Verstreken scenariotijd" class="font-mono text-lg tabular-nums">{{ elapsed }}</p>
        <p v-if="state">{{ labels[state.status] }}</p>
      </div>
    </div>
    <div class="mt-4 flex flex-wrap gap-2">
      <button type="button" class="scenario-action" :class="state?.status === 'RUNNING' ? 'pause' : 'start'"
        :disabled="unavailable || !state?.scenario"
        @click="control(state?.status === 'RUNNING' ? 'PAUSE' : 'START')">
        {{ state?.status === 'RUNNING' ? 'Pauze' : 'Start' }}
      </button>
      <button type="button" class="scenario-action" :disabled="unavailable || !state?.scenario"
        @click="restartModalOpen = true">Herstarten</button>
    </div>
    <button type="button" class="scenario-action mt-3" :disabled="disabled || busy" @click="openPicker">Nieuw scenario laden</button>
    <div v-if="error" class="mt-4 rounded-full border border-[#ae9a64] px-4 py-3 text-center text-sm">
      <p role="alert">{{ error }}</p>
      <button type="button" class="mt-1 underline" :disabled="busy || disabled" @click="refresh">Opnieuw proberen</button>
    </div>
    <LectorConfirmModal :open="pickerOpen" title="Nieuw scenario laden" message="Kies een gepubliceerd scenario. Klik daarna op Start om de waarden toe te passen."
      confirm-label="Laden" :loading="busy || loadingCatalogue" @cancel="pickerOpen = false" @confirm="loadScenario">
      <div class="mt-4">
        <label for="live-scenario" class="mb-2 block text-sm font-semibold">Scenario</label>
        <select id="live-scenario" v-model="selectedId" :disabled="busy || loadingCatalogue" class="w-full rounded-lg border border-gray-300 p-3 text-sm">
          <option value="">Kies een scenario</option>
          <option v-for="scenario in catalogue" :key="scenario.id" :value="scenario.id">{{ scenario.name }}</option>
        </select>
        <p v-if="!loadingCatalogue && !catalogue.length && !pickerError" class="mt-2 text-sm">Er zijn geen gepubliceerde scenario’s.</p>
        <p v-if="pickerError" role="alert" class="mt-2 text-sm text-red-700">{{ pickerError }}</p>
      </div>
    </LectorConfirmModal>
    <LectorConfirmModal :open="restartModalOpen" title="Scenario herstarten?"
      message="Wil je het scenario herstarten? De startwaarden worden opnieuw toegepast en de timer begint weer op nul."
      confirm-label="Ja, herstarten" :loading="busy" @cancel="restartModalOpen = false" @confirm="confirmRestart" />
  </section>
</template>

<style scoped>
.scenario-action {
  border: 2px solid #8e8e93;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-weight: 700;
  color: white;
  background: transparent;
}
.scenario-action:hover:not(:disabled) { background: #232327; }
.scenario-action.start { border-color: #31ee64; background: #31ee64; color: black; }
.scenario-action.start:hover:not(:disabled) { background: #65f58a; }
.scenario-action.pause { border-color: #facc15; background: #facc15; color: black; }
.scenario-action.pause:hover:not(:disabled) { background: #fde047; }
.scenario-action:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
