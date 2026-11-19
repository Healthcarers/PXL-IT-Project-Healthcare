<script setup lang="ts">
import { ref } from 'vue'
import type { ScenarioPlaybackState } from '../../types/lector'

withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const playbackState = ref<ScenarioPlaybackState>('running')
const scenarioTitle = ref('Ventrikelfibrillatie na collaps')
const elapsedLabel = ref('04:12 / 12:00')

function setPlayback(state: ScenarioPlaybackState) {
  playbackState.value = state
}

function handleRestart() {
  playbackState.value = 'running'
  elapsedLabel.value = '00:00 / 12:00'
}
</script>

<template>
  <section
    aria-label="Scenario"
    class="rounded-2xl border border-[#222228] bg-[#0e0e11] p-4 sm:p-5"
  >
    <div :class="compact ? 'space-y-1' : 'flex items-start justify-between gap-4'">
      <div class="min-w-0">
        <p class="!m-0 text-xs font-medium text-[#8e8e99]">Scenario</p>
        <h2 class="!m-0 mt-1 text-base font-bold leading-snug text-white">
          {{ scenarioTitle }}
        </h2>
      </div>

      <p
        class="!m-0 shrink-0 font-mono text-xs tabular-nums text-[#8e8e99] sm:text-sm"
        :class="compact ? 'pt-0.5' : 'pt-4'"
      >
        {{ elapsedLabel }}
      </p>
    </div>

    <div
      class="mt-4 flex flex-wrap items-center gap-2.5"
      :class="{ 'grid grid-cols-3': compact }"
    >
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#22c55e] px-3.5 py-2.5 text-xs font-bold text-[#052e16] transition hover:bg-[#34d36b] sm:text-sm"
        :class="{ 'ring-2 ring-[#22c55e]/50': playbackState === 'running' }"
        @click="setPlayback('running')"
      >
        <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M4 2.75L13 8L4 13.25V2.75Z" />
        </svg>
        <span>Start</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-xl border bg-[#141419] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:border-white/60 hover:bg-[#1c1c23] sm:text-sm"
        :class="playbackState === 'paused' ? 'border-white' : 'border-[#3a3a44]'"
        @click="setPlayback('paused')"
      >
        <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <rect x="3.5" y="3" width="3" height="10" rx="0.6" />
          <rect x="9.5" y="3" width="3" height="10" rx="0.6" />
        </svg>
        <span>Pauze</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-xl border bg-[#141419] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:border-white/60 hover:bg-[#1c1c23] sm:text-sm"
        :class="playbackState === 'stopped' ? 'border-white' : 'border-[#3a3a44]'"
        @click="setPlayback('stopped')"
      >
        <svg class="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <rect x="3" y="3" width="10" height="10" rx="1.2" />
        </svg>
        <span>Stop</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#3a3a44] bg-[#141419] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:border-white/60 hover:bg-[#1c1c23] sm:text-sm"
        :class="{ 'col-span-2 w-fit': compact }"
        @click="handleRestart"
      >
        <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="M3.5 8a4.5 4.5 0 1 0 1.2-3.1L3 6.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M3 3.2v3.3h3.3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Herstarten</span>
      </button>
    </div>

    <div class="mt-3">
      <button
        type="button"
        class="rounded-xl border border-[#3a3a44] bg-[#141419] px-4 py-2.5 text-xs font-semibold text-white transition hover:border-white/60 hover:bg-[#1c1c23] sm:text-sm"
        :class="{ 'w-full': compact }"
      >
        Nieuw scenario laden
      </button>
    </div>
  </section>
</template>
