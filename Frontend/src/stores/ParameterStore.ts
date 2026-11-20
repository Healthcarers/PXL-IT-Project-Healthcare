import { defineStore } from "pinia";
import api from "../services/refreshService";
import { DEFAULT_PARAMETERS, type Parameters } from "../types/lector";

export const useParameterStore = defineStore("parameters", () => {
  async function changeHeartRate(heartRate: number) {
    await api.patch("/vitals", { heartRate: heartRate });
    return;
  }

  async function getParameters(): Promise<Parameters | null> {
    try {
      const res = await api.get("/vitals");
      return {
        ...DEFAULT_PARAMETERS,
        ...res.data,
      };
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  return {
    changeHeartRate,
    getParameters,
  };
});
