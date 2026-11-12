<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AdminAccountsTable from "../components/admin/AdminAccountsTable.vue";
import AdminNotificationBanner from "../components/admin/AdminNotificationBanner.vue";
import AdminStatsGrid from "../components/admin/AdminStatsGrid.vue";
import AdminTopbar from "../components/admin/AdminTopbar.vue";
import api from "../services/refreshService";
import type {
  AdminNotification,
  AdminStatCard,
  AdminStats,
  AdminUser,
  Role,
} from "../types/admin";

const liveStats = ref<AdminStats>({
  totalAccounts: 0,
  lectoren: 0,
  cursisten: 0,
});
const statsLoading = ref(true);
const statsError = ref<string | null>(null);

const recentUsers = ref<AdminUser[]>([
  {
    id: "acc-1",
    firstname: "Inge",
    lastname: "Maes",
    email: "Inge.Maes@pxl.be",
    role: "Lector",
    status: "Actief",
    createdAt: "Vandaag",
  },
  {
    id: "acc-2",
    firstname: "Test",
    lastname: "User",
    email: "test.user@student.pxl.be",
    role: "Cursist",
    status: "Actief",
    createdAt: "Gisteren",
  },
  {
    id: "acc-3",
    firstname: "Voornaam",
    lastname: "Achternaam",
    email: "voornaam@student.pxl.be",
    role: "Cursist",
    status: "Actief",
    createdAt: "Gisteren",
  },
]);

const highlightedUserId = ref<string | null>("acc-1");
const notification = ref<AdminNotification | null>({
  type: "success",
  message: "Rol van Inge Maes gewijzigd naar lector.",
});

const statCards = computed<AdminStatCard[]>(() => {
  const formatStatValue = (value: number): number | string => {
    if (statsLoading.value) {
      return "...";
    }
    if (statsError.value) {
      return "-";
    }
    return value;
  };

  return [
    {
      id: "accounts-total",
      title: "Accounts totaal",
      value: formatStatValue(liveStats.value.totalAccounts),
    },
    {
      id: "lectoren",
      title: "Lectoren",
      value: formatStatValue(liveStats.value.lectoren),
    },
    {
      id: "cursisten",
      title: "Cursisten",
      value: formatStatValue(liveStats.value.cursisten),
    },
  ];
});

async function fetchLiveStats() {
  statsLoading.value = true;
  statsError.value = null;

  try {
    const res = await api.get<AdminStats>("/admin/stats");
    liveStats.value = res.data;
  } catch {
    statsError.value =
      "Kon de live accountstatistieken niet ophalen van de backend.";
  } finally {
    statsLoading.value = false;
  }
}

onMounted(() => {
  void fetchLiveStats();
});

function handleChangeRole(userId: string, newRole: Role) {
  const target = recentUsers.value.find((user) => user.id === userId);
  if (!target) {
    return;
  }

  target.role = newRole;
  highlightedUserId.value = userId;
  notification.value = {
    type: "success",
    message: `Rol van ${target.firstname} ${target.lastname} gewijzigd naar ${newRole.toLowerCase()}.`,
  };
}

function handleDeleteUser(userId: string) {
  const target = recentUsers.value.find((user) => user.id === userId);
  if (!target) {
    return;
  }

  recentUsers.value = recentUsers.value.filter((user) => user.id !== userId);
  if (highlightedUserId.value === userId) {
    highlightedUserId.value = null;
  }
  notification.value = {
    type: "success",
    message: `Account van ${target.firstname} ${target.lastname} verwijderd.`,
  };
}

function handleLogoutNotice() {
  notification.value = {
    type: "info",
    message: "Uitlogactie wordt gekoppeld in het authenticatie-issue.",
  };
}
</script>

<template>
  <div class="admin-theme font-body min-h-screen w-full bg-pxl-canvas text-pxl-black">
    <AdminTopbar @logout="handleLogoutNotice" />

    <main class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div>
        <h1 class="font-heading text-3xl tracking-tight text-pxl-black sm:text-4xl">
          Dashboard
        </h1>
        <p class="font-body mt-1.5 text-sm text-pxl-black/60">
          Overzicht van accounts en beheertaken.
        </p>
      </div>

      <AdminNotificationBanner
        :notification="notification"
        @dismiss="notification = null"
      />

      <div
        v-if="statsError"
        role="alert"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pxl-black/20 bg-pxl-white px-4 py-3 text-sm text-pxl-black"
      >
        <span>{{ statsError }}</span>
        <button
          type="button"
          class="font-body cursor-pointer rounded-full border border-pxl-black bg-pxl-white px-3.5 py-1 text-xs font-semibold text-pxl-black transition hover:bg-pxl-black hover:text-pxl-white focus:outline-none focus:ring-2 focus:ring-pxl-gold"
          @click="fetchLiveStats"
        >
          Opnieuw proberen
        </button>
      </div>

      <AdminStatsGrid :cards="statCards" />

      <AdminAccountsTable
        :users="recentUsers"
        :highlighted-user-id="highlightedUserId"
        @change-role="handleChangeRole"
        @delete-user="handleDeleteUser"
      />
    </main>
  </div>
</template>
