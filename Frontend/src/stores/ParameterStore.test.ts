import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/refreshService";
import { DEFAULT_PARAMETERS } from "../types/lector";
import { useParameterStore } from "./ParameterStore";

describe("ParameterStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  describe("getParameters", () => {
    it("haalt de parameters op en vult ontbrekende waarden aan met defaults", async () => {
      const getSpy = vi.spyOn(api, "get").mockResolvedValue({
        data: { heartRate: 90 },
      });
      const store = useParameterStore();

      const result = await store.getParameters();

      expect(getSpy).toHaveBeenCalledWith("/vitals");
      expect(result).toEqual({
        ...DEFAULT_PARAMETERS,
        heartRate: 90,
      });
      expect(store.error).toBeNull();
    });

    it("geeft null terug en bewaart de foutmelding wanneer ophalen mislukt", async () => {
      vi.spyOn(api, "get").mockRejectedValue(new Error("Network error"));
      const store = useParameterStore();

      const result = await store.getParameters();

      expect(result).toBeNull();
      expect(store.error).toBe("Network error");
    });
  });

  describe("changeHeartRate", () => {
    it("stuurt de nieuwe hartfrequentie door", async () => {
      const patchSpy = vi.spyOn(api, "patch").mockResolvedValue({
        data: undefined,
      });
      const store = useParameterStore();

      const result = await store.changeHeartRate(120);

      expect(patchSpy).toHaveBeenCalledWith("/vitals", { heartRate: 120 });
      expect(result).toBe(true);
      expect(store.error).toBeNull();
    });

    it("geeft false terug en bewaart de foutmelding wanneer aanpassen mislukt", async () => {
      vi.spyOn(api, "patch").mockRejectedValue(new Error("Network error"));
      const store = useParameterStore();

      const result = await store.changeHeartRate(120);

      expect(result).toBe(false);
      expect(store.error).toBe("Network error");
    });
  });
});
