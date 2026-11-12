<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
      <div class="mb-4 text-7xl font-bold text-red-500">401</div>

      <h1 class="mb-3 text-2xl font-bold text-gray-800">Niet geautoriseerd</h1>

      <p class="mb-8 text-gray-600 leading-relaxed">
        Je hebt geen toegang tot deze pagina. Log opnieuw in om verder te gaan.
      </p>

      <button
        @click="goToLogin"
        class="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Terug naar login
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

function goToLogin() {
  router.push("/login");
}
</script>
