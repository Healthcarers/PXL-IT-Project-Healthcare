<script setup lang="ts">
defineProps<{
  label: string
  value: number | null
  unit: string
}>();
</script>

<template>
  <div
      class="flex w-40 shrink-0 flex-col items-end justify-center border-l border-[rgba(255,60,60,0.18)] px-3 font-mono text-[#22c55e]"
  >
    <span class="text-[1.1rem] opacity-80">
      {{ label }}
    </span>

    <span class="text-[4rem] leading-none font-bold">
      {{ value ?? '--' }}
    </span>

    <span class="text-base opacity-80">
      {{ unit }}
    </span>
  </div>
</template>
