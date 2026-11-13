// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "../../router/index.ts";
import api from "../../services/refreshService.ts";
import { useAdminStore } from "../../stores/AdminStore.ts";
import { useAuthStore } from "../../stores/Authstore.ts";
import AdminDashboardView from "./AdminDashboardView.vue";

const accountsResponse = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    firstname: "Inge",
    lastname: "Maes",
    email: "Inge.Maes@pxl.be",
    role: "LECTOR",
    createdAt: "2025-01-02",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    firstname: "Test",
    lastname: "User",
    email: "test.user@student.pxl.be",
    role: "CURSIST",
    createdAt: "2025-01-03",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    firstname: "Voornaam",
    lastname: "Achternaam",
    email: "voornaam@student.pxl.be",
    role: "CURSIST",
    createdAt: null,
  },
];

function mockAdminGet(stats = { totalAccounts: 12, lectoren: 3, cursisten: 8 }) {
  return vi.spyOn(api, "get").mockImplementation((url) =>
    Promise.resolve({
      data:
        url === "/admin/accounts"
          ? accountsResponse
          : stats,
    }),
  );
}

vi.mock("../config/api", () => ({
  API_BASE_URL: "http://localhost:8080/api",
}));

describe("AdminDashboardView.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("haalt live accountstatistieken op en rendert topbar, melding, KPI-kaarten en Recente accounts", async () => {
    const getSpy = mockAdminGet();
    const fetchLiveStatsSpy = vi.spyOn(useAdminStore(), "fetchLiveStats");
    const fetchAccountsSpy = vi.spyOn(useAdminStore(), "fetchAccounts");

    const wrapper = mount(AdminDashboardView);
    await flushPromises();

    expect(fetchLiveStatsSpy).toHaveBeenCalledOnce();
    expect(fetchAccountsSpy).toHaveBeenCalledOnce();
    expect(getSpy).toHaveBeenCalledWith("/admin/stats");
    expect(getSpy).toHaveBeenCalledWith("/admin/accounts");

    const header = wrapper.get("header");
    expect(header.text()).toContain("Virtuele monitor-defibrillator");
    expect(header.text()).toContain("Beheerder");
    expect(header.text()).toContain("Uitloggen");

    expect(wrapper.get("h1").text()).toBe("Dashboard");
    expect(wrapper.text()).toContain("Overzicht van accounts en beheertaken.");
    expect(wrapper.find("[role='status']").exists()).toBe(false);

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
    expect(rows[0]?.text()).toContain("Inge.Maes@pxl.be");
    expect(rows[0]?.text()).toContain("Lector");
    expect(rows[0]?.text()).toContain("02/01/2025");
  });

  it("toont een foutmelding en '-' als live statistieken niet opgehaald kunnen worden en herstelt bij Opnieuw proberen", async () => {
    const getSpy = mockAdminGet({
      totalAccounts: 5,
      lectoren: 1,
      cursisten: 3,
    });
    getSpy.mockRejectedValueOnce(new Error("Network error"));

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

    expect(getSpy).toHaveBeenCalledTimes(3);
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
    expect(statCards[0]?.text()).toContain("5");
  });

  it("toont melding bij Uitloggen en laat meldingen sluiten", async () => {
    mockAdminGet();

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

  it("ondersteunt annuleren bij rol wijzigen/verwijderen en een lege tabelweergave", async () => {
    mockAdminGet();
    vi.spyOn(api, "delete").mockResolvedValue({ data: undefined });

    const wrapper = mount(AdminDashboardView);
    await flushPromises();

    // Rol wijzigen openen en annuleren
    const cursistRowButtons = wrapper
      .findAll("table[aria-label='Recente accounts'] tbody tr")[1]!
      .findAll("button");
    await cursistRowButtons
      .find((btn) => btn.text().trim() === "Rol wijzigen")!
      .trigger("click");
    await wrapper
      .findAll("table[aria-label='Recente accounts'] tbody button")
      .find((btn) => btn.text().trim() === "Annuleer")!
      .trigger("click");
    expect(wrapper.find("#role-select-acc-2").exists()).toBe(false);

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
      await flushPromises();
    }

    expect(wrapper.find("table[aria-label='Recente accounts']").exists()).toBe(
      false,
    );
    expect(wrapper.text()).toContain("Geen accounts beschikbaar");
  });

  it("maakt een cursist via de adminstore lector en toont een bevestigingsmelding", async () => {
    mockAdminGet();
    const patchSpy = vi.spyOn(api, "patch").mockResolvedValue({
      data: undefined,
    });

    const wrapper = mount(AdminDashboardView);
    await flushPromises();

    const rows = wrapper.findAll("table[aria-label='Recente accounts'] tbody tr");
    const roleButton = rows[1]!
      .findAll("button")
      .find((btn) => btn.text().trim() === "Rol wijzigen");
    await roleButton!.trigger("click");
    await wrapper
      .get("#role-select-22222222-2222-4222-8222-222222222222")
      .setValue("Lector");

    const saveButton = wrapper
      .findAll("table[aria-label='Recente accounts'] tbody button")
      .find((btn) => btn.text().trim() === "Opslaan");
    await saveButton!.trigger("click");
    await flushPromises();

    expect(patchSpy).toHaveBeenCalledWith("/admin/changeRole", {
      data: { uuid: "22222222-2222-4222-8222-222222222222" },
    });
    expect(rows[1]!.text()).toContain("Lector");
    expect(wrapper.get("[role='status']").text()).toContain(
      "Rol van Test User gewijzigd naar lector.",
    );
  });

  it("laat de accountrol ongewijzigd en toont een fout als de backendpromotie mislukt", async () => {
    mockAdminGet();
    vi.spyOn(api, "patch").mockRejectedValue(new Error("Request failed"));

    const wrapper = mount(AdminDashboardView);
    await flushPromises();

    await wrapper
      .findAll("table[aria-label='Recente accounts'] tbody tr")[1]!
      .findAll("button")
      .find((btn) => btn.text().trim() === "Rol wijzigen")!
      .trigger("click");
    await wrapper
      .get("#role-select-22222222-2222-4222-8222-222222222222")
      .setValue("Lector");
    await wrapper
      .findAll("table[aria-label='Recente accounts'] tbody button")
      .find((btn) => btn.text().trim() === "Opslaan")!
      .trigger("click");
    await flushPromises();

    expect(
      wrapper.findAll("table[aria-label='Recente accounts'] tbody tr")[1]!.text(),
    ).toContain("Cursist");
    expect(wrapper.get("[role='alert']").text()).toContain(
      "Rol van Test User kon niet gewijzigd worden.",
    );
  });

  it("verwijdert een account via de adminstore na bevestiging", async () => {
    mockAdminGet();
    const deleteSpy = vi.spyOn(api, "delete").mockResolvedValue({
      data: undefined,
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
    await flushPromises();

    expect(deleteSpy).toHaveBeenCalledWith("/admin/delete", {
      data: { uuid: "33333333-3333-4333-8333-333333333333" },
    });
    expect(
      wrapper.findAll("table[aria-label='Recente accounts'] tbody tr"),
    ).toHaveLength(2);
    expect(wrapper.get("[role='status']").text()).toContain(
      "Account van Voornaam Achternaam verwijderd.",
    );
  });

  it("behoudt het account en toont een fout als verwijderen mislukt", async () => {
    mockAdminGet();
    vi.spyOn(api, "delete").mockRejectedValue({
      isAxiosError: true,
      response: { status: 409 },
    });

    const wrapper = mount(AdminDashboardView);
    await flushPromises();

    await wrapper
      .findAll("table[aria-label='Recente accounts'] tbody tr")[2]!
      .findAll("button")
      .find((btn) => btn.text().trim() === "Verwijderen")!
      .trigger("click");
    await wrapper
      .findAll("table[aria-label='Recente accounts'] tbody button")
      .find((btn) => btn.text().trim() === "Bevestig")!
      .trigger("click");
    await flushPromises();

    expect(
      wrapper.findAll("table[aria-label='Recente accounts'] tbody tr"),
    ).toHaveLength(3);
    expect(wrapper.get("[role='alert']").text()).toContain(
      "Account van Voornaam Achternaam kon niet verwijderd worden.",
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
