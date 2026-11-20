<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AdminAccountsTable from "../../components/admin/AdminAccountsTable.vue";
import AdminNotificationBanner from "../../components/admin/AdminNotificationBanner.vue";
import AdminStatsGrid from "../../components/admin/AdminStatsGrid.vue";
import AdminTopbar from "../../components/admin/AdminTopbar.vue";
import ConfirmModal from "../../components/ConfirmModal.vue";
import type { AdminStatCard } from "../../types/admin";
import router from "../../router/index.ts";

import { useAdminStore } from "../../stores/AdminStore.ts";
import { useAuthStore } from "../../stores/Authstore.ts";

const adminStore = useAdminStore();
const authStore = useAuthStore();
const logoutModalOpen = ref(false);
const loggingOut = ref(false);
const logoutError = ref<string | null>(null);

const statCards = computed<AdminStatCard[]>(() => {
  const formatStatValue = (value: number): number | string => {
    if (adminStore.loading) {
      return "...";
    }
    if (adminStore.error) {
      return "-";
    }
    return value;
  };

  return [
    {
      id: "accounts-total",
      title: "Accounts totaal",
      value: formatStatValue(adminStore.accounts?.totalAccounts ?? 0),
    },
    {
      id: "lectoren",
      title: "Lectoren",
      value: formatStatValue(adminStore.accounts?.lectoren ?? 0),
    },
    {
      id: "cursisten",
      title: "Cursisten",
      value: formatStatValue(adminStore.accounts?.cursisten ?? 0),
    },
  ];
});

onMounted(() => {
  void adminStore.fetchLiveStats();
  void adminStore.fetchAccounts();
});

function requestLogout() {
  logoutError.value = null;
  logoutModalOpen.value = true;
}

async function confirmLogout() {
  loggingOut.value = true;
  try {
    await authStore.logout();
    await router.push("/login");
  } catch (err: unknown) {
    logoutError.value =
      err instanceof Error
        ? err.message
        : "Uitloggen is mislukt. Probeer opnieuw.";
  } finally {
    loggingOut.value = false;
    logoutModalOpen.value = false;
  }
}
</script>

<template>
  <div
    class="admin-theme font-body min-h-screen w-full bg-pxl-canvas text-pxl-black"
  >
    <AdminTopbar @logout="requestLogout" />

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

      <div
        v-if="logoutError"
        role="alert"
        class="flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
      >
        <span>{{ logoutError }}</span>
        <button type="button" class="font-semibold underline" @click="logoutError = null">
          Sluiten
        </button>
      </div>

      <AdminNotificationBanner
        :notification="adminStore.notification"
        @dismiss="adminStore.notification = null"
      />

      <div
        v-if="adminStore.error"
        role="alert"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pxl-black/20 bg-pxl-white px-4 py-3 text-sm text-pxl-black"
      >
        <span>{{ adminStore.error }}</span>
        <button
          type="button"
          class="font-body cursor-pointer rounded-full border border-pxl-black bg-pxl-white px-3.5 py-1 text-xs font-semibold text-pxl-black transition hover:bg-pxl-black hover:text-pxl-white focus:outline-none focus:ring-2 focus:ring-pxl-gold"
          @click="adminStore.fetchLiveStats()"
        >
          Opnieuw proberen
        </button>
      </div>

      <AdminStatsGrid :cards="statCards" />

      <div
        v-if="adminStore.usersError"
        role="alert"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pxl-black/20 bg-pxl-white px-4 py-3 text-sm text-pxl-black"
      >
        <span>{{ adminStore.usersError }}</span>
        <button
          type="button"
          class="font-body cursor-pointer rounded-full border border-pxl-black bg-pxl-white px-3.5 py-1 text-xs font-semibold text-pxl-black transition hover:bg-pxl-black hover:text-pxl-white focus:outline-none focus:ring-2 focus:ring-pxl-gold"
          @click="adminStore.fetchAccounts()"
        >
          Opnieuw proberen
        </button>
      </div>
      <p v-else-if="adminStore.usersLoading" role="status">Accounts laden...</p>
      <AdminAccountsTable
        v-else
        :users="adminStore.users"
        :highlighted-user-id="adminStore.highlightedUserId"
        @change-role="adminStore.handleChangeRole"
        @delete-user="adminStore.handleDeleteUser"
      />
    </main>

    <ConfirmModal
      :open="logoutModalOpen"
      title="Uitloggen?"
      message="Weet je zeker dat je wilt uitloggen?"
      confirm-label="Uitloggen"
      :loading="loggingOut"
      @cancel="logoutModalOpen = false"
      @confirm="confirmLogout"
    />
  </div>
</template>
