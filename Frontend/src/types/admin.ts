export type Role = "Cursist" | "Lector" | "Admin";
export type ApiRole = "CURSIST" | "LECTOR" | "ADMIN";

export type UserStatus = "Actief" | "Geblokkeerd";

export interface AdminAccountResponse {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: ApiRole;
  createdAt: string | null;
}

export interface AdminUser {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface AdminStats {
  totalAccounts: number;
  lectoren: number;
  cursisten: number;
}

export interface AdminStatCard {
  id: string;
  title: string;
  value: number | string;
}

export interface AdminNotification {
  type: "success" | "info" | "error";
  message: string;
}
