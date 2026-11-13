import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/refreshService";
import type { AdminUser } from "../types/admin";
import { useAdminStore } from "./AdminStore";

describe("AdminStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("haalt accounts op en zet rollen en datums om voor de UI", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: [
        {
          id: "cursist-id",
          firstname: "Ada",
          lastname: "Lovelace",
          email: "ada@example.com",
          role: "CURSIST",
          createdAt: "2025-01-02",
        },
        {
          id: "lector-id",
          firstname: "Grace",
          lastname: "Hopper",
          email: "grace@example.com",
          role: "LECTOR",
          createdAt: null,
        },
      ],
    });
    const store = useAdminStore();

    await store.fetchAccounts();

    expect(store.users).toEqual([
      {
        id: "cursist-id",
        firstname: "Ada",
        lastname: "Lovelace",
        email: "ada@example.com",
        role: "Cursist",
        status: "Actief",
        createdAt: "02/01/2025",
      },
      {
        id: "lector-id",
        firstname: "Grace",
        lastname: "Hopper",
        email: "grace@example.com",
        role: "Lector",
        status: "Actief",
        createdAt: "—",
      },
    ]);
    expect(store.usersLoading).toBe(false);
    expect(store.usersError).toBeNull();
  });

  it("haalt live statistieken op en zet de loading-status terug", async () => {
    const stats = { totalAccounts: 10, lectoren: 3, cursisten: 6 };
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({ data: stats });
    const store = useAdminStore();

    await store.fetchLiveStats();

    expect(getSpy).toHaveBeenCalledWith("/admin/stats");
    expect(store.accounts).toEqual(stats);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it("wijzigt een cursist naar lector na een succesvolle API-call", async () => {
    const user: AdminUser = {
      id: "cursist-id",
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.com",
      role: "Cursist",
      status: "Actief",
      createdAt: "02/01/2025",
    };
    const patchSpy = vi
      .spyOn(api, "patch")
      .mockResolvedValue({ data: undefined });
    vi.spyOn(api, "get").mockResolvedValue({
      data: { totalAccounts: 1, lectoren: 1, cursisten: 0 },
    });
    const store = useAdminStore();
    store.users = [user];

    await store.handleChangeRole(user.id, "Lector");

    expect(patchSpy).toHaveBeenCalledWith("/admin/changeRole", {
      data: { uuid: user.id },
    });
    expect(user.role).toBe("Lector");
    expect(store.highlightedUserId).toBe(user.id);
    expect(store.notification).toEqual({
      type: "success",
      message: "Rol van Ada Lovelace gewijzigd naar lector.",
    });
  });

  it("verwijdert een account na een succesvolle API-call", async () => {
    const user: AdminUser = {
      id: "cursist-id",
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.com",
      role: "Cursist",
      status: "Actief",
      createdAt: "02/01/2025",
    };
    const deleteSpy = vi
      .spyOn(api, "delete")
      .mockResolvedValue({ data: undefined });
    vi.spyOn(api, "get").mockResolvedValue({
      data: { totalAccounts: 0, lectoren: 0, cursisten: 0 },
    });
    const store = useAdminStore();
    store.users = [user];
    store.highlightedUserId = user.id;

    await store.handleDeleteUser(user.id);

    expect(deleteSpy).toHaveBeenCalledWith("/admin/delete", {
      data: { uuid: user.id },
    });
    expect(store.users).toEqual([]);
    expect(store.highlightedUserId).toBeNull();
    expect(store.notification).toEqual({
      type: "success",
      message: "Account van Ada Lovelace verwijderd.",
    });
  });
});
