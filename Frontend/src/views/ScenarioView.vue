<script setup lang="ts">
import axios from "axios";
import { reactive, ref, watch } from "vue";
import type { VitalsResponse } from "../types/vitals";
import type { Scenario, ScenarioStatus } from "../types/scenario";
import {
  scenarioService,
} from "../services/scenarioService";

const props = defineProps<{ scenarioId?: string }>();

const defaults: VitalsResponse = {
  heartRate: 75,
  spo2: 98,
  etco2: 38,
  respRate: 15,
  ampScale: 1,
  sysBp: 120,
  diasBp: 80,
};
const fields = [
  { key: "heartRate", label: "HF (bpm)", min: 0, max: 220 },
  { key: "spo2", label: "SpO₂ (%)", min: 50, max: 100 },
  { key: "etco2", label: "etCO₂ (mmHg)", min: 0, max: 100 },
  {
    key: "sysBp",
    label: "Systolische bloeddruk (mmHg)",
    min: 0,
    max: 300,
  },
  {
    key: "diasBp",
    label: "Diastolische bloeddruk (mmHg)",
    min: 0,
    max: 300,
  },
  { key: "respRate", label: "AF (/min)", min: 0, max: 60 },
  { key: "ampScale", label: "Amplitude", min: 0.1, max: 3 },
] as const;

const vitals = reactive<Record<keyof VitalsResponse, number | string>>({
  ...defaults,
});
const name = ref("");
const description = ref("");
const feedbackItems = ref<string[]>([]);
const newItem = ref("");
const savedScenario = ref<Scenario>();
const loading = ref(false);
const loadError = ref("");
const saving = ref(false);
const message = ref("");
const error = ref("");
let version = 0;

function addItem() {
  const item = newItem.value.trim();
  if (!item || feedbackItems.value.length >= 100) return;
  feedbackItems.value.push(item);
  newItem.value = "";
}

function resetForm() {
  name.value = "";
  description.value = "";
  Object.assign(vitals, defaults);
  feedbackItems.value = [];
  newItem.value = "";
  savedScenario.value = undefined;
  error.value = "";
}

function failure(cause: unknown, fallback: string) {
  const data = axios.isAxiosError(cause) ? cause.response?.data : null;
  return typeof data === "string" && data.trim() ? data : fallback;
}

async function save(event: SubmitEvent) {
  if (
    saving.value ||
    loading.value ||
    loadError.value ||
    savedScenario.value?.status === "PUBLISHED"
  )
    return;
  const status: ScenarioStatus =
    event.submitter?.id === "save-draft" ? "DRAFT" : "PUBLISHED";
  error.value = "";
  message.value = "";
  if (!name.value.trim() || !description.value.trim()) {
    error.value = "Vul de titel en beschrijving in.";
    return;
  }
  if (newItem.value.trim()) {
    error.value = "Voeg het getypte feedbackitem eerst toe aan de checklist.";
    return;
  }
  if (!feedbackItems.value.length) {
    error.value = "Voeg minstens één feedbackitem toe.";
    return;
  }
  const { heartRate, spo2, etco2, respRate, ampScale, sysBp, diasBp } =
    vitals;
  if (
    typeof heartRate !== "number" ||
    typeof spo2 !== "number" ||
    typeof etco2 !== "number" ||
    typeof respRate !== "number" ||
    typeof ampScale !== "number" ||
    typeof sysBp !== "number" ||
    typeof diasBp !== "number"
  ) {
    error.value = "Vul alle basiswaarden in.";
    return;
  }

  const request = version;
  saving.value = true;
  try {
    const scenario = await scenarioService.save(
      {
        name: name.value.trim(),
        description: description.value.trim(),
        initialVitals: {
          heartRate,
          spo2,
          etco2,
          respRate,
          ampScale,
          sysBp: sysBp,
          diasBp: diasBp,
        },
        feedbackItems: [...feedbackItems.value],
        status,
      },
      savedScenario.value?.id,
    );
    if (request !== version) return;
    savedScenario.value = scenario;
    message.value =
      scenario.status === "DRAFT"
        ? "Scenario opgeslagen als concept."
        : "Scenario opgeslagen en gepubliceerd.";
  } catch (cause) {
    if (request === version)
      error.value = failure(
        cause,
        "Het scenario kon niet worden opgeslagen. Probeer het opnieuw.",
      );
  } finally {
    if (request === version) saving.value = false;
  }
}

