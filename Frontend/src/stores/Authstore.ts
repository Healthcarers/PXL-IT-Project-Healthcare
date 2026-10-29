import { ref } from "vue";
import { defineStore } from "pinia";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import type { Person } from "../models/Person";

export const useAuthStore = defineStore("auth", () => {
  let person = ref<Person>({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    passwordRepeated: "",
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function registerPerson() {
    loading.value = true;
    error.value = null;

    try {
      const url = `${API_BASE_URL}/auth/register`;
      const res = await axios.post(url, person.value);

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

  return { person, loading, error, registerPerson };
});
