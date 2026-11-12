// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "../router";
import api from "../services/refreshService";
import { useAuthStore } from "../stores/Authstore";
import AdminDashboardView from "./AdminDashboardView.vue";

vi.mock("../config/api", () => ({
  API_BASE_URL: "http://localhost:8080/api",
}));

describe("AdminDashboardView.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("haalt live accountstatistieken op en rendert topbar, melding, KPI-kaarten en Recente accounts", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({
      data: {
        totalAccounts: 12,
        lectoren: 3,
        cursisten: 8,
      },
    });

    const wrapper = mount(AdminDashboardView);
    await flushPromises();

    expect(getSpy).toHaveBeenCalledWith("/admin/stats");

    const header = wrapper.get("header");
    expect(header.text()).toContain("Virtuele monitor-defibrillator");
    expect(header.text()).toContain("Beheerder");
    expect(header.text()).toContain("Uitloggen");

    expect(wrapper.get("h1").text()).toBe("Dashboard");
    expect(wrapper.text()).toContain("Overzicht van accounts en beheertaken.");
    expect(wrapper.get("[role='status']").text()).toContain(
      "Rol van Inge Maes gewijzigd naar lector.",
    );

    const statCards = wrapper.findAll(
      "section[aria-label='Systeemstatistieken'] article",
    );
    expect(statCards).toHaveLength(3);
    expect(statCards[0]?.text()).toContain("Accounts totaal");
    expect(statCards[0]?.text()).toContain("12");
    expect(statCards[1]?.text()).toContain("Lectoren");
    expect(statCards[1]?.text()).toContain("3");
    expect(statCards[2]?.text()).toContain("Cursisten");
    expect(statCards[2]?.text()).toContain("8");

    expect(wrapper.get("h2").text()).toBe("Recente accounts");
    const rows = wrapper.findAll("table[aria-label='Recente accounts'] tbody tr");
    expect(rows).toHaveLength(3);
    expect(rows[0]?.text()).toContain("Inge Maes");
  });

  it("toont een foutmelding en '-' als live statistieken niet opgehaald kunnen worden en herstelt bij Opnieuw proberen", async () => {
    const getSpy = vi
      .spyOn(api, "get")
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        data: { totalAccounts: 5, lectoren: 1, cursisten: 3 },
      });

    const wrapper = mount(AdminDashboardView);
    await flushPromises();

    expect(wrapper.get("[role='alert']").text()).toContain(
      "Kon de live accountstatistieken niet ophalen van de backend.",
    );
    const statCards = wrapper.findAll(
      "section[aria-label='Systeemstatistieken'] article",
    );
    expect(statCards[0]?.text()).toContain("-");

    await wrapper.get("[role='alert'] button").trigger("click");
    await flushPromises();

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
    expect(statCards[0]?.text()).toContain("5");
  });

  it("toont melding bij Uitloggen en laat meldingen sluiten", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: { totalAccounts: 1, lectoren: 0, cursisten: 0 },
    });

    const wrapper = mount(AdminDashboardView);
    await flushPromises();

    const logoutButton = wrapper
      .findAll("header button")
      .find((btn) => btn.text().trim() === "Uitloggen");
    await logoutButton!.trigger("click");

    expect(wrapper.get("[role='status']").text()).toContain(
      "Uitlogactie wordt gekoppeld in het authenticatie-issue.",
    );

    await wrapper.get("button[aria-label='Sluit melding']").trigger("click");
    expect(wrapper.find("[role='status']").exists()).toBe(false);
  });

  it("ondersteunt annuleren bij rol wijzigen/verwijderen, Admin-badge en lege tabelweergave", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: { totalAccounts: 1, lectoren: 0, cursisten: 0 },
    });

    const wrapper = mount(AdminDashboardView);
    await flushPromises();

    // Rol wijzigen openen en annuleren
    const firstRowButtons = wrapper
      .findAll("table[aria-label='Recente accounts'] tbody tr")[0]!
      .findAll("button");
    await firstRowButtons
      .find((btn) => btn.text().trim() === "Rol wijzigen")!
      .trigger("click");
    await wrapper
      .findAll("table[aria-label='Recente accounts'] tbody button")
      .find((btn) => btn.text().trim() === "Annuleer")!
      .trigger("click");
    expect(wrapper.find("#role-select-acc-1").exists()).toBe(false);

    // Rol wijzigen naar Admin (dekt Admin badge)
    await wrapper
      .findAll("table[aria-label='Recente accounts'] tbody tr")[0]!
      .findAll("button")
      .find((btn) => btn.text().trim() === "Rol wijzigen")!
      .trigger("click");
    await wrapper.get("#role-select-acc-1").setValue("Admin");
    await wrapper
      .findAll("table[aria-label='Recente accounts'] tbody button")
      .find((btn) => btn.text().trim() === "Opslaan")!
      .trigger("click");
    expect(
      wrapper.findAll("table[aria-label='Recente accounts'] tbody tr")[0]!.text(),
    ).toContain("Admin");

    // Verwijderen openen en annuleren
    await wrapper
      .findAll("table[aria-label='Recente accounts'] tbody tr")[0]!
      .findAll("button")
      .find((btn) => btn.text().trim() === "Verwijderen")!
      .trigger("click");
    await wrapper
      .findAll("table[aria-label='Recente accounts'] tbody button")
      .find((btn) => btn.text().trim() === "Annuleer")!
      .trigger("click");
    expect(
      wrapper.findAll("table[aria-label='Recente accounts'] tbody tr"),
    ).toHaveLength(3);

    // Alle 3 accounts verwijderen -> lege state zichtbaar
    for (let i = 0; i < 3; i++) {
      await wrapper
        .findAll("table[aria-label='Recente accounts'] tbody tr")[0]!
        .findAll("button")
        .find((btn) => btn.text().trim() === "Verwijderen")!
        .trigger("click");
      await wrapper
        .findAll("table[aria-label='Recente accounts'] tbody button")
        .find((btn) => btn.text().trim() === "Bevestig")!
        .trigger("click");
    }

    expect(wrapper.find("table[aria-label='Recente accounts']").exists()).toBe(
      false,
    );
    expect(wrapper.text()).toContain("Geen accounts beschikbaar");
  });

  it("wijzigt een rol in de dummy-tabel en toont een bevestigingsmelding", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: { totalAccounts: 1, lectoren: 0, cursisten: 0 },
    });

    const wrapper = mount(AdminDashboardView);
    await flushPromises();

    const rows = wrapper.findAll("table[aria-label='Recente accounts'] tbody tr");
    const roleButton = rows[1]!
      .findAll("button")
      .find((btn) => btn.text().trim() === "Rol wijzigen");
    await roleButton!.trigger("click");
    await wrapper.get("#role-select-acc-2").setValue("Lector");

    const saveButton = wrapper
      .findAll("table[aria-label='Recente accounts'] tbody button")
      .find((btn) => btn.text().trim() === "Opslaan");
    await saveButton!.trigger("click");

    expect(wrapper.get("[role='status']").text()).toContain(
      "Rol van Test User gewijzigd naar lector.",
    );
  });

  it("verwijdert een dummy-account uit de lijst na bevestiging", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: { totalAccounts: 1, lectoren: 0, cursisten: 0 },
    });

    const wrapper = mount(AdminDashboardView);
    await flushPromises();

    const rows = wrapper.findAll("table[aria-label='Recente accounts'] tbody tr");
    const deleteButton = rows[2]!
      .findAll("button")
      .find((btn) => btn.text().trim() === "Verwijderen");
    await deleteButton!.trigger("click");

    const confirmButton = wrapper
      .findAll("table[aria-label='Recente accounts'] tbody button")
      .find((btn) => btn.text().trim() === "Bevestig");
    await confirmButton!.trigger("click");

    expect(
      wrapper.findAll("table[aria-label='Recente accounts'] tbody tr"),
    ).toHaveLength(2);
    expect(wrapper.get("[role='status']").text()).toContain(
      "Account van Voornaam Achternaam verwijderd.",
    );
  });

  it("beveiligt de /admin route voor alleen de ADMIN-rol", async () => {
    const adminRoute = router.getRoutes().find((r) => r.name === "admin");
    expect(adminRoute).toBeDefined();
    expect(adminRoute?.meta).toEqual({ requiresAuth: true, role: "ADMIN" });

    const store = useAuthStore();

    vi.spyOn(store, "isAuthenticated").mockRejectedValueOnce(
      new Error("Not authenticated"),
    );
    await router.push("/admin");
    expect(router.currentRoute.value.name).toBe("login");

    vi.spyOn(store, "isAuthenticated").mockResolvedValueOnce({
      firstname: "Test",
      lastname: "Cursist",
      role: "CURSIST",
    });
    await router.push("/admin");
    expect(router.currentRoute.value.name).toBe("unauthorized");

    vi.spyOn(store, "isAuthenticated").mockResolvedValueOnce({
      firstname: "Sofie",
      lastname: "Peeters",
      role: "ADMIN",
    });
    await router.push("/admin");
    expect(router.currentRoute.value.name).toBe("admin");
  });
});
