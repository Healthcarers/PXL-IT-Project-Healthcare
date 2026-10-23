<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-6">
    <section class="text-center space-y-4">
      <h1 class="text-3xl font-bold">Healthcare Simulator</h1>

      <p class="text-gray-600">
        Maak een room aan om een simulatie te starten.
      </p>

      <button
        class="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
        @click="router.push({ name: 'create-room' })"
      >
        Room aanmaken
      </button>
    </section>
  </main>
</template>