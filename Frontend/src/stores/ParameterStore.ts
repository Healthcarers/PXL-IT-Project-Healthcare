import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../services/refreshService";
import { DEFAULT_PARAMETERS, type Parameters } from "../types/lector";
import type { ParameterKey } from "../types/lector";

export const useParameterStore = defineStore("parameters", () => {
  const error = ref<string | null>(null);

  async function changeParameters(
    parameter: ParameterKey,
    value: number,
  ): Promise<boolean> {
    error.value = null;

    try {
      await api.patch("/vitals", { [parameter]: value });
      return true;
    } catch (err: unknown) {
      error.value =
        err instanceof Error
          ? err.message
          : "De parameter kon niet worden aangepast.";
      return false;
    }
  }

  async function getParameters(): Promise<Parameters | null> {
    error.value = null;

    try {
      const res = await api.get("/vitals");
      return {
        ...DEFAULT_PARAMETERS,
        ...res.data,
      };
    } catch (err: unknown) {
      error.value =
        err instanceof Error
          ? err.message
          : "De parameters konden niet worden opgehaald.";
      return null;
    }
  }

  return {
    changeParameters,
    getParameters,
    error,
  };
});
