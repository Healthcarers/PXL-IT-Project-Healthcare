terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote backend for state management in CI/CD (GitHub Actions)
  # Parameters are passed during `terraform init -backend-config=...`
  # backend "azurerm" {}
}

provider "azurerm" {
  features {}
}

data "azurerm_client_config" "current" {}

# ------------------------------------------------------------------------------
# Common & Resource Group
# ------------------------------------------------------------------------------
resource "random_string" "suffix" {
  length  = 5
  special = false
  upper   = false
}

resource "azurerm_resource_group" "rg" {
  name     = "${var.project_name}-rg"
  location = var.location

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# ------------------------------------------------------------------------------
# Security: Managed Identity & Azure Key Vault
# ------------------------------------------------------------------------------
resource "azurerm_user_assigned_identity" "api_identity" {
  name                = "${var.project_name}-api-identity"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

resource "azurerm_key_vault" "kv" {
  name                       = substr(lower("${replace(var.project_name, "_", "-")}-kv-${random_string.suffix.result}"), 0, 24)
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  purge_protection_enabled   = false
  soft_delete_retention_days = 7
  rbac_authorization_enabled = true

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# Grant deployer (Terraform runner) rights to manage secrets in Key Vault
resource "azurerm_role_assignment" "deployer_secrets_officer" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Grant Container App Managed Identity rights to read secrets from Key Vault
resource "azurerm_role_assignment" "api_secrets_user" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.api_identity.principal_id
}

# Key Vault Secrets
resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = var.db_password
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_role_assignment.deployer_secrets_officer]
}

resource "azurerm_key_vault_secret" "appinsights_connection_string" {
  name         = "appinsights-connection-string"
  value        = azurerm_application_insights.appinsights.connection_string
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_role_assignment.deployer_secrets_officer]
}

# ------------------------------------------------------------------------------
# Monitoring & Alerting (Log Analytics, App Insights, Alerts)
# ------------------------------------------------------------------------------
resource "azurerm_log_analytics_workspace" "logs" {
  name                = "${var.project_name}-log"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  daily_quota_gb      = 0.5 # Protect strictly against unexpected costs during load testing

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

resource "azurerm_application_insights" "appinsights" {
  name                = "${var.project_name}-ai"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  workspace_id        = azurerm_log_analytics_workspace.logs.id
  application_type    = "java"

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

resource "azurerm_monitor_diagnostic_setting" "db_diagnostics" {
  name                       = "db-diagnostics"
  target_resource_id         = azurerm_postgresql_flexible_server.db.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

resource "azurerm_monitor_action_group" "email_alerts" {
  name                = "${var.project_name}-action-group"
  resource_group_name = azurerm_resource_group.rg.name
  short_name          = "alerts"

  email_receiver {
    name          = "EmailAlert"
    email_address = var.alert_email
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

resource "azurerm_monitor_metric_alert" "db_cpu_alert" {
  name                = "${var.project_name}-db-cpu-high"
  resource_group_name = azurerm_resource_group.rg.name
  scopes              = [azurerm_postgresql_flexible_server.db.id]
  description         = "Triggers when average PostgreSQL CPU percent exceeds 80%"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "cpu_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.email_alerts.id
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

resource "azurerm_monitor_metric_alert" "api_requests_alert" {
  name                = "${var.project_name}-api-high-requests"
  resource_group_name = azurerm_resource_group.rg.name
  scopes              = [azurerm_container_app.api.id]
  description         = "Triggers when Container App request volume exceeds threshold"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.App/containerApps"
    metric_name      = "Requests"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 100
  }

  action {
    action_group_id = azurerm_monitor_action_group.email_alerts.id
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# ------------------------------------------------------------------------------
# Database: Azure PostgreSQL Flexible Server
# ------------------------------------------------------------------------------
resource "azurerm_postgresql_flexible_server" "db" {
  name                   = "${var.project_name}-${random_string.suffix.result}"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  version                = "16"
  administrator_login    = var.db_user
  administrator_password = var.db_password

  # Cheapest burstable tier: 1 vCore, 2 GB RAM (~$0.017/hr, $0 when destroyed)
  sku_name = "B_Standard_B1ms"

  # Minimum storage (32 GB) & disable auto-grow to prevent cost increases
  storage_mb        = 32768
  auto_grow_enabled = false

  lifecycle {
    ignore_changes = [zone]
  }

  # Minimum backup retention (included free)
  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  # Public access with secured firewall rules
  public_network_access_enabled = true

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# Application database
resource "azurerm_postgresql_flexible_server_database" "appdb" {
  name      = var.db_name
  server_id = azurerm_postgresql_flexible_server.db.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Secured firewall rule: allow Azure internal services (e.g. Container Apps) to connect
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "allow-azure-services"
  server_id        = azurerm_postgresql_flexible_server.db.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Optional developer IP whitelist rules
resource "azurerm_postgresql_flexible_server_firewall_rule" "allowed_ips" {
  for_each         = var.allowed_ip_addresses
  name             = each.key
  server_id        = azurerm_postgresql_flexible_server.db.id
  start_ip_address = each.value
  end_ip_address   = each.value
}

# ------------------------------------------------------------------------------
# API Hosting & Auto-Scaling (Azure Container Apps)
# ------------------------------------------------------------------------------
resource "azurerm_container_app_environment" "env" {
  name                       = "${var.project_name}-cae"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id
  logs_destination           = "log-analytics"

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

resource "azurerm_container_app" "api" {
  name                         = "${var.project_name}-api"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api_identity.id]
  }

  secret {
    name  = "db-password"
    value = azurerm_key_vault_secret.db_password.value
  }

  dynamic "secret" {
    for_each = var.registry_password_secret != "" ? [1] : []
    content {
      name  = "registry-password"
      value = var.registry_password_secret
    }
  }

  dynamic "registry" {
    for_each = var.registry_server != "" ? [1] : []
    content {
      server               = var.registry_server
      username             = var.registry_username
      password_secret_name = "registry-password"
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8090
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }

    cors {
      allowed_origins = ["*"]
      allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      allowed_headers = ["*"]
    }
  }

  template {
    min_replicas = 1
    max_replicas = 5

    http_scale_rule {
      name                = "http-concurrency-rule"
      concurrent_requests = "20"
    }

    container {
      name   = "api"
      image  = var.api_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "PORT"
        value = "8090"
      }

      env {
        name  = "HTTP_PORT"
        value = "8090"
      }

      env {
        name  = "SPRING_DATASOURCE_URL"
        value = "jdbc:postgresql://${azurerm_postgresql_flexible_server.db.fqdn}:5432/${var.db_name}?sslmode=require"
      }

      env {
        name  = "SPRING_DATASOURCE_USERNAME"
        value = var.db_user
      }

      env {
        name        = "DB_PASSWORD"
        secret_name = "db-password"
      }

      env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = azurerm_application_insights.appinsights.connection_string
      }

      startup_probe {
        port          = 8090
        transport     = "TCP"
        initial_delay = 10
      }

      liveness_probe {
        port          = 8090
        transport     = "TCP"
        initial_delay = 10
      }
    }
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }

  depends_on = [
    azurerm_role_assignment.api_secrets_user,
    azurerm_key_vault_secret.db_password
  ]
}
