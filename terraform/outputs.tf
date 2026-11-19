# ==============================================================================
# Public Application & Gateway Outputs
# ==============================================================================

output "web_url" {
  description = "Public HTTPS URL of the Healthcare Frontend & Nginx Security Gateway"
  value       = "https://${azurerm_container_app.web.ingress[0].fqdn}"
}

output "web_fqdn" {
  description = "Fully qualified domain name of the public Web Gateway"
  value       = azurerm_container_app.web.ingress[0].fqdn
}

# ==============================================================================
# Internal API Hosting Outputs
# ==============================================================================

output "api_url" {
  description = "Internal HTTPS URL of the Spring Boot API inside the Container Apps Environment"
  value       = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "container_app_fqdn" {
  description = "Internal FQDN of the Spring Boot API Container App"
  value       = azurerm_container_app.api.ingress[0].fqdn
}

# ==============================================================================
# Database Outputs
# ==============================================================================

output "host" {
  description = "Fully qualified domain name (FQDN) of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.db.fqdn
}

output "port" {
  description = "Port number of the PostgreSQL service"
  value       = 5432
}

output "database" {
  description = "Name of the PostgreSQL database"
  value       = azurerm_postgresql_flexible_server_database.appdb.name
}

output "user" {
  description = "Administrator username"
  value       = azurerm_postgresql_flexible_server.db.administrator_login
}

output "jdbc_url" {
  description = "Spring Boot JDBC connection URL"
  value       = "jdbc:postgresql://${azurerm_postgresql_flexible_server.db.fqdn}:5432/${azurerm_postgresql_flexible_server_database.appdb.name}?sslmode=require"
}

output "connection_url" {
  description = "Standard PostgreSQL connection URI (password excluded for security)"
  value       = "postgresql://${azurerm_postgresql_flexible_server.db.administrator_login}@${azurerm_postgresql_flexible_server.db.fqdn}:5432/${azurerm_postgresql_flexible_server_database.appdb.name}?sslmode=require"
}

output "psql_command" {
  description = "PSQL CLI command to connect to the database"
  value       = "psql -h ${azurerm_postgresql_flexible_server.db.fqdn} -p 5432 -U ${azurerm_postgresql_flexible_server.db.administrator_login} -d ${azurerm_postgresql_flexible_server_database.appdb.name} sslmode=require"
}

# ==============================================================================
# Security & Monitoring Outputs
# ==============================================================================

output "key_vault_name" {
  description = "Name of the Azure Key Vault"
  value       = azurerm_key_vault.kv.name
}

output "application_insights_name" {
  description = "Name of the Application Insights instance"
  value       = azurerm_application_insights.appinsights.name
}

output "acr_name" {
  description = "Name of the Azure Container Registry (when use_acr = true)"
  value       = var.use_acr ? azurerm_container_registry.acr[0].name : ""
}

output "acr_login_server" {
  description = "Login server URL of the Azure Container Registry (when use_acr = true)"
  value       = var.use_acr ? azurerm_container_registry.acr[0].login_server : ""
}

output "log_analytics_workspace_name" {
  description = "Name of the Log Analytics Workspace"
  value       = azurerm_log_analytics_workspace.logs.name
}

output "dashboard_name" {
  description = "Name of the Azure Portal Monitoring Dashboard"
  value       = azurerm_portal_dashboard.monitoring.name
}

output "dashboard_url" {
  description = "Direct Azure Portal URL for the live monitoring, scaling & security dashboard"
  value       = "https://portal.azure.com/#@${data.azurerm_client_config.current.tenant_id}/dashboard/arm${azurerm_portal_dashboard.monitoring.id}"
}

output "availability_test_name" {
  description = "Name of the Application Insights Availability Ping Test"
  value       = azurerm_application_insights_standard_web_test.api_availability.name
}
