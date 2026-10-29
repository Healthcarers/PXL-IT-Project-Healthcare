import axios from "axios";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "./Authstore";

describe("Authstore.registerPerson", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("Post de registratie gegevens en zet loading-state terug op false na succes", async () => {
    const response = { message: "Account registered" };
    const post = vi.spyOn(axios, "post").mockResolvedValue({ data: response });
    const store = useAuthStore();
    store.person.firstname = "test";
    store.person.lastname = "testje";
    store.person.email = "test@example.com";
    store.person.password = "password123";
    store.person.passwordRepeated = "password123";

    await expect(store.registerPerson()).resolves.toBe(response);

    expect(post).toHaveBeenCalledWith(
      `${API_BASE_URL}/auth/register`,
      store.person,
    );
    expect(store.error).toBeNull();
    expect(store.loading).toBe(false);
  });

  it.each([
    ["validation", "Voornaam moet minstens 2 tekens lang zijn"],
    ["mismatched passwords", "De ingevoerde wachtwoorden komen niet overeen"],
  ])(
    "uses the plain-text backend response for %s errors",
    async (_, message) => {
      vi.spyOn(axios, "post").mockRejectedValue({
        isAxiosError: true,
        response: { status: 400, data: message },
      });

      const store = useAuthStore();
      await store.registerPerson();

      expect(store.error).toBe(message);
      expect(store.loading).toBe(false);
    },
  );

  it("Toont backend error wanneer de email al gebruikt is", async () => {
    const message = "Je hebt al een account aangemaakt. Klik op inloggen.";
    vi.spyOn(axios, "post").mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message } },
    });

    const store = useAuthStore();
    await store.registerPerson();

    expect(store.error).toBe(message);
    expect(store.loading).toBe(false);
  });

  it("Gebruikt de fallback wanneer de backend geen leesbare error stuurt", async () => {
    vi.spyOn(axios, "post").mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const store = useAuthStore();
    await store.registerPerson();

    expect(store.error).toBe(
      "Er is een fout opgetreden tijdens de registratie.",
    );
    expect(store.loading).toBe(false);
  });
});
