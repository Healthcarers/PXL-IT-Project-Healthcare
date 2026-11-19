<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import {
  DEFIB_ENERGY_STEP,
  MAX_DEFIB_ENERGY,
  MIN_DEFIB_ENERGY,
} from '../../stores/defibStore.ts'

const MIN_ANGLE_DEG = -135
const MAX_ANGLE_DEG = 135
const TOTAL_SWEEP_DEG = MAX_ANGLE_DEG - MIN_ANGLE_DEG
const TICK_COUNT = 8

const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
}>(), {
  min: MIN_DEFIB_ENERGY,
  max: MAX_DEFIB_ENERGY,
  step: DEFIB_ENERGY_STEP,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const dialRef = ref<SVGSVGElement | null>(null)
const isDragging = ref(false)

const clampedValue = computed(() => snapAndClamp(props.modelValue))
const canDecrease = computed(() => clampedValue.value > props.min)
const canIncrease = computed(() => clampedValue.value < props.max)

const dialAngleDeg = computed(() => {
  if (props.max <= props.min) return 0
  const ratio = (clampedValue.value - props.min) / (props.max - props.min)
  return MIN_ANGLE_DEG + ratio * TOTAL_SWEEP_DEG
})

const tickAngles = computed(() =>
  Array.from({ length: TICK_COUNT }, (_, idx) => {
    const ratio = idx / (TICK_COUNT - 1)
    return MIN_ANGLE_DEG + ratio * TOTAL_SWEEP_DEG
  })
)

function snapAndClamp(value: number): number {
  if (!Number.isFinite(value)) return props.min
  const steps = Math.round((value - props.min) / props.step)
  const snapped = props.min + steps * props.step
  return Math.min(props.max, Math.max(props.min, snapped))
}

function emitValue(value: number) {
  const next = snapAndClamp(value)
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
  }
}

function updateFromPointer(clientX: number, clientY: number) {
  const el = dialRef.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const dx = clientX - centerX
  const dy = clientY - centerY
  if (dx === 0 && dy === 0) return

  // Clockwise angle relative to 12 o'clock (-180..180 deg)
  const rawAngleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI
  const clampedAngle = Math.min(MAX_ANGLE_DEG, Math.max(MIN_ANGLE_DEG, rawAngleDeg))
  const ratio = (clampedAngle - MIN_ANGLE_DEG) / TOTAL_SWEEP_DEG
  emitValue(props.min + ratio * (props.max - props.min))
}

function stopDragging() {
  if (!isDragging.value) return
  isDragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopDragging)
  window.removeEventListener('pointercancel', stopDragging)
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  updateFromPointer(event.clientX, event.clientY)
}

function onPointerDown(event: PointerEvent) {
  isDragging.value = true
  dialRef.value?.focus()
  updateFromPointer(event.clientX, event.clientY)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDragging)
  window.addEventListener('pointercancel', stopDragging)
}

function onWheel(event: WheelEvent) {
  if (event.deltaY === 0) return
  const direction = event.deltaY < 0 ? 1 : -1
  emitValue(clampedValue.value + direction * props.step)
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowRight':
      event.preventDefault()
      emitValue(clampedValue.value + props.step)
      break
    case 'ArrowDown':
    case 'ArrowLeft':
      event.preventDefault()
      emitValue(clampedValue.value - props.step)
      break
    case 'Home':
      event.preventDefault()
      emitValue(props.min)
      break
    case 'End':
      event.preventDefault()
      emitValue(props.max)
      break
  }
}

onUnmounted(stopDragging)
</script>

<template>
  <div class="flex flex-wrap items-center gap-6 sm:gap-8">
    <svg
      ref="dialRef"
      viewBox="0 0 140 140"
      class="size-32 shrink-0 cursor-pointer touch-none select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#facc15]/60 sm:size-36"
      role="slider"
      tabindex="0"
      aria-label="Defibrillator energie in joules"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="clampedValue"
      :aria-valuetext="`${clampedValue} J`"
      @pointerdown="onPointerDown"
      @wheel.prevent="onWheel"
      @keydown="onKeydown"
    >
      <g>
        <line
          v-for="(angle, idx) in tickAngles"
          :key="idx"
          x1="70"
          y1="8"
          x2="70"
          y2="14"
          stroke="#4b4b55"
          stroke-width="2"
          stroke-linecap="round"
          :transform="`rotate(${angle} 70 70)`"
        />
      </g>

      <circle
        cx="70"
        cy="70"
        r="50"
        fill="#0b0b0d"
        stroke="#facc15"
        stroke-width="3.5"
      />

      <g :transform="`rotate(${dialAngleDeg} 70 70)`">
        <line
          x1="70"
          y1="70"
          x2="70"
          y2="29"
          stroke="#facc15"
          stroke-width="4"
          stroke-linecap="round"
        />
      </g>

      <circle cx="70" cy="70" r="6" fill="#facc15" />
    </svg>

    <div class="flex flex-col gap-2.5">
      <div
        data-testid="energy-value"
        class="font-extrabold leading-none tabular-nums text-[#facc15] text-[clamp(36px,4.5vw,56px)]"
      >
        {{ clampedValue }} J
      </div>

      <p class="text-xs text-[#8b8b94] sm:text-sm">
        Draai aan de knop om de energie te kiezen
      </p>

      <div class="mt-1 flex items-center gap-2">
        <button
          type="button"
          :disabled="!canDecrease"
          :aria-label="`Verlaag energie met ${step} J`"
          class="flex h-9 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-[#2f2f37] bg-[#18181c] px-3 text-lg font-bold text-white transition-colors hover:border-[#facc15] hover:text-[#facc15] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[#2f2f37] disabled:hover:text-white"
          @click="emitValue(clampedValue - step)"
        >
          -
        </button>

        <span class="min-w-14 text-center text-xs font-medium text-[#8b8b94] tabular-nums">
          ±{{ step }} J
        </span>

        <button
          type="button"
          :disabled="!canIncrease"
          :aria-label="`Verhoog energie met ${step} J`"
          class="flex h-9 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-[#2f2f37] bg-[#18181c] px-3 text-lg font-bold text-white transition-colors hover:border-[#facc15] hover:text-[#facc15] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[#2f2f37] disabled:hover:text-white"
          @click="emitValue(clampedValue + step)"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>
