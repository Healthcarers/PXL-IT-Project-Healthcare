<script setup lang="ts">
import { computed, ref } from 'vue'
import { PARAMETER_BOUNDS, type CapnoRespMode } from '../../../types/lector'
import RotaryDialGauge from '../RotaryDialGauge.vue'

const props = withDefaults(defineProps<{
  etco2: number
  respRate: number
  horizontal?: boolean
  outOfRangeMode?: CapnoRespMode | null
}>(), {
  horizontal: false,
  outOfRangeMode: null,
})

const emit = defineEmits<{
  'update:etco2': [value: number]
  'update:respRate': [value: number]
  'out-of-range': [mode: CapnoRespMode]
}>()

const mode = ref<CapnoRespMode>('etco2')

const currentBounds = computed(() =>
  mode.value === 'etco2' ? PARAMETER_BOUNDS.etco2 : PARAMETER_BOUNDS.respRate,
)

const currentValue = computed(() =>
  mode.value === 'etco2' ? props.etco2 : props.respRate,
)

const currentColor = computed(() =>
  mode.value === 'etco2' ? '#facc15' : '#ffffff',
)

const isOutOfRange = computed(() => {
  const b = currentBounds.value
  return (
    props.outOfRangeMode === mode.value ||
    currentValue.value < b.min ||
    currentValue.value > b.max
  )
})

function updateCurrentValue(nextValue: number) {
  if (mode.value === 'etco2') {
    emit('update:etco2', nextValue)
  } else {
    emit('update:respRate', nextValue)
  }
}

function stepBy(delta: number) {
  const b = currentBounds.value
  const next = currentValue.value + delta
  if (next < b.min || next > b.max) {
    emit('out-of-range', mode.value)
    return
  }
  updateCurrentValue(next)
}
</script>

<template>
  <article
    aria-label="etCO2 en ademhalingsfrequentie"
    class="rounded-2xl border bg-[#141418] p-4 transition-colors sm:p-5"
    :class="isOutOfRange ? 'border-[#ef4444]' : 'border-[#25252d]'"
  >
    <div
      class="flex h-full gap-4"
      :class="horizontal ? 'flex-row items-center' : 'flex-col justify-between'"
    >
      <div class="flex justify-center">
        <RotaryDialGauge
          :model-value="currentValue"
          :min="currentBounds.min"
          :max="currentBounds.max"
          :step="currentBounds.step"
          :color="currentColor"
          :size="horizontal ? 'lg' : 'sm'"
          :label="
            mode === 'etco2' ? 'etCO2 regelaar' : 'Ademhalingsfrequentie regelaar'
          "
          @update:model-value="updateCurrentValue"
          @out-of-range="emit('out-of-range', mode)"
        />
      </div>

      <div class="flex min-w-0 flex-1 flex-col justify-center">
        <div class="flex items-center gap-3.5" role="radiogroup" aria-label="Kies etCO2 of ademhalingsfrequentie">
          <button
            type="button"
            role="radio"
            :aria-checked="mode === 'etco2'"
            class="inline-flex items-center gap-1.5 text-sm transition"
            :class="mode === 'etco2' ? 'font-bold text-[#facc15]' : 'font-medium text-[#8e8e99] hover:text-white'"
            @click="mode = 'etco2'"
          >
            <span
              class="h-2.5 w-2.5 rounded-full"
              :class="mode === 'etco2' ? 'bg-[#facc15]' : 'border border-[#8e8e99]'"
              aria-hidden="true"
            />
            <span>etCO₂</span>
          </button>

          <button
            type="button"
            role="radio"
            :aria-checked="mode === 'af'"
            class="inline-flex items-center gap-1.5 text-sm transition"
            :class="mode === 'af' ? 'font-bold text-white' : 'font-medium text-[#8e8e99] hover:text-white'"
            @click="mode = 'af'"
          >
            <span
              class="h-2.5 w-2.5 rounded-full"
              :class="mode === 'af' ? 'bg-white' : 'border border-[#8e8e99]'"
              aria-hidden="true"
            />
            <span>AF</span>
          </button>
        </div>

        <div
          class="mt-1.5 flex gap-3"
          :class="horizontal ? 'flex-col items-start' : 'items-center justify-between'"
        >
          <div class="flex items-baseline gap-1.5">
            <span
              data-testid="capno-resp-value"
              class="text-3xl font-extrabold leading-none tabular-nums sm:text-4xl"
              :class="mode === 'etco2' ? 'text-[#facc15]' : 'text-white'"
            >
              {{ currentValue }}
            </span>
            <span class="text-xs text-[#8e8e99]">{{ currentBounds.unit }}</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              :aria-label="mode === 'etco2' ? 'etCO2 verlagen' : 'Ademhalingsfrequentie verlagen'"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3a3a44] bg-[#1a1a20] text-lg font-medium text-white transition hover:border-white/60 hover:bg-[#23232c]"
              @click="stepBy(-currentBounds.step)"
            >
              −
            </button>
            <button
              type="button"
              :aria-label="mode === 'etco2' ? 'etCO2 verhogen' : 'Ademhalingsfrequentie verhogen'"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3a3a44] bg-[#1a1a20] text-lg font-medium text-white transition hover:border-white/60 hover:bg-[#23232c]"
              @click="stepBy(currentBounds.step)"
            >
              +
            </button>
          </div>
        </div>

        <p
          class="!m-0 mt-2 text-xs font-medium"
          :class="isOutOfRange ? 'text-[#ef4444]' : 'text-[#8e8e99]'"
        >
          {{ isOutOfRange ? currentBounds.outOfRangeLabel : currentBounds.rangeLabel }}
        </p>
      </div>
    </div>
  </article>
</template>
