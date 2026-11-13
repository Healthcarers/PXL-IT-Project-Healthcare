<script setup lang="ts">
const tones = {
  green: 'text-[#22c55e]',
  blue: 'text-[#38bdf8]',
  yellow: 'text-[#facc15]'
} as const

defineProps<{
  label: string
  tone: keyof typeof tones
  unit?: string
}>()
</script>

<template>
  <div class="flex min-h-0 flex-col rounded-xl border border-[#232327] bg-[#111113] px-4.5 py-3.5">
    <div class="flex shrink-0 items-baseline gap-2 text-sm font-semibold tracking-[0.02em]">
      <span :class="tones[tone]">{{ label }}</span>
      <span v-if="unit" class="text-xs font-normal text-[#6b6b73]">{{ unit }}</span>
    </div>
    <div class="relative min-h-0 flex-1">
      <slot />
    </div>
  </div>
</template>