<script setup lang="ts">
defineProps<{
  code: string
}>()
</script>

<template>
  <main class="min-h-screen p-6">
    <h1 class="text-2xl font-bold">
      Room {{ code }}
    </h1>

    <p class="mt-2 text-gray-600">
      Hier tonen we straks de details en status van de room.
    </p>
  </main>
</template>