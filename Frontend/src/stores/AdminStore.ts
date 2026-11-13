import { ref } from "vue";
import { defineStore } from "pinia";
import type {
  AdminAccountResponse,
  AdminNotification,
  AdminStats,
  AdminUser,
  ApiRole,
  Role,
} from "../types/admin";
import api from "../services/refreshService";

const roleLabels: Record<ApiRole, Role> = {
  CURSIST: "Cursist",
  LECTOR: "Lector",
  ADMIN: "Admin",
};

function formatCreatedAt(createdAt: string | null): string {
  if (!createdAt) {
    return "—";
  }

  const [year, month, day] = createdAt.split("-");
  if (!year || !month || !day) {
    return "—";
  }

  return `${day}/${month}/${year}`;
}

export const useAdminStore = defineStore("admin", () => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const accounts = ref<AdminStats>();
  const users = ref<AdminUser[]>([]);
  const usersLoading = ref(false);
  const usersError = ref<string | null>(null);
  const highlightedUserId = ref<string | null>(null);
  const notification = ref<AdminNotification | null>(null);

  async function fetchLiveStats() {
    loading.value = true;
    error.value = null;

    try {
      const res = await api.get<AdminStats>("/admin/stats");
      accounts.value = res.data;
    } catch {
      error.value =
        "Kon de live accountstatistieken niet ophalen van de backend.";
    } finally {
      loading.value = false;
    }
  }

  async function setLectorRole(uuid: string) {
    await api.delete<void>("/admin/changeRole", { data: { uuid } });
  }

  async function deletePerson(uuid: string) {
    await api.delete<void>("/admin/delete", { data: { uuid } });
  }

  async function handleChangeRole(userId: string, newRole: Role) {
    const target = users.value.find((user) => user.id === userId);
    if (!target || target.role !== "Cursist" || newRole !== "Lector") {
      return;
    }

    try {
      await setLectorRole(userId);
      target.role = "Lector";
      highlightedUserId.value = userId;
      notification.value = {
        type: "success",
        message: `Rol van ${target.firstname} ${target.lastname} gewijzigd naar lector.`,
      };
      void fetchLiveStats();
    } catch {
      notification.value = {
        type: "error",
        message: `Rol van ${target.firstname} ${target.lastname} kon niet gewijzigd worden.`,
      };
    }
  }

  async function handleDeleteUser(userId: string) {
    const target = users.value.find((user) => user.id === userId);
    if (!target) {
      return;
    }

    try {
      await deletePerson(userId);
      users.value = users.value.filter((user) => user.id !== userId);
      if (highlightedUserId.value === userId) {
        highlightedUserId.value = null;
      }
      notification.value = {
        type: "success",
        message: `Account van ${target.firstname} ${target.lastname} verwijderd.`,
      };
      void fetchLiveStats();
    } catch {
      notification.value = {
        type: "error",
        message: `Account van ${target.firstname} ${target.lastname} kon niet verwijderd worden.`,
      };
    }
  }

  async function fetchAccounts() {
    usersLoading.value = true;
    usersError.value = null;

    try {
      const res = await api.get<AdminAccountResponse[]>("/admin/accounts");
      users.value = res.data.map((account) => ({
        ...account,
        role: roleLabels[account.role],
        status: "Actief",
        createdAt: formatCreatedAt(account.createdAt),
      }));
    } catch {
      usersError.value = "Kon de accounts niet ophalen van de backend.";
    } finally {
      usersLoading.value = false;
    }
  }

  return {
    accounts,
    loading,
    error,
    users,
    usersLoading,
    usersError,
    highlightedUserId,
    notification,
    fetchLiveStats,
    fetchAccounts,
    setLectorRole,
    deletePerson,
    handleChangeRole,
    handleDeleteUser,
  };
});
