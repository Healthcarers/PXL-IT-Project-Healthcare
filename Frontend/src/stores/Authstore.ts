import { ref } from "vue";
import { defineStore } from "pinia";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import type { PersonRegistration } from "../models/PersonRegistration";
import type { PersonLogin } from "../models/PersonLogin";
import type { Person } from "../models/Person";
import api from "../services/refreshService";
import router from "../router";

export const useAuthStore = defineStore("auth", () => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const person = ref<Person | null>(null);

  let personRegistration = ref<PersonRegistration>({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    passwordRepeated: "",
  });

  async function registerPerson() {
    loading.value = true;
    error.value = null;

    try {
      const url = `${API_BASE_URL}/auth/register`;
      const res = await axios.post(url, personRegistration.value);

      return res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data;

        if (status === 400) {
          error.value =
            data ??
            data?.errors[0] ??
            data?.error ??
            "De ingevoerde gegevens zijn ongeldig.";
        } else {
          error.value =
            data?.message ??
            "Er is een fout opgetreden tijdens de registratie.";
        }
      } else if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = "Er is een onbekende fout opgetreden.";
      }
    } finally {
      loading.value = false;
    }
  }

  let personLogin = ref<PersonLogin>({
    email: "",
    password: "",
  });
  async function login() {
    loading.value = true;
    error.value = null;

    try {
      const url = `${API_BASE_URL}/auth/login`;
      const res = await axios.post(url, personLogin.value, {
        withCredentials: true,
      });

      if (!error.value) {
        const person: Person = res.data;

        if (person.role === "CURSIST") {
          router.push("/monitor");
        } else if (person.role === "LECTOR") {
          router.push("/dashboard");
        } else if (person.role === "ADMIN") {
          router.push("/admin");
        }
      }

      return res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data;

        if (status === 400) {
          error.value =
            data ??
            data?.errors[0] ??
            data?.error ??
            "De ingevoerde gegevens zijn ongeldig.";
        } else {
          error.value =
            data?.message ?? "Er is een fout opgetreden tijdens de login.";
        }
      } else if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = "Er is een onbekende fout opgetreden.";
      }
    } finally {
      loading.value = false;
    }
  }

  async function isAuthenticated() {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get("/auth/me");
      const person: Person = res.data;
      return person;
    } catch (err) {
      throw new Error("Not authenticated");
    } finally {
      loading.value = false;
    }
  }

  return {
    personRegistration: personRegistration,
    loading,
    error,
    person,
    isAuthenticated,
    registerPerson,
    login,
    personLogin: personLogin,
  };
});
