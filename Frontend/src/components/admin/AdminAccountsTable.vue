
<script setup lang="ts">
import { ref } from "vue";
import type { AdminUser, Role } from "../../types/admin";
import AdminModuleSlot from "./AdminModuleSlot.vue";

defineProps<{
  users: AdminUser[];
  highlightedUserId?: string | null;
}>();

const emit = defineEmits<{
  changeRole: [userId: string, newRole: Role];
  deleteUser: [userId: string];
}>();

const editingUserId = ref<string | null>(null);
const pendingRole = ref<Role>("Cursist");
const confirmDeleteId = ref<string | null>(null);

const availableRoles: Role[] = ["Cursist", "Lector"];

function startRoleEdit(user: AdminUser) {
  if (user.role === "Admin") {
    return;
  }
  confirmDeleteId.value = null;
  editingUserId.value = user.id;
  pendingRole.value = user.role;
}

function saveRoleEdit(userId: string) {
  emit("changeRole", userId, pendingRole.value);
  editingUserId.value = null;
}

function cancelRoleEdit() {
  editingUserId.value = null;
}

function requestDelete(userId: string) {
  editingUserId.value = null;
  confirmDeleteId.value = userId;
}

function confirmDelete(userId: string) {
  emit("deleteUser", userId);
  confirmDeleteId.value = null;
}

function cancelDelete() {
  confirmDeleteId.value = null;
}

function getRoleBadgeClass(role: Role): string {
  if (role === "Admin") {
    return "border-pxl-gold bg-pxl-black text-pxl-white";
  }
  return "border-pxl-black/15 bg-pxl-canvas text-pxl-black";
}

const primaryButtonClass =
  "cursor-pointer rounded-full border border-pxl-black bg-pxl-black px-3.5 py-1 text-xs font-semibold text-pxl-white transition hover:border-pxl-gold hover:bg-pxl-black hover:text-pxl-white focus:outline-none focus:ring-2 focus:ring-pxl-gold";

const secondaryButtonClass =
  "cursor-pointer rounded-full border border-pxl-black/30 bg-pxl-white px-3 py-1 text-xs font-medium text-pxl-black transition hover:border-pxl-black hover:bg-pxl-black hover:text-pxl-white focus:outline-none focus:ring-2 focus:ring-pxl-gold";

const actionButtonClass =
  "cursor-pointer rounded-full border border-pxl-black bg-pxl-white px-4 py-1 text-xs font-semibold text-pxl-black transition hover:bg-pxl-black hover:text-pxl-white focus:outline-none focus:ring-2 focus:ring-pxl-gold";
</script>

<template>
  <AdminModuleSlot title="Recente accounts">
    <div v-if="users.length > 0" class="overflow-x-auto">
      <table
        aria-label="Recente accounts"
        class="font-body w-full border-collapse text-left text-sm"
      >
        <thead>
          <tr
            class="border-y border-pxl-black/10 bg-[#F7F6F2] text-xs font-medium text-pxl-black/60"
          >
            <th class="px-6 py-3 font-medium">Naam</th>
            <th class="px-4 py-3 font-medium">E-mailadres</th>
            <th class="px-4 py-3 font-medium">Rol</th>
            <th class="px-4 py-3 font-medium">Aangemaakt</th>
            <th class="px-6 py-3 font-medium">Acties</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-pxl-black/10">
          <tr
            v-for="user in users"
            :key="user.id"
            :class="[
              'transition',
              highlightedUserId === user.id
                ? 'bg-[#FAF5E4]'
                : 'bg-pxl-white hover:bg-pxl-canvas/50',
            ]"
          >
            <td class="px-6 py-4 font-medium text-pxl-black">
              {{ user.firstname }} {{ user.lastname }}
            </td>

            <td class="px-4 py-4 text-pxl-black/80">
              {{ user.email }}
            </td>

            <td class="px-4 py-4">
              <span
                :class="[
                  'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium',
                  getRoleBadgeClass(user.role),
                ]"
              >
                {{ user.role }}
              </span>
            </td>

            <td class="px-4 py-4 text-pxl-black/80">
              {{ user.createdAt }}
            </td>

            <td class="px-6 py-4">
              <!-- Inline rol wijzigen -->
              <div
                v-if="editingUserId === user.id"
                class="flex flex-wrap items-center gap-2"
              >
                <label
                  :for="`role-select-${user.id}`"
                  class="sr-only"
                >
                  Kies nieuwe rol voor {{ user.firstname }} {{ user.lastname }}
                </label>

                <select
                  :id="`role-select-${user.id}`"
                  v-model="pendingRole"
                  class="cursor-pointer rounded-full border border-pxl-black bg-pxl-white px-3 py-1 text-xs font-medium text-pxl-black outline-none focus:border-pxl-gold focus:ring-2 focus:ring-pxl-gold/40"
                >
                  <option
                    v-for="roleOption in availableRoles"
                    :key="roleOption"
                    :value="roleOption"
                  >
                    {{ roleOption }}
                  </option>
                </select>

                <button
                  type="button"
                  :class="primaryButtonClass"
                  @click="saveRoleEdit(user.id)"
                >
                  Opslaan
                </button>

                <button
                  type="button"
                  :class="secondaryButtonClass"
                  @click="cancelRoleEdit"
                >
                  Annuleer
                </button>
              </div>

              <!-- Inline verwijderbevestiging -->
              <div
                v-else-if="confirmDeleteId === user.id"
                class="flex flex-wrap items-center gap-2"
              >
                <span class="text-xs italic text-pxl-black/75">
                  Verwijderen?
                </span>

                <button
                  type="button"
                  :class="primaryButtonClass"
                  @click="confirmDelete(user.id)"
                >
                  Bevestig
                </button>

                <button
                  type="button"
                  :class="secondaryButtonClass"
                  @click="cancelDelete"
                >
                  Annuleer
                </button>
              </div>

              <!-- Standaard actieknoppen -->
              <div
                v-else
                class="flex flex-wrap items-center gap-2"
              >
                <button
                  v-if="user.role !== 'Admin'"
                  type="button"
                  :class="actionButtonClass"
                  @click="startRoleEdit(user)"
                >
                  Rol wijzigen
                </button>

                <button
                  type="button"
                  :class="actionButtonClass"
                  @click="requestDelete(user.id)"
                >
                  Verwijderen
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else
      class="border-t border-pxl-black/10 px-6 py-10 text-center"
    >
      <p class="font-heading text-base text-pxl-black">
        Geen accounts beschikbaar
      </p>

      <p class="font-body mt-1 text-xs italic text-pxl-black/60">
        Er zijn momenteel geen recente accounts om weer te geven.
      </p>
    </div>
  </AdminModuleSlot>
</template>
