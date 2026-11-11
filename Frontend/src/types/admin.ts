export type Role = "Cursist" | "Lector" | "Admin";

export type UserStatus = "Actief" | "Geblokkeerd";

export interface AdminUser {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface AdminStatCard {
  id: string;
  title: string;
  value: number | string;
}

export interface AdminNotification {
  type: "success" | "info";
  message: string;
}
