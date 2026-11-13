<script setup lang="ts">
import { useAuthStore } from "../../stores/Authstore";
import router from "../../router";
import SplashScreenComponent from "../../components/SplashScreenComponent.vue";

const store = useAuthStore();
const fieldLabels: Record<string, string> = {
  email: "E-mailadres",
  password: "Wachtwoord",
};

async function login() {
  if (!checkPersonFields()) {
    return;
  }
  await store.login();
}

function redirectToRegistration() {
  router.push("/registration");
}

function checkPersonFields(): boolean {
  const person = store.personLogin;
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
    <SplashScreenComponent />

    <div
      class="login-panel flex min-h-screen flex-1 items-center justify-center bg-white px-4 py-6 sm:px-6"
    >
      <div
        class="login-card w-full max-w-2xl rounded-2xl bg-white p-4 sm:p-8 lg:p-10"
      >
        <div class="w-full">
          <div class="mb-6 w-full text-center">
            <h1
              class="login-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              Inloggen
            </h1>
            <p class="mt-2 text-sm text-slate-500">
              Log in om verder te gaan als cursist, lector of beheerder
            </p>
          </div>

          <!-- Error message -->
          <div
            v-if="store.error"
            class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ store.error }}
          </div>

          <form
            v-if="!store.loading"
            class="login-form grid grid-cols-1 gap-4 sm:grid-cols-2"
            @submit.prevent="login"
          >
            <div>
              <label
                for="email"
                class="mb-1.5 block text-sm font-medium text-slate-700"
              >
                E-mailadres
              </label>
              <input
                id="email"
                v-model="store.personLogin.email"
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
                v-model="store.personLogin.password"
                type="password"
                placeholder="Kies een wachtwoord"
                autocomplete="new-password"
                class="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              class="cursor-pointer w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.99] sm:col-span-2"
            >
              Login
            </button>

            <div class="flex justify-center sm:col-span-2">
              <span class="flex justify-center">Nog geen account? </span>
              <span
                @click="redirectToRegistration"
                class="ml-2 cursor-pointer font-bold underline"
                >Registreren</span
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
              Bezig met inloggen...
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-height: 500px) and (orientation: landscape) {
  .login-panel {
    align-items: flex-start;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .login-card {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .login-form {
    row-gap: 0.75rem;
  }

  .login-heading {
    margin-bottom: 0.75rem;
  }

  .login-form label {
    margin-bottom: 0.25rem;
  }

  .login-form input {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
}
</style>