watch(
  () => props.scenarioId,
  async (id, _, onCleanup) => {
    const request = version;
    onCleanup(() => {
      version++;
    });
    resetForm();
    message.value = "";
    loadError.value = "";
    saving.value = false;
    loading.value = !!id;
    if (!id) return;
    try {
      const scenario = await scenarioService.get(id);
      if (request !== version) return;
      savedScenario.value = scenario;
      name.value = scenario.name;
      description.value = scenario.description;
      Object.assign(vitals, scenario.initialVitals);
      feedbackItems.value = [...scenario.feedbackItems];
    } catch (cause) {
      if (request === version)
        loadError.value = failure(
          cause,
          "Het scenario kon niet worden opgehaald.",
        );
    } finally {
      if (request === version) loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <main
    class="min-h-[calc(100vh-3.5rem)] bg-[#f5f3ee] px-4 py-6 text-pxl-black sm:px-8"
  >
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight">
            {{
              savedScenario?.status === "PUBLISHED"
                ? "Gepubliceerd scenario"
                : scenarioId || savedScenario
                  ? "Concept bewerken"
                  : "Scenario toevoegen"
            }}
          </h1>
          <p v-if="!loading && !loadError" class="mt-1 text-sm text-black/65">
            {{
              savedScenario?.status === "PUBLISHED"
                ? "Een gepubliceerd scenario kan niet meer worden gewijzigd."
                : "Velden met * zijn verplicht."
            }}
          </p>
        </div>
        <RouterLink :to="{ name: 'scenarios' }" class="action"
          >Terug naar overzicht</RouterLink
        >
      </div>

      <p v-if="loading" role="status">Scenario laden…</p>
      <p
        v-else-if="loadError"
        role="alert"
        class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800"
      >
        {{ loadError }}
      </p>
      <form v-else class="space-y-4" @submit.prevent="save">
        <fieldset
          :disabled="saving || savedScenario?.status === 'PUBLISHED'"
          class="grid min-w-0 items-start gap-4 lg:grid-cols-2"
        >
          <section aria-label="Scenariogegevens" class="card grid gap-3">
            <div class="grid">
              <label for="scenario-name">Titel *</label>
              <input
                id="scenario-name"
                v-model="name"
                required
                maxlength="255"
                placeholder="Bv. Monitorsimulatie"
              />
            </div>
            <div class="grid">
              <label for="scenario-description">Beschrijving *</label>
              <textarea
                id="scenario-description"
                v-model="description"
                rows="3"
                required
                maxlength="1000"
                placeholder="Beschrijf de oefensituatie"
              ></textarea>
            </div>
          </section>

          <section class="card space-y-3" aria-labelledby="vitals-heading">
            <h2 id="vitals-heading" class="font-bold">Basiswaarden *</h2>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div
                v-for="field in fields"
                :key="field.key"
                class="flex flex-col justify-end"
              >
                <label :for="`vital-${field.key}`">{{ field.label }}</label>
                <input
                  :id="`vital-${field.key}`"
                  v-model.number="vitals[field.key]"
                  type="number"
                  step="any"
                  :min="field.min"
                  :max="field.max"
                  required
                />
              </div>
            </div>

            <h2 class="font-bold">Feedbackitems *</h2>
            <ul
              v-if="feedbackItems.length"
              class="space-y-2"
              aria-label="Feedbackitems"
            >
              <li
                v-for="(item, index) in feedbackItems"
                :key="index"
                class="flex items-center justify-between gap-3 rounded-lg bg-[#f5f3ee] px-3 py-1.5 text-sm"
              >
                <span class="min-w-0 wrap-anywhere">{{ item }}</span>
                <button
                  v-if="savedScenario?.status !== 'PUBLISHED'"
                  type="button"
                  class="shrink-0 rounded px-2 py-1 text-xl leading-none text-red-700 hover:bg-red-100"
                  :aria-label="`Verwijder feedbackitem ${index + 1}: ${item}`"
                  @click="feedbackItems.splice(index, 1)"
                >
                  ×
                </button>
              </li>
            </ul>
            <div
              v-if="savedScenario?.status !== 'PUBLISHED'"
              class="flex flex-wrap gap-2 sm:flex-nowrap"
            >
              <label for="new-feedback" class="sr-only"
                >Nieuw feedbackitem</label
              >
              <input
                id="new-feedback"
                v-model="newItem"
                class="min-w-0 flex-1"
                maxlength="500"
                :disabled="feedbackItems.length >= 100"
                placeholder="Nieuw feedbackitem..."
                @keydown.enter.prevent="addItem"
              />
              <button
                type="button"
                class="action"
                :disabled="!newItem.trim() || feedbackItems.length >= 100"
                @click="addItem"
              >
                Toevoegen
              </button>
            </div>
          </section>
        </fieldset>

        <div
          v-if="savedScenario?.status !== 'PUBLISHED'"
          class="flex flex-wrap gap-2"
        >
          <RouterLink v-if="!saving" :to="{ name: 'scenarios' }" class="action"
            >Annuleren</RouterLink
          >
          <button
            id="save-draft"
            type="submit"
            class="action"
            :disabled="saving"
          >
            Opslaan als concept
          </button>
          <button type="submit" class="action primary" :disabled="saving">
            {{ saving ? "Bezig met opslaan…" : "Opslaan en publiceren" }}
          </button>
        </div>
        <p
          v-if="error"
          role="alert"
          class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {{ error }}
        </p>
        <p
          v-if="message"
          role="status"
          class="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-900"
        >
          {{ message }}
        </p>
      </form>
    </div>
  </main>
</template>

<style scoped>
.card {
  border: 1px solid #e0dfdc;
  border-radius: 1rem;
  background: white;
  padding: 1rem;
}

label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
}

input,
textarea {
  width: 100%;
  min-height: 2.5rem;
  border: 1px solid #d5d4d1;
  border-radius: 0.5rem;
  background: #fdfdfd;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

textarea {
  resize: vertical;
}

.action {
  min-height: 2.5rem;
  border: 1px solid #111;
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
}

.action:hover:not(:disabled) {
  background: #ece9e2;
}

.action.primary {
  background: #080808;
  color: white;
}

.action.primary:hover:not(:disabled) {
  background: #292929;
}

.action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
