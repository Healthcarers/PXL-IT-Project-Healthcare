<script setup lang="ts">
import { computed } from "vue";
import { PARAMETER_BOUNDS } from "../../../types/lector";
import RotaryDialGauge from "../RotaryDialGauge.vue";
import { useParameterStore } from "../../../stores/ParameterStore.ts";

const store = useParameterStore();
const props = withDefaults(
  defineProps<{
    modelValue: number;
    horizontal?: boolean;
  }>(),
  {
    horizontal: false,
    outOfRange: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: number];
  "out-of-range": [];
}>();

const bounds = PARAMETER_BOUNDS.spo2;
const COLOR = "#38bdf8";

const isOutOfRange = computed(
  () => props.modelValue < bounds.min || props.modelValue > bounds.max,
);

async function handleChange(spo2: number) {
  await store.changeParameters("spo2", spo2);
}

function stepBy(delta: number) {
  const next = props.modelValue + delta;
  if (next < bounds.min || next > bounds.max) {
    emit("out-of-range");
    return;
  }
  emit("update:modelValue", next);
  handleChange(next);
}
</script>

<template>
  <article
    aria-label="SpO2"
    class="rounded-2xl border bg-[#141418] p-4 transition-colors sm:p-5"
    :class="isOutOfRange ? 'border-[#ef4444]' : 'border-[#25252d]'"
  >
    <div
      class="flex h-full gap-4"
      :class="horizontal ? 'flex-row items-center' : 'flex-col justify-between'"
    >
      <div class="flex justify-center">
        <RotaryDialGauge
          :model-value="modelValue"
          :min="bounds.min"
          :max="bounds.max"
          :step="bounds.step"
          :color="COLOR"
          :size="horizontal ? 'lg' : 'sm'"
          label="SpO2 regelaar"
          @update:model-value="emit('update:modelValue', $event)"
          @out-of-range="emit('out-of-range')"
          @release="handleChange"
        />
      </div>

      <div class="flex min-w-0 flex-1 flex-col justify-center">
        <div class="flex items-baseline gap-1.5">
          <span class="text-sm font-bold text-[#38bdf8]">SpO₂</span>
          <span class="text-xs text-[#8e8e99]">{{ bounds.unit }}</span>
        </div>

        <div
          class="mt-1.5 flex gap-3"
          :class="
            horizontal ? 'flex-col items-start' : 'items-center justify-between'
          "
        >
          <span
            data-testid="spo2-value"
            class="text-3xl font-extrabold leading-none tabular-nums text-[#38bdf8] sm:text-4xl"
          >
            {{ modelValue }}
          </span>

          <div class="flex items-center gap-2">
            <button
              type="button"
              aria-label="SpO2 verlagen"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3a3a44] bg-[#1a1a20] text-lg font-medium text-white transition hover:border-white/60 hover:bg-[#23232c]"
              @click="stepBy(-bounds.step)"
            >
              −
            </button>
            <button
              type="button"
              aria-label="SpO2 verhogen"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3a3a44] bg-[#1a1a20] text-lg font-medium text-white transition hover:border-white/60 hover:bg-[#23232c]"
              @click="stepBy(bounds.step)"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
