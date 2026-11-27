<script setup lang="ts">
const tones = {
  green: 'text-[#22c55e]',
  blue: 'text-[#38bdf8]',
  yellow: 'text-[#facc15]',
  red: 'text-[#ff0707]',
} as const

defineProps<{
  label: string
  tone: keyof typeof tones
  unit?: string
}>()
</script>

<template>
  <div class="flex min-h-0 flex-col rounded-xl border border-[#232327] bg-[#111113] p-2.5 sm:px-3 sm:py-2.5 lg:px-4.5 lg:py-3.5">
    <div class="flex shrink-0 items-baseline gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold tracking-[0.02em]">
      <span :class="tones[tone]">{{ label }}</span>
      <span v-if="unit" class="text-[11px] sm:text-xs font-normal text-[#6b6b73]">{{ unit }}</span>
    </div>
    <div class="relative min-h-0 flex-1 overflow-hidden">
      <slot />
    </div>
  </div>
</template>