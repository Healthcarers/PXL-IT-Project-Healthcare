<script setup lang="ts">
import { computed } from 'vue'
import { PARAMETER_BOUNDS } from '../../../types/lector'

const props = withDefaults(defineProps<{
  modelValue: number
  outOfRange?: boolean
}>(), {
  outOfRange: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'out-of-range': []
}>()

const bounds = PARAMETER_BOUNDS.temperature

const isOutOfRange = computed(
  () => props.outOfRange || props.modelValue < bounds.min || props.modelValue > bounds.max,
)

const formattedValue = computed(() =>
  props.modelValue.toFixed(1).replace('.', ','),
)

function stepBy(delta: number) {
  const next = Number((props.modelValue + delta).toFixed(1))
  if (next < bounds.min || next > bounds.max) {
    emit('out-of-range')
    return
  }
  emit('update:modelValue', next)
}
</script>

<template>
  <article
    aria-label="Temperatuur"
    class="rounded-2xl border bg-[#141418] px-4 py-3.5 transition-colors sm:px-5 sm:py-4"
    :class="isOutOfRange ? 'border-[#ef4444]' : 'border-[#25252d]'"
  >
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-sm font-bold text-white">Temperatuur</span>
          <span class="text-xs text-[#8e8e99]">{{ bounds.unit }}</span>
        </div>
        <p
          class="!m-0 mt-0.5 text-xs font-medium"
          :class="isOutOfRange ? 'text-[#ef4444]' : 'text-[#8e8e99]'"
        >
          {{ isOutOfRange ? bounds.outOfRangeLabel : bounds.rangeLabel }}
        </p>
      </div>

      <div class="flex items-center gap-4">
        <span
          data-testid="temp-value"
          class="text-3xl font-extrabold leading-none tabular-nums text-[#fb923c]"
        >
          {{ formattedValue }}
        </span>

        <div class="flex items-center gap-2">
          <button
            type="button"
            aria-label="Temperatuur verlagen"
            class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3a3a44] bg-[#1a1a20] text-lg font-medium text-white transition hover:border-white/60 hover:bg-[#23232c]"
            @click="stepBy(-bounds.step)"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Temperatuur verhogen"
            class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3a3a44] bg-[#1a1a20] text-lg font-medium text-white transition hover:border-white/60 hover:bg-[#23232c]"
            @click="stepBy(bounds.step)"
          >
            +
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
