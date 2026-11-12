variable "db_user" {
  description = "Administrator login name for Azure PostgreSQL Flexible Server"
  type        = string
  default     = "pgadmin"
}

variable "db_password" {
  description = "Administrator password for Azure PostgreSQL Flexible Server"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database name created inside the PostgreSQL server"
  type        = string
  default     = "PXL_Healthcare_DB"
}

variable "location" {
  description = "Azure region for the resource group and PostgreSQL server"
  type        = string
  default     = "switzerlandnorth"
}

variable "project_name" {
  description = "Project prefix name used for resources"
  type        = string
  default     = "cheap-pg"
}
