<script setup lang="ts">
import type { AdminStatCard as AdminStatCardModel } from "../../types/admin";
import AdminStatCard from "./AdminStatCard.vue";

defineProps<{
  cards: AdminStatCardModel[];
}>();
</script>

<template>
  <section
    aria-label="Systeemstatistieken"
    class="grid grid-cols-1 gap-5 sm:grid-cols-3"
  >
    <AdminStatCard v-for="card in cards" :key="card.id" :card="card" />
  </section>
</template>
