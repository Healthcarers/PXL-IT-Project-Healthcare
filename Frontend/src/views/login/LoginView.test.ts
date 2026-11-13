// @vitest-environment happy-dom

import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "../../router";
import { useAuthStore } from "../../stores/Authstore";
import LoginView from "./LoginView.vue";

describe("LoginView.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("toont de inlogvelden en de verzendknop", () => {
    // Act
    const wrapper = mount(LoginView);

    // Assert
    expect(wrapper.get(".login-heading").text()).toBe("Inloggen");
    expect(wrapper.find("#email").exists()).toBe(true);
    expect(wrapper.find("#password").exists()).toBe(true);
    expect(wrapper.get('button[type="submit"]').text()).toBe("Login");
  });

  it.each([
    ["email", "E-mailadres"],
    ["password", "Wachtwoord"],
  ])("toont een foutmelding als %s leeg is", async (inputId, label) => {
    // Arrange
    const store = useAuthStore();
    const login = vi.spyOn(store, "login");
    const wrapper = mount(LoginView);

    // Act
    await wrapper.get("#email").setValue(inputId === "email" ? "" : "test@example.com");
    await wrapper.get("#password").setValue(inputId === "password" ? "" : "password123");
    await wrapper.get("form").trigger("submit");

    // Assert
    expect(store.error).toBe(`${label} is niet ingevuld`);
    expect(store.loading).toBe(false);
    expect(login).not.toHaveBeenCalled();
  });

  it("roept de loginactie aan met ingevulde velden", async () => {
    // Arrange
    const store = useAuthStore();
    const login = vi.spyOn(store, "login").mockResolvedValue(undefined);
    const wrapper = mount(LoginView);

    // Act
    await wrapper.get("#email").setValue("test@example.com");
    await wrapper.get("#password").setValue("password123");
    await wrapper.get("form").trigger("submit");

    // Assert
    expect(store.personLogin).toEqual({
      email: "test@example.com",
      password: "password123",
    });
    expect(login).toHaveBeenCalledOnce();
  });

  it("toont een foutmelding uit de store", () => {
    // Arrange
    useAuthStore().error = "Inloggen is mislukt";

    // Act
    const wrapper = mount(LoginView);

    // Assert
    expect(wrapper.text()).toContain("Inloggen is mislukt");
  });

  it("toont de laadstatus tijdens het inloggen", () => {
    // Arrange
    useAuthStore().loading = true;

    // Act
    const wrapper = mount(LoginView);

    // Assert
    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.get('[role="status"]').text()).toContain(
      "Bezig met inloggen...",
    );
  });

  it("navigeert naar registratie wanneer Registreren wordt aangeklikt", async () => {
    // Arrange
    const push = vi.spyOn(router, "push").mockResolvedValue(undefined);
    const wrapper = mount(LoginView);

    // Act
    await wrapper.get("form span.cursor-pointer").trigger("click");

    // Assert
    expect(push).toHaveBeenCalledWith("/registration");
  });
});
