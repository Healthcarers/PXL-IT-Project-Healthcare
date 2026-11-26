<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  PARAMETER_BOUNDS,
  type Parameters,
  type ParameterKey,
} from "../../types/lector";
import HeartRateControlCard from "./parameters/HeartRateControlCard.vue";
import { useParameterStore } from "../../stores/ParameterStore.ts";
import Spo2ControlCard from "./parameters/Spo2ControlCard.vue";

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
</script>

<template>
  <section
    aria-label="Parameters (realtime)"
    class="flex flex-col rounded-2xl border border-[#222228] bg-[#0e0e11] p-4 sm:p-5"
  >
    <div class="mb-4">
      <h2 class="!m-0 text-base font-bold text-white">Parameters (realtime)</h2>
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
      class="mb-4 flex items-center gap-3.5 rounded-xl border-2 border-[#ef4444] bg-[#fee2e2] px-4 py-3 text-[#b91c1c] shadow-md"
    >
      <span
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ef4444] text-sm font-extrabold text-white"
        aria-hidden="true"
      >
        !
      </span>
      <p class="!m-0 text-sm font-medium leading-snug text-[#b91c1c]">
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

      <Spo2ControlCard
        :model-value="props.parameters.spo2"
        :horizontal="expanded"
        :out-of-range="outOfRangeKey === 'spo2'"
        @update:model-value="updateParam('spo2', $event)"
        @out-of-range="handleOutOfRange('spo2')"
      />
    </div>
  </section>
</template>
