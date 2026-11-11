// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import router from "../router";
import AdminDashboardView from "./AdminDashboardView.vue";

vi.mock("../config/api", () => ({
  API_BASE_URL: "http://localhost:8080/api",
}));

describe("AdminDashboardView.vue", () => {
  it("rendert de topbar, titel, melding, 3 KPI-kaarten en de tabel Recente accounts", () => {
    const wrapper = mount(AdminDashboardView);

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
    expect(statCards[0]?.text()).toContain("48");
    expect(statCards[1]?.text()).toContain("Lectoren");
    expect(statCards[1]?.text()).toContain("7");
    expect(statCards[2]?.text()).toContain("Cursisten");
    expect(statCards[2]?.text()).toContain("41");

    expect(wrapper.get("h2").text()).toBe("Recente accounts");
    const rows = wrapper.findAll("table[aria-label='Recente accounts'] tbody tr");
    expect(rows).toHaveLength(3);
    expect(rows[0]?.text()).toContain("Inge Maes");
    expect(rows[0]?.text()).toContain("Inge.Maes@pxl.be");
    expect(rows[0]?.text()).toContain("Lector");
  });

  it("wijzigt een rol via 'Rol wijzigen' en werkt statistieken en melding bij", async () => {
    const wrapper = mount(AdminDashboardView);

    const rows = wrapper.findAll("table[aria-label='Recente accounts'] tbody tr");
    const testUserRow = rows[1]!;
    const roleButton = testUserRow
      .findAll("button")
      .find((btn) => btn.text().trim() === "Rol wijzigen");
    expect(roleButton).toBeDefined();

    await roleButton!.trigger("click");
    await wrapper.get("#role-select-acc-2").setValue("Lector");

    const saveButton = wrapper
      .findAll("table[aria-label='Recente accounts'] tbody button")
      .find((btn) => btn.text().trim() === "Opslaan");
    await saveButton!.trigger("click");

    expect(wrapper.get("[role='status']").text()).toContain(
      "Rol van Test User gewijzigd naar lector.",
    );
    const statCards = wrapper.findAll(
      "section[aria-label='Systeemstatistieken'] article",
    );
    expect(statCards[1]?.text()).toContain("8");
    expect(statCards[2]?.text()).toContain("40");
  });

  it("verwijdert een account na bevestiging en werkt de totalen bij", async () => {
    const wrapper = mount(AdminDashboardView);

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
    const statCards = wrapper.findAll(
      "section[aria-label='Systeemstatistieken'] article",
    );
    expect(statCards[0]?.text()).toContain("47");
    expect(statCards[2]?.text()).toContain("40");
  });

  it("registreert de /admin route zonder bestaande routes te breken", () => {
    const routeNames = router.getRoutes().map((r) => r.name);
    expect(routeNames).toContain("login");
    expect(routeNames).toContain("registration");
    expect(routeNames).toContain("admin");
  });
});
