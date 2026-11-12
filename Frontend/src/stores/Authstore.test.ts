import axios from "axios";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL } from "../config/api";
import type { Person } from "../models/Person";
import api from "../services/refreshService";
import router from "../router";
import { useAuthStore } from "./Authstore";

vi.mock("../router", () => ({ default: { push: vi.fn() } }));

describe("Authstore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  describe("registerPerson", () => {
    it("post de registratiegegevens en zet loading terug op false na succes", async () => {
      // Arrange
      const response = { message: "Account registered" };
      const post = vi
        .spyOn(axios, "post")
        .mockResolvedValue({ data: response });
      const store = useAuthStore();
      store.personRegistration.firstname = "test";
      store.personRegistration.lastname = "testje";
      store.personRegistration.email = "test@example.com";
      store.personRegistration.password = "password123";
      store.personRegistration.passwordRepeated = "password123";

      // Act
      await expect(store.registerPerson()).resolves.toBe(response);

      // Assert
      expect(post).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/register`,
        store.personRegistration,
      );
      expect(store.error).toBeNull();
      expect(store.loading).toBe(false);
    });

    it.each([
      ["validatie", "Voornaam moet minstens 2 tekens lang zijn"],
      [
        "niet-overeenkomende wachtwoorden",
        "De ingevoerde wachtwoorden komen niet overeen",
      ],
    ])("gebruikt de backendtekst voor %s-fouten", async (_, message) => {
      // Arrange
      vi.spyOn(axios, "post").mockRejectedValue({
        isAxiosError: true,
        response: { status: 400, data: message },
      });
      const store = useAuthStore();

      // Act
      await store.registerPerson();

      // Assert
      expect(store.error).toBe(message);
      expect(store.loading).toBe(false);
    });


    it("toont de backendfout wanneer het e-mailadres al gebruikt is", async () => {
      // Arrange
      const message = "Je hebt al een account aangemaakt. Klik op inloggen.";
      vi.spyOn(axios, "post").mockRejectedValue({
        isAxiosError: true,
        response: { status: 409, data: { message } },
      });
      const store = useAuthStore();

      // Act
      await store.registerPerson();

      // Assert
      expect(store.error).toBe(message);
      expect(store.loading).toBe(false);
    });

    it("gebruikt de fallback wanneer de backend geen leesbare fout stuurt", async () => {
      // Arrange
      vi.spyOn(axios, "post").mockRejectedValue({
        isAxiosError: true,
        response: { status: 500, data: {} },
      });
      const store = useAuthStore();

      // Act
      await store.registerPerson();

      // Assert
      expect(store.error).toBe(
        "Er is een fout opgetreden tijdens de registratie.",
      );
      expect(store.loading).toBe(false);
    });

    it("toont een gewone foutmelding bij een niet-Axiosfout", async () => {
      // Arrange
      vi.spyOn(axios, "post").mockRejectedValue(new Error("Network error"));
      const store = useAuthStore();

      // Act
      await store.registerPerson();

      // Assert
      expect(store.error).toBe("Network error");
      expect(store.loading).toBe(false);
    });

    it("toont de onbekende-fallback bij een niet-Error foutwaarde", async () => {
      // Arrange
      vi.spyOn(axios, "post").mockRejectedValue("unexpected error");
      const store = useAuthStore();

      // Act
      await store.registerPerson();

      // Assert
      expect(store.error).toBe("Er is een onbekende fout opgetreden.");
      expect(store.loading).toBe(false);
    });
  });

  describe("login", () => {
    it.each([
      ["CURSIST", "/monitor"],
      ["LECTOR", "/dashboard"],
    ])("routeert een %s naar de juiste pagina", async (role, route) => {
      // Arrange
      const person: Person = { firstname: "Test", lastname: "User", role };
      const post = vi.spyOn(axios, "post").mockResolvedValue({ data: person });
      const push = vi.spyOn(router, "push").mockResolvedValue(undefined);
      const store = useAuthStore();
      store.personLogin.email = "test@example.com";
      store.personLogin.password = "password123";

      // Act
      await expect(store.login()).resolves.toBe(person);

      // Assert
      expect(post).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/login`,
        store.personLogin,
        { withCredentials: true },
      );
      expect(push).toHaveBeenCalledWith(route);
      expect(store.error).toBeNull();
      expect(store.loading).toBe(false);
    });

    it.each([
      [400, "Login gegevens zijn niet correct"],
      [500, "Er is een fout opgetreden tijdens de login."],
    ])("verwerkt loginfouten met status %s", async (status, expectedError) => {
      // Arrange
      vi.spyOn(axios, "post").mockRejectedValue({
        isAxiosError: true,
        response: {
          status,
          data: status === 400 ? expectedError : {},
        },
      });
      const store = useAuthStore();

      // Act
      await store.login();

      // Assert
      expect(store.error).toBe(expectedError);
      expect(store.loading).toBe(false);
    });

    it("toont een gewone foutmelding bij een niet-Axiosfout", async () => {
      // Arrange
      vi.spyOn(axios, "post").mockRejectedValue(new Error("Network error"));
      const store = useAuthStore();

      // Act
      await store.login();

      // Assert
      expect(store.error).toBe("Network error");
      expect(store.loading).toBe(false);
    });

    it("toont de onbekende-fallback bij een niet-Error foutwaarde", async () => {
      // Arrange
      vi.spyOn(axios, "post").mockRejectedValue("unexpected error");
      const store = useAuthStore();

      // Act
      await store.login();

      // Assert
      expect(store.error).toBe("Er is een onbekende fout opgetreden.");
      expect(store.loading).toBe(false);
    });
  });

  describe("isAuthenticated", () => {
    it("geeft de persoon terug wanneer de sessie geldig is", async () => {
      // Arrange
      const person: Person = {
        firstname: "Test",
        lastname: "User",
        role: "CURSIST",
      };
      const get = vi.spyOn(api, "get").mockResolvedValue({ data: person });
      const store = useAuthStore();

      // Act
      await expect(store.isAuthenticated()).resolves.toBe(person);

      // Assert
      expect(get).toHaveBeenCalledWith("/auth/me");
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it("gooit Not authenticated wanneer de sessie ongeldig is", async () => {
      // Arrange
      vi.spyOn(api, "get").mockRejectedValue(new Error("Unauthorized"));
      const store = useAuthStore();

      // Act
      const result = store.isAuthenticated();

      // Assert
      await expect(result).rejects.toThrow("Not authenticated");
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });
  });
});
