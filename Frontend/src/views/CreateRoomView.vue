<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRoom } from '../composables/useRoom'

const router = useRouter()
const { loading, error, createRoom } = useRoom()

const name = ref('')
const description = ref('')

async function handleCreateRoom() {
  if (!name.value.trim()) {
    return
  }

  try {
    const room = await createRoom({
      name: name.value.trim(),
      description: description.value.trim() || null,
    })

    router.replace({
      name: 'host-dashboard',
      params: { code: room.code },
    })
  } catch {
    // De foutmelding wordt bijgehouden door useRoom().
  }
}
</script>

<template>
  <main class="flex min-h-screen w-full items-center justify-center bg-[#f7f5f0] px-4 py-10 text-[#171717]">
    <section
      class="w-full max-w-[560px] rounded-[17px] border border-[#d6d5d2] bg-white px-6 py-8 shadow-sm sm:px-12 sm:py-12">
      <div class="mb-6 h-1 w-14 rounded-full bg-[#ae9a64]"></div>

      <h1 class="!m-0 !text-[#08060d] text-[30px] font-extrabold leading-tight tracking-[-1px]">
        Room aanmaken
      </h1>

      <p class="mb-7 mt-3 text-[15px] leading-7 text-[#555555]">
        Maak een room aan en deel de code met je cursisten, zodat ze kunnen
        deelnemen.
      </p>

      <form class="space-y-6" @submit.prevent="handleCreateRoom">
        <div>
          <label for="name" class="mb-2 block text-sm font-bold text-[#262626]">
            Naam van de room
          </label>

          <input id="name" v-model="name" required maxlength="100" autocomplete="off"
            placeholder="Bv. Reanimatie groep 2B"
            class="h-[52px] w-full rounded-[9px] border border-[#b8b8b8] bg-white px-4 text-[15px] text-[#171717] placeholder:text-[#777777] outline-none transition focus:border-[#ae9a64] focus:ring-2 focus:ring-[#ae9a64]/20" />
        </div>

        <div>
          <label for="description" class="mb-2 block text-sm font-bold text-[#262626]">
            Opdracht voor de cursisten
          </label>

          <textarea id="description" v-model="description" rows="3" maxlength="1000"
            placeholder="Bv. Herken het ritme en handel juist"
            class="min-h-[90px] w-full resize-y rounded-[9px] border border-[#b8b8b8] bg-white px-4 py-3 text-[15px] leading-6 text-[#171717] placeholder:text-[#777777] outline-none transition focus:border-[#ae9a64] focus:ring-2 focus:ring-[#ae9a64]/20" />
        </div>

        <p v-if="error" role="alert"
          class="!m-0 rounded-md border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
          {{ error }}
        </p>

        <button type="submit" :disabled="loading"
          class="flex h-[51px] w-full items-center justify-center rounded-[9px] bg-[#050505] px-5 text-sm font-bold text-white transition hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50">
          {{ loading ? 'Room wordt aangemaakt...' : 'Room aanmaken' }}
        </button>
      </form>
    </section>
  </main>
</template>
