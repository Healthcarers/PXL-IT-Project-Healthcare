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
const DIAL_CENTER = 95
const KNOB_RADIUS = 47
const POINTER_LENGTH = 39
const TICK_RADIUS_INNER = 53
const TICK_RADIUS_OUTER = 59
const TICK_LABEL_RADIUS = 75
const HOLD_DELAY_MS = 500
const HOLD_INTERVAL_MS = 120
const POINTER_CLICK_COOLDOWN_MS = 400

const props = withDefaults(defineProps<{
  modelValue: number | null
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
let dragPointerId: number | null = null
let prevRawAngle: number | null = null
let virtualDragAngle: number | null = null
let holdDelayTimer: ReturnType<typeof setTimeout> | null = null
let holdRepeatTimer: ReturnType<typeof setInterval> | null = null
let activeHoldDirection: -1 | 1 | null = null
let activeHoldPointerId: number | null = null
let lastPointerStepTime = 0

const clampedValue = computed(() =>
  props.modelValue === null ? null : snapAndClamp(props.modelValue)
)
const canDecrease = computed(() => clampedValue.value !== null && clampedValue.value > props.min)
const canIncrease = computed(() => clampedValue.value === null || clampedValue.value < props.max)

const dialAngleDeg = computed(() => {
  if (clampedValue.value === null) return MIN_ANGLE_DEG
  if (props.max <= props.min) return 0
  const ratio = (clampedValue.value - props.min) / (props.max - props.min)
  return MIN_ANGLE_DEG + ratio * TOTAL_SWEEP_DEG
})

const dialTicks = computed(() =>
  Array.from({ length: TICK_COUNT }, (_, idx) => {
    const ratio = TICK_COUNT > 1 ? idx / (TICK_COUNT - 1) : 0
    const value = snapAndClamp(props.min + ratio * (props.max - props.min))
    const angle =
      props.max > props.min
        ? MIN_ANGLE_DEG + ((value - props.min) / (props.max - props.min)) * TOTAL_SWEEP_DEG
        : 0
    const rad = (angle * Math.PI) / 180
    return {
      value,
      angle,
      labelX: DIAL_CENTER + TICK_LABEL_RADIUS * Math.sin(rad),
      labelY: DIAL_CENTER - TICK_LABEL_RADIUS * Math.cos(rad),
    }
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

function getPointerAngleDeg(clientX: number, clientY: number): number | null {
  const el = dialRef.value
  if (!el) return null

  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const dx = clientX - centerX
  const dy = clientY - centerY
  if (dx === 0 && dy === 0) return null

  // Clockwise angle relative to 12 o'clock (-180..180 deg)
  return (Math.atan2(dx, -dy) * 180) / Math.PI
}

function emitAngle(angleDeg: number) {
  const clampedAngle = Math.min(MAX_ANGLE_DEG, Math.max(MIN_ANGLE_DEG, angleDeg))
  const ratio = (clampedAngle - MIN_ANGLE_DEG) / TOTAL_SWEEP_DEG
  emitValue(props.min + ratio * (props.max - props.min))
}

function stopDragging() {
  if (!isDragging.value) return
  isDragging.value = false
  dragPointerId = null
  prevRawAngle = null
  virtualDragAngle = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopDragging)
  window.removeEventListener('pointercancel', stopDragging)
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value || prevRawAngle === null || virtualDragAngle === null) return
  if (dragPointerId !== null && event.pointerId !== dragPointerId) return
  const rawAngle = getPointerAngleDeg(event.clientX, event.clientY)
  if (rawAngle === null) return

  // Unwrap step deltas across +/-180 deg so dragging past max/min cannot wrap to the opposite end.
  let delta = rawAngle - prevRawAngle
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360

  prevRawAngle = rawAngle
  virtualDragAngle += delta
  emitAngle(virtualDragAngle)
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return

  const rawAngle = getPointerAngleDeg(event.clientX, event.clientY)
  if (rawAngle === null) return

  isDragging.value = true
  dragPointerId = event.pointerId
  prevRawAngle = rawAngle
  virtualDragAngle = rawAngle
  emitAngle(rawAngle)

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDragging)
  window.addEventListener('pointercancel', stopDragging)
}

function clearHoldTimers() {
  if (holdDelayTimer !== null) {
    clearTimeout(holdDelayTimer)
    holdDelayTimer = null
  }
  if (holdRepeatTimer !== null) {
    clearInterval(holdRepeatTimer)
    holdRepeatTimer = null
  }
}

function stopButtonHold() {
  clearHoldTimers()
  if (activeHoldDirection === null) return
  activeHoldDirection = null
  activeHoldPointerId = null
  lastPointerStepTime = Date.now()
  window.removeEventListener('pointerup', stopButtonHold)
  window.removeEventListener('pointercancel', stopButtonHold)
}

function stepInDirection(direction: -1 | 1) {
  if (clampedValue.value === null) {
    if (direction > 0) emitValue(props.min)
    return
  }
  emitValue(clampedValue.value + direction * props.step)
}

function canStepInDirection(direction: -1 | 1): boolean {
  return direction > 0 ? canIncrease.value : canDecrease.value
}

function startButtonHold(event: PointerEvent, direction: -1 | 1) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (activeHoldPointerId !== null && event.pointerId !== activeHoldPointerId) return
  if (!canStepInDirection(direction)) return

  stopButtonHold()
  lastPointerStepTime = Date.now()
  activeHoldDirection = direction
  activeHoldPointerId = event.pointerId
  stepInDirection(direction)

  window.addEventListener('pointerup', stopButtonHold)
  window.addEventListener('pointercancel', stopButtonHold)

  holdDelayTimer = setTimeout(() => {
    holdDelayTimer = null
    if (activeHoldDirection !== direction || !canStepInDirection(direction)) {
      stopButtonHold()
      return
    }
    holdRepeatTimer = setInterval(() => {
      if (activeHoldDirection !== direction || !canStepInDirection(direction)) {
        stopButtonHold()
        return
      }
      stepInDirection(direction)
    }, HOLD_INTERVAL_MS)
  }, HOLD_DELAY_MS)
}

function onStepButtonClick(event: MouseEvent, direction: -1 | 1) {
  // Real pointer presses already stepped on pointerdown; ignore trailing synthetic click events.
  if (event.detail > 0 || Date.now() - lastPointerStepTime < POINTER_CLICK_COOLDOWN_MS) {
    return
  }
  stepInDirection(direction)
}

onUnmounted(() => {
  stopDragging()
  stopButtonHold()
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-6 sm:gap-8">
    <svg
      ref="dialRef"
      viewBox="0 0 190 190"
      class="size-44 shrink-0 cursor-pointer touch-none select-none rounded-full sm:size-52"
      role="slider"
      aria-label="Defibrillator energie in joules"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="clampedValue ?? undefined"
      :aria-valuetext="clampedValue !== null ? `${clampedValue} J` : 'Geen energie geselecteerd'"
      @pointerdown="onPointerDown"
    >
      <g>
        <g
          v-for="(tick, idx) in dialTicks"
          :key="idx"
        >
          <line
            :x1="DIAL_CENTER"
            :y1="DIAL_CENTER - TICK_RADIUS_OUTER"
            :x2="DIAL_CENTER"
            :y2="DIAL_CENTER - TICK_RADIUS_INNER"
            :stroke="tick.value === clampedValue ? '#facc15' : '#6b6b76'"
            stroke-width="2"
            stroke-linecap="round"
            :transform="`rotate(${tick.angle} ${DIAL_CENTER} ${DIAL_CENTER})`"
          />
          <text
            :x="tick.labelX"
            :y="tick.labelY"
            data-testid="dial-tick-label"
            text-anchor="middle"
            dominant-baseline="central"
            font-size="11.5"
            font-weight="600"
            :fill="tick.value === clampedValue ? '#facc15' : '#a1a1aa'"
            class="pointer-events-none select-none tabular-nums"
          >
            {{ tick.value }}
          </text>
        </g>
      </g>

      <circle
        :cx="DIAL_CENTER"
        :cy="DIAL_CENTER"
        :r="KNOB_RADIUS"
        fill="#0b0b0d"
        stroke="#facc15"
        stroke-width="3.5"
      />

      <g :transform="`rotate(${dialAngleDeg} ${DIAL_CENTER} ${DIAL_CENTER})`">
        <line
          :x1="DIAL_CENTER"
          :y1="DIAL_CENTER"
          :x2="DIAL_CENTER"
          :y2="DIAL_CENTER - POINTER_LENGTH"
          stroke="#facc15"
          stroke-width="4"
          stroke-linecap="round"
        />
      </g>

      <circle :cx="DIAL_CENTER" :cy="DIAL_CENTER" r="6" fill="#facc15" />
    </svg>

    <div class="flex flex-col gap-2.5">
      <div
        data-testid="energy-value"
        class="font-extrabold leading-none tabular-nums text-[#facc15] text-[clamp(36px,4.5vw,56px)]"
      >
        {{ clampedValue !== null ? `${clampedValue} J` : '-- J' }}
      </div>

      <div class="mt-1 flex items-center gap-2">
        <button
          type="button"
          :disabled="!canDecrease"
          :aria-label="`Verlaag energie met ${step} J`"
          class="flex h-9 min-w-10 touch-none select-none cursor-pointer items-center justify-center rounded-lg border border-[#2f2f37] bg-[#18181c] px-3 text-lg font-bold text-white transition-colors hover:border-[#facc15] hover:text-[#facc15] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[#2f2f37] disabled:hover:text-white"
          @pointerdown="startButtonHold($event, -1)"
          @pointerleave="stopButtonHold"
          @contextmenu.prevent
          @click="onStepButtonClick($event, -1)"
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
          class="flex h-9 min-w-10 touch-none select-none cursor-pointer items-center justify-center rounded-lg border border-[#2f2f37] bg-[#18181c] px-3 text-lg font-bold text-white transition-colors hover:border-[#facc15] hover:text-[#facc15] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[#2f2f37] disabled:hover:text-white"
          @pointerdown="startButtonHold($event, 1)"
          @pointerleave="stopButtonHold"
          @contextmenu.prevent
          @click="onStepButtonClick($event, 1)"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>
