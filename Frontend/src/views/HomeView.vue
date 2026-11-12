
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const code = ref('')
const error = ref('')

function openRoom() {
  const roomCode = code.value.trim().toUpperCase()

  if (!roomCode) {
    error.value = 'Vul een roomcode in.'
    return
  }

  router.push({
    name: 'room',
    params: { code: roomCode },
  })
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-[#f7f5f0] px-4 py-10 text-black">
    <section class="w-full max-w-xl rounded-2xl border border-[#d6d5d2] bg-white p-8 sm:p-12">
      <div class="mb-6 h-1 w-14 bg-[#ae9a64]"></div>

      <h1 class="text-3xl font-extrabold tracking-tight">
        Healthcare Simulator
      </h1>

      <p class="mt-3 text-gray-500">
        Start een nieuwe simulatie of neem deel aan een bestaande room.
      </p>

      <button
        class="mt-8 w-full rounded-lg bg-black px-5 py-4 font-bold text-white transition hover:bg-gray-800"
        @click="router.push({ name: 'create-room' })"
      >
        Nieuwe room aanmaken
      </button>

      <div class="my-8 flex items-center gap-4">
        <div class="h-px flex-1 bg-gray-200"></div>
        <span class="text-xs font-bold uppercase tracking-wider text-gray-400">Of</span>
        <div class="h-px flex-1 bg-gray-200"></div>
      </div>

      <form class="space-y-4" @submit.prevent="openRoom">
        <label for="code" class="block text-sm font-semibold">
          Deelnemen met een roomcode
        </label>

        <input
          id="code"
          v-model="code"
          maxlength="6"
          autocomplete="off"
          placeholder="Bijvoorbeeld ABC123"
          class="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono uppercase tracking-widest outline-none focus:border-[#ae9a64] focus:ring-2 focus:ring-[#ae9a64]/20"
        />

        <p v-if="error" class="text-sm text-red-700" role="alert">
          {{ error }}
        </p>

        <button
          type="submit"
          class="w-full rounded-lg border border-gray-300 px-5 py-3 font-bold transition hover:bg-gray-50"
        >
          Room openen
        </button>
      </form>
    </section>
  </main>
</template>
