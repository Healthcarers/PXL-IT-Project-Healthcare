<script setup lang="ts">
import {useVitals} from "../../composables/useVitals.ts";
import {computed, onBeforeUnmount, ref} from "vue";
import MonitorCard from "./MonitorCard.vue";

const props = withDefaults(defineProps<{
  preview?: boolean;
}>(), {
  preview: false,
});

const MEASURE_DELAY_MS = 5000;

interface NibpValue {
  sys: number;
  dias: number;
}

const { vitals } = useVitals();

const measuring = ref(false);
const reading = ref<NibpValue | null>(null);

let alive = true;
onBeforeUnmount(() => {
  alive = false;
});

function currentNibp(): NibpValue | null {
  const v = vitals.value;
  if (v?.sysBp == null || v?.diasBp == null) return null;
  return { sys: v.sysBp, dias: v.diasBp };
}

const shown = computed(() =>
  props.preview ? currentNibp() : reading.value
);

const display = computed(() =>
  shown.value ? `${shown.value.sys}/${shown.value.dias}` : '--'
);

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function measure(): Promise<void> {
  if (measuring.value) return;
  measuring.value = true;

  try {
    await delay(MEASURE_DELAY_MS);
    if (alive) reading.value = currentNibp();
  } finally {
    if (alive) measuring.value = false;
  }
}
</script>

<template>
  <MonitorCard label="NIBP" tone="red" unit="mmHg">
    <div class="flex h-full flex-col justify-between">
      <div class="flex flex-1 items-center">
        <span
            class="font-extrabold leading-none tabular-nums text-[#ff0707]"
            :class="[
            preview ? 'text-[46px]' : 'text-[clamp(40px,5vw,72px)]',
            { 'animate-pulse': measuring },
          ]"
        >
          {{ display }}
        </span>
      </div>

      <button
          v-if="!preview"
          type="button"
          class="self-start rounded-md border border-[#ff0707] px-3 py-1 text-xs text-[#ff0707] transition-colors hover:bg-[#ff0707]/10 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="measuring"
          @click="measure"
      >
        {{ measuring ? 'Aan het meten...' : 'Neem meting' }}
      </button>
    </div>
  </MonitorCard>
</template>
