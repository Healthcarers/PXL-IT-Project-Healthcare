# ==============================================================================
# Variables Configuration
# ==============================================================================

variable "project_name" {
  description = "Project prefix name used for all Azure resources"
  type        = string
  default     = "pxl-healthcare"
}

variable "location" {
  description = "Azure region for the resource group and resources"
  type        = string
  default     = "switzerlandnorth"
}

variable "db_location" {
  description = "Azure region for PostgreSQL Flexible Server (polandcentral has unrestricted B_Standard_B1ms capacity for Azure for Students)"
  type        = string
  default     = "polandcentral"
}

# ------------------------------------------------------------------------------
# Database
# ------------------------------------------------------------------------------
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

variable "allowed_ip_addresses" {
  description = "Optional map of developer/client IP addresses to whitelist on PostgreSQL Flexible Server (e.g. { 'dev-home' = '203.0.113.10' })"
  type        = map(string)
  default     = {}
}

# ------------------------------------------------------------------------------
# Security & Secrets
# ------------------------------------------------------------------------------
variable "jwt_secret" {
  description = "Optional Base64-encoded 256-bit HS256 secret for Spring Boot JWT signing. Leave empty to auto-generate securely via Terraform."
  type        = string
  default     = ""
  sensitive   = true
}

# ------------------------------------------------------------------------------
# Container Registry & Images
# ------------------------------------------------------------------------------
variable "use_acr" {
  description = "Provision an Azure Container Registry (Basic) and pull images via Managed Identity (AcrPull)"
  type        = bool
  default     = true
}

variable "image_tag" {
  description = "Container image tag deployed from ACR when api_image/web_image are not explicitly set"
  type        = string
  default     = "latest"
}

variable "api_image" {
  description = "Optional override container image for the internal Healthcare Spring Boot API"
  type        = string
  default     = ""
}

variable "web_image" {
  description = "Optional override container image for the public Nginx Gateway & Vue 3 Frontend"
  type        = string
  default     = ""
}

variable "registry_server" {
  description = "Optional external container registry server (used only when use_acr = false)"
  type        = string
  default     = ""
}

variable "registry_username" {
  description = "Optional username for external container registry"
  type        = string
  default     = ""
}

variable "registry_password_secret" {
  description = "Optional password/token for external container registry"
  type        = string
  default     = ""
  sensitive   = true
}

# ------------------------------------------------------------------------------
# Auto-Scaling & L7 Rate Limiting (DDoS Shield)
# ------------------------------------------------------------------------------
variable "api_min_replicas" {
  description = "Minimum replica count for the API Container App"
  type        = number
  default     = 1
}

variable "api_max_replicas" {
  description = "Maximum replica count for the API Container App (caps budget during floods)"
  type        = number
  default     = 5
}

variable "api_scale_concurrent_requests" {
  description = "Concurrent HTTP requests per replica before KEDA scales the API out"
  type        = number
  default     = 2
}

variable "web_min_replicas" {
  description = "Minimum replica count for the Nginx Web Gateway Container App"
  type        = number
  default     = 1
}

variable "web_max_replicas" {
  description = "Maximum replica count for the Nginx Web Gateway Container App"
  type        = number
  default     = 3
}

variable "web_scale_concurrent_requests" {
  description = "Concurrent HTTP requests per replica before KEDA scales the Web Gateway out"
  type        = number
  default     = 20
}

variable "nginx_auth_rate_limit" {
  description = "Nginx per-IP rate limit on /api/auth/ endpoints (brute-force & DDoS protection)"
  type        = string
  default     = "10r/s"
}

variable "nginx_auth_burst" {
  description = "Nginx burst allowance on /api/auth/ before returning HTTP 429"
  type        = number
  default     = 15
}

variable "nginx_api_rate_limit" {
  description = "Nginx per-IP rate limit on /api/ endpoints before returning HTTP 429"
  type        = string
  default     = "300r/s"
}

variable "nginx_api_burst" {
  description = "Nginx burst allowance on /api/ before returning HTTP 429"
  type        = number
  default     = 600
}

variable "nginx_max_conns_per_ip" {
  description = "Maximum concurrent connections per client IP at the Nginx Gateway"
  type        = number
  default     = 150
}

# ------------------------------------------------------------------------------
# Monitoring, Alerting & Student Budget Controls
# ------------------------------------------------------------------------------
variable "alert_email" {
  description = "Email address for Azure Monitor alert notifications"
  type        = string
  default     = "student@pxl.be"
}

variable "availability_test_frequency" {
  description = "Frequency in seconds for Application Insights multi-region availability ping test (300, 600, or 900)"
  type        = number
  default     = 300
}

variable "enable_budget_alert" {
  description = "Create an Azure Consumption budget alert (set false on Azure for Students where Microsoft.Consumption APIs are unsupported)"
  type        = bool
  default     = false
}

variable "monthly_budget_amount" {
  description = "Monthly budget cap in USD if enable_budget_alert is true"
  type        = number
  default     = 20
}

variable "team_monitoring_reader_object_ids" {
  description = "PXL Entra ID Object IDs of project teammates granted read-only Monitoring Reader access to the Azure Portal dashboard and metrics"
  type        = list(string)
  default = [
    "35f236ba-30c8-49de-b686-86082e3e5f67", # Brent Caes (Brent.Caes@student.pxl.be)
    "2f12a647-122f-4046-b0e2-3e07826efe2b", # Filip Belien (Filip.Belien@student.pxl.be)
    "c5a9b929-8207-4c74-b6d9-79ca7ac970bf", # Jonas Van Houdt Sperber (Jonas.VanHoudtSperber@student.pxl.be)
    "55e51263-e6ea-4b1a-b2e5-334798d11dcc", # Wout Verhemeldonck (Wout.Verhemeldonck@student.pxl.be)
    "04702328-87cb-42f4-a8fb-f12a0ce0a200"  # Rube Stifter (Rube.Stifter@student.pxl.be)
  ]
}
