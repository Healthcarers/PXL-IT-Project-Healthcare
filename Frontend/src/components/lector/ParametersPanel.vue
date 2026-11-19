<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  ECG_RHYTHMS,
  PARAMETER_BOUNDS,
  type EcgRhythm,
  type LectorParameters,
  type ParameterKey,
} from '../../types/lector'
import BloodPressureControlCard from './parameters/BloodPressureControlCard.vue'
import CapnoRespControlCard from './parameters/CapnoRespControlCard.vue'
import HeartRateControlCard from './parameters/HeartRateControlCard.vue'
import Spo2ControlCard from './parameters/Spo2ControlCard.vue'
import TemperatureControlCard from './parameters/TemperatureControlCard.vue'

const props = withDefaults(defineProps<{
  parameters: LectorParameters
  expanded?: boolean
}>(), {
  expanded: false,
})

const emit = defineEmits<{
  'update:parameters': [value: LectorParameters]
}>()

const rhythmOpen = ref(false)
const rhythmMenuRef = ref<HTMLElement | null>(null)
const outOfRangeKey = ref<ParameterKey | null>(null)

const activeErrorMessage = computed<string | null>(() => {
  if (!outOfRangeKey.value) return null
  return PARAMETER_BOUNDS[outOfRangeKey.value].errorMessage
})

const capnoOutOfRangeMode = computed(() => {
  if (outOfRangeKey.value === 'etco2') return 'etco2'
  if (outOfRangeKey.value === 'respRate') return 'af'
  return null
})

function handleOutOfRange(key: ParameterKey) {
  outOfRangeKey.value = key
}

function updateParam<K extends keyof LectorParameters>(
  field: K,
  value: LectorParameters[K],
) {
  outOfRangeKey.value = null
  emit('update:parameters', {
    ...props.parameters,
    [field]: value,
  })
}

function selectRhythm(rhythm: EcgRhythm) {
  updateParam('rhythm', rhythm)
  rhythmOpen.value = false
}

function handleDocumentClick(event: MouseEvent) {
  if (!rhythmOpen.value) return
  const target = event.target as Node | null
  if (rhythmMenuRef.value && target && !rhythmMenuRef.value.contains(target)) {
    rhythmOpen.value = false
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && rhythmOpen.value) {
    rhythmOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<template>
  <section
    aria-label="Parameters (realtime)"
    class="flex flex-col rounded-2xl border border-[#222228] bg-[#0e0e11] p-4 sm:p-5"
  >
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="!m-0 text-base font-bold text-white">
        Parameters (realtime)
      </h2>

      <div ref="rhythmMenuRef" class="relative">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-[#3a3a44] bg-[#141419] px-3.5 py-2 text-xs font-semibold text-white transition hover:border-white/60 hover:bg-[#1c1c23] sm:text-sm"
          aria-haspopup="listbox"
          :aria-expanded="rhythmOpen"
          @click.stop="rhythmOpen = !rhythmOpen"
        >
          <span>Ritme: {{ parameters.rhythm }}</span>
          <svg
            class="h-3 w-3 transition-transform"
            :class="{ 'rotate-180': rhythmOpen }"
            viewBox="0 0 12 12"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M2.5 4.25L6 7.75L9.5 4.25H2.5Z" />
          </svg>
        </button>

        <ul
          v-if="rhythmOpen"
          role="listbox"
          aria-label="ECG-ritme kiezen"
          class="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-[#32323c] bg-[#141419] py-1 shadow-2xl"
        >
          <li v-for="rhythm in ECG_RHYTHMS" :key="rhythm">
            <button
              type="button"
              role="option"
              :aria-selected="parameters.rhythm === rhythm"
              class="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition"
              :class="
                parameters.rhythm === rhythm
                  ? 'bg-[#22c55e]/15 font-semibold text-[#22c55e]'
                  : 'text-[#e4e4e7] hover:bg-white/5'
              "
              @click="selectRhythm(rhythm)"
            >
              <span>{{ rhythm }}</span>
              <span v-if="parameters.rhythm === rhythm" aria-hidden="true">✓</span>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div
      v-if="activeErrorMessage"
      role="alert"
      data-testid="parameter-range-alert"
      class="mb-4 flex items-center gap-3.5 rounded-xl border-2 border-[#ef4444] bg-white px-4 py-3 text-[#0b0b0d] shadow-md"
    >
      <span
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ef4444] text-sm font-extrabold text-white"
        aria-hidden="true"
      >
        !
      </span>
      <p class="!m-0 text-sm font-medium leading-snug text-[#18181b]">
        {{ activeErrorMessage }}
      </p>
    </div>

    <div class="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
      <HeartRateControlCard
        :model-value="parameters.heartRate"
        :horizontal="expanded"
        :out-of-range="outOfRangeKey === 'heartRate'"
        @update:model-value="updateParam('heartRate', $event)"
        @out-of-range="handleOutOfRange('heartRate')"
      />

      <Spo2ControlCard
        :model-value="parameters.spo2"
        :horizontal="expanded"
        :out-of-range="outOfRangeKey === 'spo2'"
        @update:model-value="updateParam('spo2', $event)"
        @out-of-range="handleOutOfRange('spo2')"
      />

      <BloodPressureControlCard
        :systolic="parameters.systolicBp"
        :diastolic="parameters.diastolicBp"
        :horizontal="expanded"
        :out-of-range="outOfRangeKey === 'bloodPressure'"
        @update:systolic="updateParam('systolicBp', $event)"
        @update:diastolic="updateParam('diastolicBp', $event)"
        @out-of-range="handleOutOfRange('bloodPressure')"
      />

      <CapnoRespControlCard
        :etco2="parameters.etco2"
        :resp-rate="parameters.respRate"
        :horizontal="expanded"
        :out-of-range-mode="capnoOutOfRangeMode"
        @update:etco2="updateParam('etco2', $event)"
        @update:resp-rate="updateParam('respRate', $event)"
        @out-of-range="handleOutOfRange($event === 'etco2' ? 'etco2' : 'respRate')"
      />
    </div>

    <div class="mt-4">
      <TemperatureControlCard
        :model-value="parameters.temperature"
        :out-of-range="outOfRangeKey === 'temperature'"
        @update:model-value="updateParam('temperature', $event)"
        @out-of-range="handleOutOfRange('temperature')"
      />
    </div>
  </section>
</template>
