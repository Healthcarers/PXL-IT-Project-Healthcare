<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  ECG_RHYTHMS,
  PARAMETER_BOUNDS,
  type EcgRhythm,
  type Parameters,
  type ParameterKey,
} from "../../types/lector";
import HeartRateControlCard from "./parameters/HeartRateControlCard.vue";
import { useParameterStore } from "../../stores/ParameterStore.ts";

const store = useParameterStore();

const props = withDefaults(
  defineProps<{
    parameters: Parameters;
    expanded?: boolean;
  }>(),
  {
    expanded: false,
  },
);

const emit = defineEmits<{
  "update:parameters": [value: Parameters];
}>();

onMounted(async () => {
  const params = await store.getParameters();
  if (params !== null) emit("update:parameters", params);
});

const rhythmOpen = ref(false);
const rhythmMenuRef = ref<HTMLElement | null>(null);
const outOfRangeKey = ref<ParameterKey | null>(null);

const activeErrorMessage = computed<string | null>(() => {
  if (!outOfRangeKey.value) return null;
  return PARAMETER_BOUNDS[outOfRangeKey.value].errorMessage;
});

function handleOutOfRange(key: ParameterKey) {
  outOfRangeKey.value = key;
}

function updateParam<K extends keyof Parameters>(
  field: K,
  value: Parameters[K],
) {
  outOfRangeKey.value = null;
  emit("update:parameters", {
    ...props.parameters,
    [field]: value,
  });
}

function selectRhythm(rhythm: EcgRhythm) {
  updateParam("rhythm", rhythm);
  rhythmOpen.value = false;
}

function handleDocumentClick(event: MouseEvent) {
  if (!rhythmOpen.value) return;
  const target = event.target as Node | null;
  if (rhythmMenuRef.value && target && !rhythmMenuRef.value.contains(target)) {
    rhythmOpen.value = false;
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && rhythmOpen.value) {
    rhythmOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleDocumentKeydown);
});
</script>

<template>
  <section
    aria-label="Parameters (realtime)"
    class="flex flex-col rounded-2xl border border-[#222228] bg-[#0e0e11] p-4 sm:p-5"
  >
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="!m-0 text-base font-bold text-white">Parameters (realtime)</h2>

      <div ref="rhythmMenuRef" class="relative">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-[#3a3a44] bg-[#141419] px-3.5 py-2 text-xs font-semibold text-white transition hover:border-white/60 hover:bg-[#1c1c23] sm:text-sm"
          aria-haspopup="listbox"
          :aria-expanded="rhythmOpen"
          @click.stop="rhythmOpen = !rhythmOpen"
        >
          <span>Ritme: {{ props.parameters.rhythm }}</span>
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
              :aria-selected="props.parameters.rhythm === rhythm"
              class="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition"
              :class="
                props.parameters.rhythm === rhythm
                  ? 'bg-[#22c55e]/15 font-semibold text-[#22c55e]'
                  : 'text-[#e4e4e7] hover:bg-white/5'
              "
              @click="selectRhythm(rhythm)"
            >
              <span>{{ rhythm }}</span>
              <span v-if="props.parameters.rhythm === rhythm" aria-hidden="true"
                >✓</span
              >
            </button>
          </li>
        </ul>
      </div>
    </div>

    <p
      v-if="store.error"
      role="alert"
      class="mb-4 rounded-xl border border-[#ef4444] bg-[#ef4444]/10 px-4 py-3 text-sm text-[#fca5a5]"
    >
      {{ store.error }}
    </p>

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
        :model-value="props.parameters.heartRate"
        :horizontal="expanded"
        :out-of-range="outOfRangeKey === 'heartRate'"
        @update:model-value="updateParam('heartRate', $event)"
        @out-of-range="handleOutOfRange('heartRate')"
      />
    </div>
  </section>
</template>
