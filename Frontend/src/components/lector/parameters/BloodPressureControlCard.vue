<script setup lang="ts">
import { computed, ref } from "vue";
import {
  PARAMETER_BOUNDS,
  type BloodPressureTarget,
} from "../../../types/lector";
import RotaryDialGauge from "../RotaryDialGauge.vue";

const props = withDefaults(
  defineProps<{
    sysIbp: number;
    diasIbp: number;
    horizontal?: boolean;
    outOfRange?: boolean;
  }>(),
  {
    horizontal: false,
    outOfRange: false,
  },
);

const emit = defineEmits<{
  "update:sysIbp": [value: number];
  "update:diasIbp": [value: number];
  "out-of-range": [target: BloodPressureTarget];
}>();

const bounds = PARAMETER_BOUNDS.sysIbp;
const COLOR = "#ef4444";

const activeTarget = ref<BloodPressureTarget>("sysIbp");

const activeValue = computed(() =>
  activeTarget.value === "sysIbp" ? props.sysIbp : props.diasIbp,
);

const isOutOfRange = computed(
  () =>
    props.outOfRange ||
    props.sysIbp < bounds.min ||
    props.sysIbp > bounds.max ||
    props.diasIbp < bounds.min ||
    props.diasIbp > bounds.max,
);

function updateActiveValue(nextValue: number) {
  if (activeTarget.value === "sysIbp") {
    emit("update:sysIbp", nextValue);
  } else {
    emit("update:diasIbp", nextValue);
  }
}

function stepBy(delta: number) {
  const next = activeValue.value + delta;
  if (next < bounds.min || next > bounds.max) {
    emit("out-of-range", activeTarget.value);
    return;
  }
  updateActiveValue(next);
}
</script>

<template>
  <article
    aria-label="Bloeddruk"
    class="rounded-2xl border bg-[#141418] p-4 transition-colors sm:p-5"
    :class="isOutOfRange ? 'border-[#ef4444]' : 'border-[#25252d]'"
  >
    <div
      class="flex h-full gap-4"
      :class="horizontal ? 'flex-row items-center' : 'flex-col justify-between'"
    >
      <div class="flex justify-center">
        <RotaryDialGauge
          :model-value="activeValue"
          :min="bounds.min"
          :max="bounds.max"
          :step="bounds.step"
          :color="COLOR"
          :size="horizontal ? 'lg' : 'sm'"
          :label="
            activeTarget === 'sysIbp'
              ? 'Systolische bloeddruk regelaar'
              : 'Diastolische bloeddruk regelaar'
          "
          @update:model-value="updateActiveValue"
          @out-of-range="emit('out-of-range', activeTarget)"
        />
      </div>

      <div class="flex min-w-0 flex-1 flex-col justify-center">
        <div class="flex items-baseline gap-1.5">
          <span class="text-sm font-bold text-[#ef4444]">Bloeddruk</span>
          <span class="text-xs text-[#8e8e99]">{{ bounds.unit }}</span>
        </div>

        <div
          class="mt-1.5 flex gap-3"
          :class="horizontal ? 'flex-col items-start' : 'items-center justify-between'"
        >
          <div class="flex items-center gap-1">
            <button
              type="button"
              data-testid="bp-systolic"
              :aria-pressed="activeTarget === 'sysIbp'"
              aria-label="Selecteer systolische bloeddruk"
              class="rounded-lg px-2 py-0.5 text-2xl font-extrabold leading-none tabular-nums transition sm:text-3xl"
              :class="
                activeTarget === 'sysIbp'
                  ? 'border border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]'
                  : 'border border-transparent text-[#9ca3af] hover:text-white'
              "
              @click="activeTarget = 'sysIbp'"
            >
              {{ sysIbp }}
            </button>

            <span class="text-2xl font-bold text-[#71717a]" aria-hidden="true">/</span>

            <button
              type="button"
              data-testid="bp-diastolic"
              :aria-pressed="activeTarget === 'diasIbp'"
              aria-label="Selecteer diastolische bloeddruk"
              class="rounded-lg px-2 py-0.5 text-2xl font-extrabold leading-none tabular-nums transition sm:text-3xl"
              :class="
                activeTarget === 'diasIbp'
                  ? 'border border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]'
                  : 'border border-transparent text-[#9ca3af] hover:text-white'
              "
              @click="activeTarget = 'diasIbp'"
            >
              {{ diasIbp }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              aria-label="Bloeddruk verlagen"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3a3a44] bg-[#1a1a20] text-lg font-medium text-white transition hover:border-white/60 hover:bg-[#23232c]"
              @click="stepBy(-bounds.step)"
            >
              −
            </button>
            <button
              type="button"
              aria-label="Bloeddruk verhogen"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3a3a44] bg-[#1a1a20] text-lg font-medium text-white transition hover:border-white/60 hover:bg-[#23232c]"
              @click="stepBy(bounds.step)"
            >
              +
            </button>
          </div>
        </div>

        <p
          class="!m-0 mt-2 text-xs font-medium"
          :class="isOutOfRange ? 'text-[#ef4444]' : 'text-[#8e8e99]'"
        >
          {{ isOutOfRange ? bounds.outOfRangeLabel : bounds.rangeLabel }}
        </p>
      </div>
    </div>
  </article>
</template>
