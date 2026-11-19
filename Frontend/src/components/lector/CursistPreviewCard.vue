<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { connected } from "../../services/stompClient";
import PatientMonitorGrid from "../charts/PatientMonitorGrid.vue";

const STAGE_WIDTH = 1120;
const STAGE_HEIGHT = 700;

const props = defineProps<{
  collapsed: boolean;
}>();

const emit = defineEmits<{
  "toggle-collapse": [];
}>();

const viewportRef = ref<HTMLElement | null>(null);
const scale = ref(0.5);
let resizeObserver: ResizeObserver | null = null;

function updateScale() {
  const el = viewportRef.value;
  if (!el) return;
  const width = el.clientWidth;
  if (width > 0) {
    scale.value = width / STAGE_WIDTH;
  }
}

function attachObserver() {
  disconnectObserver();
  if (typeof ResizeObserver === "undefined" || !viewportRef.value) {
    updateScale();
    return;
  }
  resizeObserver = new ResizeObserver(() => {
    updateScale();
  });
  resizeObserver.observe(viewportRef.value);
  updateScale();
}

function disconnectObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
}

onMounted(() => {
  if (!props.collapsed) {
    attachObserver();
  }
});

watch(
  () => props.collapsed,
  (isCollapsed) => {
    if (isCollapsed) {
      disconnectObserver();
    } else {
      void nextTick(() => attachObserver());
    }
  },
);

onUnmounted(() => {
  disconnectObserver();
});
</script>

<template>
  <button
    v-if="collapsed"
    type="button"
    class="inline-flex w-fit items-center gap-2 rounded-xl border border-[#3a3a44] bg-[#0e0e11] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-[#17171d]"
    @click="emit('toggle-collapse')"
  >
    <span aria-hidden="true">›</span>
    <span>Cursistscherm tonen</span>
  </button>

  <section
    v-show="!collapsed"
    aria-label="Wat de cursist ziet"
    class="rounded-2xl border border-[#222228] bg-[#0e0e11] p-4 sm:p-5"
  >
    <div class="mb-3.5 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <h2 class="!m-0 text-base font-bold text-white">
          Wat de cursist ziet
        </h2>

        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider transition-colors"
          :class="connected ? 'bg-[#ef4444] text-white' : 'bg-[#ef4444]/40 text-white/80'"
          :title="connected ? 'Live verbonden met de monitor' : 'Monitor live-verbinding niet actief'"
        >
          LIVE
        </span>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl border border-[#3a3a44] bg-[#141419] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:border-white/60 hover:bg-[#1c1c23]"
        @click="emit('toggle-collapse')"
      >
        <span aria-hidden="true">‹</span>
        <span>Inklappen</span>
      </button>
    </div>

    <div
      ref="viewportRef"
      class="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-[#1f1f26] bg-[#050506]"
    >
      <div
        class="pointer-events-none absolute left-0 top-0 origin-top-left"
        :style="{
          width: `${STAGE_WIDTH}px`,
          height: `${STAGE_HEIGHT}px`,
          transform: `scale(${scale})`,
        }"
      >
        <PatientMonitorGrid :preview="true" class="h-full w-full" />
      </div>
    </div>
  </section>
</template>
