
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRoom } from '../composables/useRoom'

const router = useRouter()
const { currentRoom, loading, error, createRoom, closeRoom, clearRoom } =
  useRoom()

const name = ref('')
const description = ref('')

async function handleCreateRoom() {
  if (!name.value.trim()) {
    return
  }

  try {
    await createRoom({
      name: name.value.trim(),
      description: description.value.trim() || null,
    })
  } catch {
    // De foutmelding wordt bijgehouden door useRooms().
  }
}

async function handleCloseRoom() {
  try {
    await closeRoom()
  } catch {
    // De foutmelding wordt bijgehouden door useRooms().
  }
}

function resetForm() {
  clearRoom()
  name.value = ''
  description.value = ''
}

function goToNewRoom() {
  resetForm()
  router.push({ name: 'create-room' })
}
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center bg-[#f7f5f0] px-4 py-10 text-black"
  >
    <section
      class="w-full max-w-[560px] rounded-[17px] border border-[#d6d5d2] bg-white px-6 py-8 sm:px-12 sm:py-12"
      aria-labelledby="page-title"
    >
      <div class="mb-6 h-1 w-14 bg-[#ae9a64]"></div>

      <template v-if="!currentRoom">
        <h1
          id="page-title"
          class="text-[30px] font-extrabold leading-tight tracking-[-1px] sm:text-[32px]"
        >
          Room aanmaken
        </h1>

        <p class="mb-6 mt-2 text-[16px] leading-6 text-[#858585]">
          Maak een room aan en deel de code met je cursisten, zodat ze kunnen joinen.
        </p>

        <form class="space-y-6" @submit.prevent="handleCreateRoom">
          <div>
            <label for="name" class="mb-2 block text-sm font-semibold">
              Naam van de room
            </label>

            <input
              id="name"
              v-model="name"
              required
              maxlength="100"
              autocomplete="off"
              placeholder="Bv. Reanimatie groep 2B"
              class="h-[52px] w-full rounded-[9px] border border-[#c9c9cc] bg-white px-4 text-[15px] outline-none transition placeholder:text-[#858585] focus:border-[#ae9a64] focus:ring-2 focus:ring-[#ae9a64]/20"
            />
          </div>

          <div>
            <label for="description" class="mb-2 block text-sm font-semibold">
              Opdracht voor de cursisten
            </label>

            <textarea
              id="description"
              v-model="description"
              rows="1"
              maxlength="1000"
              placeholder="Bv. Herken het ritme en handel juist"
              class="min-h-[52px] w-full resize-y rounded-[9px] border border-[#c9c9cc] bg-white px-4 py-3 text-[15px] outline-none transition placeholder:text-[#858585] focus:border-[#ae9a64] focus:ring-2 focus:ring-[#ae9a64]/20"
            />
          </div>

          <p
            v-if="error"
            role="alert"
            class="rounded-md border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {{ error }}
          </p>

          <button
            type="submit"
            :disabled="loading"
            class="flex h-[51px] w-full items-center justify-center rounded-[9px] bg-[#050505] px-5 text-sm font-bold text-white transition hover:bg-[#292929] focus:outline-none focus:ring-2 focus:ring-[#ae9a64] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ loading ? 'Room wordt aangemaakt...' : 'Room aanmaken' }}
          </button>
        </form>
      </template>

      <template v-else>
        <h1
          id="page-title"
          class="text-[30px] font-extrabold leading-tight tracking-[-1px] sm:text-[32px]"
        >
          Room aangemaakt
        </h1>

        <p class="mb-6 mt-2 text-[16px] leading-6 text-[#858585]">
          Deel de code met je cursisten, zodat ze kunnen joinen.
        </p>

        <div class="space-y-5">
          <div class="rounded-[9px] border border-[#d6d5d2] bg-[#f8f7f4] p-5">
            <p class="mb-2 text-xs font-bold uppercase tracking-wider text-[#777]">
              Roomcode
            </p>

            <p class="font-mono text-3xl font-bold tracking-[0.2em]">
              {{ currentRoom.code }}
            </p>
          </div>

          <div>
            <p class="mb-1 text-xs font-bold uppercase tracking-wider text-[#777]">
              Naam van de room
            </p>
            <p class="font-semibold">{{ currentRoom.name }}</p>
          </div>

          <div v-if="currentRoom.description">
            <p class="mb-1 text-xs font-bold uppercase tracking-wider text-[#777]">
              Opdracht voor de cursisten
            </p>

            <p class="whitespace-pre-wrap text-sm leading-relaxed">
              {{ currentRoom.description }}
            </p>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-sm font-semibold">Status van de room</span>

            <span
              class="rounded-full px-3 py-2 text-xs font-extrabold"
              :class="currentRoom.status === 'OPEN'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'"
            >
              {{ currentRoom.status === 'OPEN' ? 'OPEN' : 'GESLOTEN' }}
            </span>
          </div>
        </div>

        <p
          v-if="error"
          role="alert"
          class="mt-5 rounded-md border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {{ error }}
        </p>

        <button
          v-if="currentRoom.status === 'OPEN'"
          type="button"
          :disabled="loading"
          class="mt-6 flex min-h-[51px] w-full items-center justify-center rounded-[9px] border border-red-700 bg-white px-5 py-3 text-sm font-bold text-red-800 transition hover:bg-red-50 disabled:opacity-50"
          @click="handleCloseRoom"
        >
          {{ loading ? 'Room wordt gesloten...' : 'Room sluiten' }}
        </button>

        <p
          v-else
          class="mt-5 rounded-md border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Deze room is gesloten. Deelnemers kunnen deze sessie niet meer starten.
        </p>

        <button
          type="button"
          class="mt-4 flex min-h-[51px] w-full items-center justify-center rounded-[9px] bg-[#050505] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#292929]"
          @click="goToNewRoom"
        >
          + Nieuwe room aanmaken
        </button>
      </template>
    </section>
  </main>
</template>
