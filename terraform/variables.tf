# ==============================================================================
# Variables Configuration
# ==============================================================================

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
  description = "Azure region for the resource group and resources"
  type        = string
  default     = "switzerlandnorth"
}

variable "project_name" {
  description = "Project prefix name used for resources"
  type        = string
  default     = "cheap-pg"
}

variable "allowed_ip_addresses" {
  description = "Optional map of developer/client IP addresses to whitelist on PostgreSQL Flexible Server (e.g. { 'dev-home' = '203.0.113.10' })"
  type        = map(string)
  default     = {}
}

variable "alert_email" {
  description = "Email address for monitoring alert notifications"
  type        = string
  default     = "student@pxl.be"
}

variable "api_image" {
  description = "Container image for the Healthcare API Container App"
  type        = string
  default     = "mcr.microsoft.com/kured:1.13.1"
}

variable "registry_server" {
  description = "Optional container registry server (e.g. ghcr.io). Leave empty for public images"
  type        = string
  default     = ""
}

variable "registry_username" {
  description = "Optional username for the container registry"
  type        = string
  default     = ""
}

variable "registry_password_secret" {
  description = "Optional personal access token / secret for private container registry"
  type        = string
  default     = ""
  sensitive   = true
}
