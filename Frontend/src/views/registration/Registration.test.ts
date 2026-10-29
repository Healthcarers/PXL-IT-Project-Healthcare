// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import router from "../../router";
import { useAuthStore } from "../../stores/Authstore";
import RegistrationView from "./RegistrationView.vue";

describe("RegistrationView.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("toont de registratievelden", () => {
    const wrapper = mount(RegistrationView);

    expect(wrapper.get(".registration-heading").text()).toBe(
      "Account registreren",
    );
    expect(wrapper.find("#firstname").exists()).toBe(true);
    expect(wrapper.find("#lastname").exists()).toBe(true);
    expect(wrapper.find("#email").exists()).toBe(true);
    expect(wrapper.find("#password").exists()).toBe(true);
    expect(wrapper.find("#passwordRepeated").exists()).toBe(true);
    expect(wrapper.get('button[type="submit"]').text()).toBe(
      "Account aanmaken",
    );
  });

  it.each([
    ["firstname", "Voornaam"],
    ["lastname", "Achternaam"],
    ["email", "E-mailadres"],
    ["password", "Wachtwoord"],
    ["passwordRepeated", "Herhaal wachtwoord"],
  ])("toont een foutmelding als %s leeg is", async (inputId, label) => {
    const store = useAuthStore();
    const wrapper = mount(RegistrationView);
    const registerPerson = vi.spyOn(store, "registerPerson");
    const values: Record<string, string> = {
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.com",
      password: "password123",
      passwordRepeated: "password123",
    };

    for (const [id, value] of Object.entries(values)) {
      await wrapper.get(`#${id}`).setValue(id === inputId ? "" : value);
    }

    await wrapper.get("form").trigger("submit");

    expect(store.error).toBe(`${label} is niet ingevuld`);
    expect(registerPerson).not.toHaveBeenCalled();
  });

  it("roept de registratieactie aan bij verzenden", async () => {
    const store = useAuthStore();
    const registerPerson = vi
      .spyOn(store, "registerPerson")
      .mockResolvedValue(undefined);
    const wrapper = mount(RegistrationView);

    await wrapper.get("#firstname").setValue("Ada");
    await wrapper.get("#lastname").setValue("Lovelace");
    await wrapper.get("#email").setValue("ada@example.com");
    await wrapper.get("#password").setValue("password123");
    await wrapper.get("#passwordRepeated").setValue("password123");
    await wrapper.get("form").trigger("submit");

    expect(registerPerson).toHaveBeenCalledOnce();
  });

  it("toont een foutmelding uit de store", () => {
    useAuthStore().error = "Registratie is mislukt";

    const wrapper = mount(RegistrationView);

    expect(wrapper.text()).toContain("Registratie is mislukt");
  });

  it("toont de laadstatus tijdens registratie", () => {
    useAuthStore().loading = true;

    const wrapper = mount(RegistrationView);

    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.get('[role="status"]').text()).toContain(
      "Je account wordt aangemaakt...",
    );
  });

  it("navigeert naar inloggen wanneer op Inloggen wordt geklikt", async () => {
    const push = vi.spyOn(router, "push").mockResolvedValue(undefined);
    const wrapper = mount(RegistrationView);

    await wrapper.get("form span.cursor-pointer").trigger("click");

    expect(push).toHaveBeenCalledWith("/login");
  });
});
