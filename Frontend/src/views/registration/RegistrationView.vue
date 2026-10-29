<script setup lang="ts">
import { useAuthStore } from "../../stores/Authstore";
import router from "../../router";

const store = useAuthStore();
const fieldLabels: Record<string, string> = {
  firstname: "Voornaam",
  lastname: "Achternaam",
  email: "E-mailadres",
  password: "Wachtwoord",
  passwordRepeated: "Herhaal wachtwoord",
};

async function register() {
  if (!checkPersonFields()) {
    return;
  }
  await store.registerPerson();
  if (!store.error) {
    redirectToLogin();
  }
}

function redirectToLogin() {
  router.push("/login");
}

function checkPersonFields(): boolean {
  const person = store.person;
  for (const [key, value] of Object.entries(person)) {
    if (value === "") {
      const emptyField = fieldLabels[key] || key;

      store.error = `${emptyField} is niet ingevuld`;
      store.loading = false;
      return false;
    }
  }
  return true;
}
</script>

<template>
  <div class="flex min-h-screen w-full">
    <div class="hidden shrink-0 justify-center bg-black px-10 lg:flex lg:w-1/2">
      <div class="flex w-full max-w-xl flex-col justify-between py-8 xl:py-10">
        <div>
          <img src="../../assets/pxl_logo.png" alt="PXL" />
          <div class="mt-6 h-1 w-14 bg-[#c2a86b]"></div>
          <span class="text-[#c2a86b]">HEALTHCARE - TLSC</span>
        </div>

        <div class="flex flex-col gap-5 py-8">
          <h1 class="text-4xl font-bold text-white xl:text-5xl">
            Virtuele Monitor-defibrillator
          </h1>
          <span class="text-xl text-gray-200"
            >Oefen reanimatiescenario's op een realistische patiëntmonitor,
            zonder dure hardware</span
          >
          <img
            src="../../assets/tlsc.png"
            alt="Virtuele patiëntmonitor"
            class="h-32 w-full max-w-[340px] rounded-2xl object-cover"
          />
        </div>
      </div>
    </div>

    <div
      class="registration-panel flex min-h-screen flex-1 items-center justify-center bg-white px-4 py-6 sm:px-6"
    >
      <div
        class="registration-card w-full max-w-2xl rounded-2xl bg-white p-4 sm:p-8 lg:p-10"
      >
        <div class="w-full">
          <div class="mb-6 w-full text-center">
            <h1
              class="registration-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              Account registreren
            </h1>
            <p class="mt-2 text-sm text-slate-500">
              Maak een account om toegang te krijgen tot de app. Je start als
              cursist
            </p>
          </div>

          <!-- Error message -->
          <div
            v-if="store.error"
            class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ store.error }}
          </div>

          <!-- Form -->
          <form
            v-if="!store.loading"
            class="registration-form grid grid-cols-1 gap-4 sm:grid-cols-2"
            @submit.prevent="register"
          >
            <div>
              <label
                for="firstname"
                class="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Voornaam
              </label>
              <input
                id="firstname"
                v-model="store.person.firstname"
                type="text"
                placeholder="Je voornaam"
                autocomplete="given-name"
                class="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                for="lastname"
                class="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Achternaam
              </label>
              <input
                id="lastname"
                v-model="store.person.lastname"
                type="text"
                placeholder="Je achternaam"
                autocomplete="family-name"
                class="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                for="email"
                class="mb-1.5 block text-sm font-medium text-slate-700"
              >
                E-mailadres
              </label>
              <input
                id="email"
                v-model="store.person.email"
                type="text"
                placeholder="naam@voorbeeld.be"
                autocomplete="email"
                class="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                for="password"
                class="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Wachtwoord
              </label>
              <input
                id="password"
                v-model="store.person.password"
                type="password"
                placeholder="Kies een wachtwoord"
                autocomplete="new-password"
                class="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                for="passwordRepeated"
                class="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Herhaal wachtwoord
              </label>
              <input
                id="passwordRepeated"
                v-model="store.person.passwordRepeated"
                type="password"
                placeholder="Typ je wachtwoord opnieuw"
                autocomplete="new-password"
                class="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              class="cursor-pointer w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.99] sm:col-span-2"
            >
              Account aanmaken
            </button>

            <div class="flex justify-center sm:col-span-2">
              <span class="flex justify-center">Al een account?</span>
              <span
                @click="redirectToLogin"
                class="ml-2 cursor-pointer font-bold underline"
                >Inloggen</span
              >
            </div>
          </form>

          <div
            v-else
            class="flex flex-col items-center justify-center gap-4 py-12"
            role="status"
            aria-live="polite"
          >
            <div
              class="size-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
            ></div>
            <p class="text-sm font-medium text-slate-600">
              Je account wordt aangemaakt...
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-height: 500px) and (orientation: landscape) {
  .registration-panel {
    align-items: flex-start;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .registration-card {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .registration-form {
    row-gap: 0.75rem;
  }

  .registration-heading {
    margin-bottom: 0.75rem;
  }

  .registration-form label {
    margin-bottom: 0.25rem;
  }

  .registration-form input {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
}
</style>
