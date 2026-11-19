<script setup lang="ts">
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: number;
    min: number;
    max: number;
    step?: number;
    color: string;
    label: string;
    size?: "sm" | "lg";
  }>(),
  {
    step: 1,
    size: "sm",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: number];
  "out-of-range": [];
}>();

const START_ANGLE = 135;
const SWEEP_ANGLE = 270;
const CX = 70;
const CY = 70;
const RADIUS = 52;

const svgRef = ref<SVGSVGElement | null>(null);
const dragging = ref(false);

function polarToCartesian(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + RADIUS * Math.cos(rad),
    y: CY + RADIUS * Math.sin(rad),
  };
}

function describeArc(startDeg: number, endDeg: number): string {
  if (endDeg - startDeg <= 0.01) return "";
  const start = polarToCartesian(startDeg);
  const end = polarToCartesian(endDeg);
  const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const clampedFraction = computed(() => {
  const span = props.max - props.min;
  if (span <= 0) return 0;
  const raw = (props.modelValue - props.min) / span;
  return Math.min(1, Math.max(0, raw));
});

const currentAngle = computed(
  () => START_ANGLE + clampedFraction.value * SWEEP_ANGLE,
);

const trackPath = describeArc(START_ANGLE, START_ANGLE + SWEEP_ANGLE);

const activePath = computed(() =>
  describeArc(START_ANGLE, currentAngle.value),
);

const knobPosition = computed(() => polarToCartesian(currentAngle.value));

const sizeClass = computed(() =>
  props.size === "lg"
    ? "h-36 w-36 sm:h-40 sm:w-40"
    : "h-28 w-28 sm:h-32 sm:w-32",
);

function quantizeAndClamp(raw: number): number {
  const decimals = props.step.toString().includes(".")
    ? props.step.toString().split(".")[1]!.length
    : 0;
  const stepped =
    Math.round((raw - props.min) / props.step) * props.step + props.min;
  const clamped = Math.min(props.max, Math.max(props.min, stepped));
  return Number(clamped.toFixed(decimals));
}

function updateFromPointer(clientX: number, clientY: number) {
  const svg = svgRef.value;
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clientX - centerX;
  const dy = clientY - centerY;

  const rawDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const deg = (rawDeg + 360) % 360;
  let rel = (deg - START_ANGLE + 360) % 360;

  const deadZoneMid = SWEEP_ANGLE + (360 - SWEEP_ANGLE) / 2;
  if (rel > SWEEP_ANGLE) {
    rel = rel < deadZoneMid ? SWEEP_ANGLE : 0;
  }

  const fraction = rel / SWEEP_ANGLE;
  const nextVal = quantizeAndClamp(
    props.min + fraction * (props.max - props.min),
  );
  emit("update:modelValue", nextVal);
}

function handlePointerDown(event: PointerEvent) {
  dragging.value = true;
  const target = event.currentTarget as Element | null;
  if (target && "setPointerCapture" in target) {
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // Ignore in environments without pointer capture support
    }
  }
  updateFromPointer(event.clientX, event.clientY);
}

function handlePointerMove(event: PointerEvent) {
  if (!dragging.value) return;
  updateFromPointer(event.clientX, event.clientY);
}

function handlePointerUp() {
  dragging.value = false;
}

function handleKeydown(event: KeyboardEvent) {
  let delta = 0;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    delta = props.step;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    delta = -props.step;
  } else if (event.key === "Home") {
    event.preventDefault();
    emit("update:modelValue", props.min);
    return;
  } else if (event.key === "End") {
    event.preventDefault();
    emit("update:modelValue", props.max);
    return;
  } else {
    return;
  }

  event.preventDefault();
  const rawNext = props.modelValue + delta;
  if (rawNext < props.min || rawNext > props.max) {
    emit("out-of-range");
    return;
  }
  emit("update:modelValue", quantizeAndClamp(rawNext));
}
</script>

<template>
  <svg
    ref="svgRef"
    viewBox="0 0 140 140"
    :class="sizeClass"
    class="shrink-0 select-none touch-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-full"
    role="slider"
    tabindex="0"
    :aria-label="label"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="modelValue"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
    @keydown="handleKeydown"
  >
    <!-- Track arc -->
    <path
      :d="trackPath"
      fill="none"
      stroke="#32323a"
      stroke-width="17"
      stroke-linecap="butt"
    />

    <!-- Active colored arc -->
    <path
      v-if="activePath"
      :d="activePath"
      fill="none"
      :stroke="color"
      stroke-width="17"
      stroke-linecap="butt"
    />

    <!-- Inner dark disc -->
    <circle cx="70" cy="70" r="39" fill="#09090b" />

    <!-- Center pulse waveform icon -->
    <polyline
      points="54,70 61,70 64,65 67,76 71,56 75,74 78,70 86,70"
      fill="none"
      :stroke="color"
      stroke-width="2.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Dial thumb / knob -->
    <circle
      :cx="knobPosition.x"
      :cy="knobPosition.y"
      r="7.5"
      fill="#ffffff"
      stroke="#09090b"
      stroke-width="2.5"
    />
  </svg>
</template>
