<script setup lang="ts">
import { computed, onMounted } from "vue";
import AdminAccountsTable from "../../components/admin/AdminAccountsTable.vue";
import AdminNotificationBanner from "../../components/admin/AdminNotificationBanner.vue";
import AdminStatsGrid from "../../components/admin/AdminStatsGrid.vue";
import AdminTopbar from "../../components/admin/AdminTopbar.vue";
import type {
  AdminStatCard,
} from "../../types/admin";

import { useAdminStore } from "../../stores/AdminStore.ts";

const store = useAdminStore();

const statCards = computed<AdminStatCard[]>(() => {
  const formatStatValue = (value: number): number | string => {
    if (store.loading) {
      return "...";
    }
    if (store.error) {
      return "-";
    }
    return value;
  };

  return [
    {
      id: "accounts-total",
      title: "Accounts totaal",
      value: formatStatValue(store.accounts?.totalAccounts ?? 0),
    },
    {
      id: "lectoren",
      title: "Lectoren",
      value: formatStatValue(store.accounts?.lectoren ?? 0),
    },
    {
      id: "cursisten",
      title: "Cursisten",
      value: formatStatValue(store.accounts?.cursisten ?? 0),
    },
  ];
});

onMounted(() => {
  void store.fetchLiveStats();
  void store.fetchAccounts();
});

function handleLogoutNotice() {
  store.notification = {
    type: "info",
    message: "Uitlogactie wordt gekoppeld in het authenticatie-issue.",
  };
}
</script>

<template>
  <div
    class="admin-theme font-body min-h-screen w-full bg-pxl-canvas text-pxl-black"
  >
    <AdminTopbar @logout="handleLogoutNotice" />

    <main
      class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8"
    >
      <div>
        <h1
          class="font-heading text-3xl tracking-tight text-pxl-black sm:text-4xl"
        >
          Dashboard
        </h1>
        <p class="font-body mt-1.5 text-sm text-pxl-black/60">
          Overzicht van accounts en beheertaken.
        </p>
      </div>

      <AdminNotificationBanner
        :notification="store.notification"
        @dismiss="store.notification = null"
      />

      <div
        v-if="store.error"
        role="alert"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pxl-black/20 bg-pxl-white px-4 py-3 text-sm text-pxl-black"
      >
        <span>{{ store.error }}</span>
        <button
          type="button"
          class="font-body cursor-pointer rounded-full border border-pxl-black bg-pxl-white px-3.5 py-1 text-xs font-semibold text-pxl-black transition hover:bg-pxl-black hover:text-pxl-white focus:outline-none focus:ring-2 focus:ring-pxl-gold"
          @click="store.fetchLiveStats()"
        >
          Opnieuw proberen
        </button>
      </div>

      <AdminStatsGrid :cards="statCards" />

      <div
        v-if="store.usersError"
        role="alert"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pxl-black/20 bg-pxl-white px-4 py-3 text-sm text-pxl-black"
      >
        <span>{{ store.usersError }}</span>
        <button
          type="button"
          class="font-body cursor-pointer rounded-full border border-pxl-black bg-pxl-white px-3.5 py-1 text-xs font-semibold text-pxl-black transition hover:bg-pxl-black hover:text-pxl-white focus:outline-none focus:ring-2 focus:ring-pxl-gold"
          @click="store.fetchAccounts()"
        >
          Opnieuw proberen
        </button>
      </div>
      <p v-else-if="store.usersLoading" role="status">
        Accounts laden...
      </p>
      <AdminAccountsTable
        v-else
        :users="store.users"
        :highlighted-user-id="store.highlightedUserId"
        @change-role="store.handleChangeRole"
        @delete-user="store.handleDeleteUser"
      />
    </main>
  </div>
</template>
