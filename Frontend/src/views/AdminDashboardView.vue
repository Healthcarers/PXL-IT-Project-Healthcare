<script setup lang="ts">
import { computed, ref } from "vue";
import AdminAccountsTable from "../components/admin/AdminAccountsTable.vue";
import AdminNotificationBanner from "../components/admin/AdminNotificationBanner.vue";
import AdminStatsGrid from "../components/admin/AdminStatsGrid.vue";
import AdminTopbar from "../components/admin/AdminTopbar.vue";
import type {
  AdminNotification,
  AdminStatCard,
  AdminUser,
  Role,
} from "../types/admin";

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

// Bestaande aantallen buiten de drie getoonde recente accounts zodat totalen live mee-updaten
const archivedCounts = {
  total: 45,
  lectoren: 6,
  cursisten: 39,
};

const highlightedUserId = ref<string | null>("acc-1");
const notification = ref<AdminNotification | null>({
  type: "success",
  message: "Rol van Inge Maes gewijzigd naar lector.",
});

const statCards = computed<AdminStatCard[]>(() => {
  const recentLectoren = recentUsers.value.filter(
    (user) => user.role === "Lector",
  ).length;
  const recentCursisten = recentUsers.value.filter(
    (user) => user.role === "Cursist",
  ).length;

  return [
    {
      id: "accounts-total",
      title: "Accounts totaal",
      value: archivedCounts.total + recentUsers.value.length,
    },
    {
      id: "lectoren",
      title: "Lectoren",
      value: archivedCounts.lectoren + recentLectoren,
    },
    {
      id: "cursisten",
      title: "Cursisten",
      value: archivedCounts.cursisten + recentCursisten,
    },
  ];
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
