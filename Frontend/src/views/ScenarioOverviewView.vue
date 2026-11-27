<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { scenarioService } from '../services/scenarioService'
import type { Scenario } from '../types/scenario'

const scenarios = ref<Scenario[]>([])
const loading = ref(true)
const loadError = ref('')
const deleteError = ref('')
const message = ref('')
const deleting = ref(false)

async function loadScenarios() {
  loading.value = true
  loadError.value = ''
  try {
    scenarios.value = await scenarioService.list()
  } catch {
    loadError.value = 'De opgeslagen scenario’s konden niet worden opgehaald.'
  } finally {
    loading.value = false
  }
}

async function deleteScenario(scenario: Scenario) {
  if (deleting.value ||
      !window.confirm(`Wil je "${scenario.name}" en alle bijbehorende beoordelingen definitief verwijderen?`)) return

  deleting.value = true
  deleteError.value = ''
  message.value = ''
  try {
    await scenarioService.remove(scenario.id)
    scenarios.value = scenarios.value.filter(({ id }) => id !== scenario.id)
    message.value = 'Scenario verwijderd.'
  } catch {
    deleteError.value = 'Het scenario kon niet worden verwijderd. Probeer het opnieuw.'
  } finally {
    deleting.value = false
  }
}

onMounted(loadScenarios)
</script>

<template>
  <main class="min-h-[calc(100vh-3.5rem)] bg-[#f5f3ee] px-4 py-6 text-pxl-black sm:px-8">
    <div class="mx-auto max-w-[1180px]">
      <header class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight">Scenario’s beheren</h1>
          <p class="mt-1 text-sm text-black/65">Maak scenario’s, stel de basiswaarden in en publiceer ze voor de cursisten.</p>
        </div>
        <RouterLink :to="{ name: 'scenario-new' }"
          class="rounded-lg bg-[#080808] px-4 py-3 text-sm font-bold text-white hover:bg-[#292929]">
          + Scenario toevoegen
        </RouterLink>
      </header>

      <p v-if="deleteError" role="alert" class="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{{ deleteError }}</p>
      <p v-if="message" role="status" class="mb-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-900">{{ message }}</p>
      <section aria-label="Opgeslagen scenario’s" class="rounded-2xl border border-[#e0dfdc] bg-white px-4 sm:px-6">
        <p v-if="loading" role="status" class="py-4 text-sm">Scenario’s laden…</p>
        <div v-else-if="loadError" class="flex flex-wrap items-center gap-3 py-4 text-sm">
          <p role="alert" class="text-red-800">{{ loadError }}</p>
          <button type="button" class="font-semibold underline" @click="loadScenarios">Opnieuw proberen</button>
        </div>
        <p v-else-if="!scenarios.length" class="py-4 text-sm">Er zijn nog geen scenario’s opgeslagen.</p>
        <ul v-else class="divide-y divide-black/10">
          <li v-for="scenario in scenarios" :key="scenario.id"
            class="flex flex-wrap items-center justify-between gap-3 py-4">
            <div class="min-w-0 flex-1 basis-full wrap-anywhere sm:basis-auto">
              <h2 class="font-bold">{{ scenario.name }}</h2>
              <p class="mt-0.5 text-xs text-black/65">
                HF {{ scenario.initialVitals.heartRate }} bpm ·
                BD {{ scenario.initialVitals.sysBp }}/{{ scenario.initialVitals.diasBp }} mmHg ·
                SpO₂ {{ scenario.initialVitals.spo2 }}% · AF {{ scenario.initialVitals.respRate }}/min
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:gap-3">
              <span class="rounded-full px-3 py-1 text-xs font-medium"
                :class="scenario.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'">
                {{ scenario.status === 'PUBLISHED' ? 'Gepubliceerd' : 'Concept' }}
              </span>
              <RouterLink :to="{ name: 'scenario-detail', params: { scenarioId: scenario.id } }"
                :aria-label="`${scenario.status === 'DRAFT' ? 'Bewerk' : 'Bekijk'} scenario: ${scenario.name}`"
                class="rounded-lg border border-black bg-white px-4 py-2.5 text-center text-sm font-bold hover:bg-[#ece9e2]">
                {{ scenario.status === 'DRAFT' ? 'Bewerken' : 'Bekijken' }}
              </RouterLink>
              <button type="button" :disabled="deleting" :aria-label="`Verwijder scenario: ${scenario.name}`"
                class="rounded-lg px-2 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-55"
                @click="deleteScenario(scenario)">Verwijderen</button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>
