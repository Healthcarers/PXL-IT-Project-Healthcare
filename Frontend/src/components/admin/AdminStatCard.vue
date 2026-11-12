<script setup lang="ts">
import type { AdminStatCard } from "../../types/admin";

defineProps<{
  card: AdminStatCard;
}>();
</script>

<template>
  <article
    class="rounded-xl border border-pxl-black/10 bg-pxl-white px-6 py-5 shadow-[0_1px_2px_rgba(3,2,3,0.03)]"
  >
    <div class="mb-4 h-[2px] w-7 bg-pxl-gold" aria-hidden="true"></div>
    <p class="font-body text-xs text-pxl-black/60">
      {{ card.title }}
    </p>
    <p class="font-heading mt-1.5 text-3xl leading-none text-pxl-black sm:text-4xl">
      {{ card.value }}
    </p>
  </article>
</template>
