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
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

data "azurerm_client_config" "current" {}

locals {
  common_tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }

  api_app_name = "${var.project_name}-api"
  web_app_name = "${var.project_name}-web"
  web_fqdn     = "${local.web_app_name}.${azurerm_container_app_environment.env.default_domain}"

  effective_jwt_secret = (
    var.jwt_secret != "" ? var.jwt_secret : random_bytes.jwt_secret.base64
  )

  effective_registry_server = (
    var.use_acr ? azurerm_container_registry.acr[0].login_server : var.registry_server
  )

  effective_api_image = (
    var.api_image != ""
    ? var.api_image
    : (var.use_acr ? "${azurerm_container_registry.acr[0].login_server}/healthcare-api:${var.image_tag}" : "")
  )

  effective_web_image = (
    var.web_image != ""
    ? var.web_image
    : (var.use_acr ? "${azurerm_container_registry.acr[0].login_server}/healthcare-web:${var.image_tag}" : "")
  )
}

# ------------------------------------------------------------------------------
# Common & Resource Group
# ------------------------------------------------------------------------------
resource "random_string" "suffix" {
  length  = 5
  special = false
  upper   = false
}

resource "random_bytes" "jwt_secret" {
  length = 32
}

resource "azurerm_resource_group" "rg" {
  name     = "${var.project_name}-rg"
  location = var.location
  tags     = local.common_tags
}

# ------------------------------------------------------------------------------
# Security: Least-Privilege Managed Identities, Key Vault & Container Registry
# ------------------------------------------------------------------------------
resource "azurerm_user_assigned_identity" "api_identity" {
  name                = "${var.project_name}-api-identity"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  tags                = local.common_tags
}

resource "azurerm_user_assigned_identity" "web_identity" {
  name                = "${var.project_name}-web-identity"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  tags                = local.common_tags
}

resource "azurerm_container_registry" "acr" {
  count               = var.use_acr ? 1 : 0
  name                = substr(lower("${replace(var.project_name, "/[^a-zA-Z0-9]/", "")}acr${random_string.suffix.result}"), 0, 50)
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.common_tags
}

resource "azurerm_role_assignment" "api_acr_pull" {
  count                = var.use_acr ? 1 : 0
  scope                = azurerm_container_registry.acr[0].id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.api_identity.principal_id
}

resource "azurerm_role_assignment" "web_acr_pull" {
  count                = var.use_acr ? 1 : 0
  scope                = azurerm_container_registry.acr[0].id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.web_identity.principal_id
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
  tags                       = local.common_tags
}

# Grant deployer (Terraform runner) rights to manage secrets in Key Vault
resource "azurerm_role_assignment" "deployer_secrets_officer" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Only the API identity can read Key Vault secrets; the public Web Gateway has zero KV access
resource "azurerm_role_assignment" "api_secrets_user" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.api_identity.principal_id
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = var.db_password
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_role_assignment.deployer_secrets_officer]
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = local.effective_jwt_secret
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
# Monitoring & Alerting (Log Analytics, Application Insights, Metric Alerts)
# ------------------------------------------------------------------------------
resource "azurerm_log_analytics_workspace" "logs" {
  name                = "${var.project_name}-log"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  daily_quota_gb      = 0.5 # Hard cap protects Student credit during burst/DDoS tests
  tags                = local.common_tags
}

resource "azurerm_application_insights" "appinsights" {
  name                = "${var.project_name}-ai"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  workspace_id        = azurerm_log_analytics_workspace.logs.id
  application_type    = "java"
  tags                = local.common_tags
}

resource "azurerm_monitor_diagnostic_setting" "db_diagnostics" {
  name                       = "${var.project_name}-db-diagnostics"
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
  name                = "${var.project_name}-alerts"
  resource_group_name = azurerm_resource_group.rg.name
  short_name          = "pxlhealth"

  email_receiver {
    name          = "TeamAlert"
    email_address = var.alert_email
  }

  tags = local.common_tags
}

locals {
  metric_alerts = {
    "db-cpu-high" = {
      scope            = azurerm_postgresql_flexible_server.db.id
      description      = "Triggers when average PostgreSQL CPU percent exceeds 80%"
      severity         = 2
      frequency        = "PT1M"
      window_size      = "PT5M"
      metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
      metric_name      = "cpu_percent"
      aggregation      = "Average"
      operator         = "GreaterThan"
      threshold        = 80
    }
    "db-storage-high" = {
      scope            = azurerm_postgresql_flexible_server.db.id
      description      = "Triggers when average PostgreSQL allocated storage exceeds 80%"
      severity         = 2
      frequency        = "PT5M"
      window_size      = "PT15M"
      metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
      metric_name      = "storage_percent"
      aggregation      = "Average"
      operator         = "GreaterThan"
      threshold        = 80
    }
    "db-connections-high" = {
      scope            = azurerm_postgresql_flexible_server.db.id
      description      = "Triggers when PostgreSQL active connections exceed 35"
      severity         = 2
      frequency        = "PT1M"
      window_size      = "PT5M"
      metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
      metric_name      = "active_connections"
      aggregation      = "Maximum"
      operator         = "GreaterThan"
      threshold        = 35
    }
    "web-high-requests" = {
      scope            = azurerm_container_app.web.id
      description      = "Triggers when public Nginx Web Gateway receives a traffic or DDoS spike"
      severity         = 2
      frequency        = "PT1M"
      window_size      = "PT5M"
      metric_namespace = "Microsoft.App/containerApps"
      metric_name      = "Requests"
      aggregation      = "Total"
      operator         = "GreaterThan"
      threshold        = 500
    }
    "api-high-requests" = {
      scope            = azurerm_container_app.api.id
      description      = "Triggers when internal API Container App request volume exceeds threshold"
      severity         = 2
      frequency        = "PT1M"
      window_size      = "PT5M"
      metric_namespace = "Microsoft.App/containerApps"
      metric_name      = "Requests"
      aggregation      = "Total"
      operator         = "GreaterThan"
      threshold        = 100
    }
    "api-auto-scaled" = {
      scope            = azurerm_container_app.api.id
      description      = "Triggers when API Container App auto-scales above 1 replica"
      severity         = 3
      frequency        = "PT1M"
      window_size      = "PT5M"
      metric_namespace = "Microsoft.App/containerApps"
      metric_name      = "Replicas"
      aggregation      = "Maximum"
      operator         = "GreaterThan"
      threshold        = 1
    }
    "api-restarts" = {
      scope            = azurerm_container_app.api.id
      description      = "Triggers when an API container replica restarts unexpectedly"
      severity         = 1
      frequency        = "PT1M"
      window_size      = "PT5M"
      metric_namespace = "Microsoft.App/containerApps"
      metric_name      = "RestartCount"
      aggregation      = "Total"
      operator         = "GreaterThan"
      threshold        = 0
    }
  }
}

resource "azurerm_monitor_metric_alert" "alerts" {
  for_each = local.metric_alerts

  name                = "${var.project_name}-${each.key}"
  resource_group_name = azurerm_resource_group.rg.name
  scopes              = [each.value.scope]
  description         = each.value.description
  severity            = each.value.severity
  frequency           = each.value.frequency
  window_size         = each.value.window_size

  criteria {
    metric_namespace = each.value.metric_namespace
    metric_name      = each.value.metric_name
    aggregation      = each.value.aggregation
    operator         = each.value.operator
    threshold        = each.value.threshold
  }

  action {
    action_group_id = azurerm_monitor_action_group.email_alerts.id
  }

  tags = local.common_tags
}

resource "azurerm_monitor_metric_alert" "availability_failed" {
  name                = "${var.project_name}-availability-down"
  resource_group_name = azurerm_resource_group.rg.name
  scopes = [
    azurerm_application_insights_standard_web_test.api_availability.id,
    azurerm_application_insights.appinsights.id,
  ]
  description = "Triggers when 2 or more Azure geo-locations fail the /api/channels HTTPS availability probe"
  severity    = 1
  frequency   = "PT5M"
  window_size = "PT15M"

  application_insights_web_test_location_availability_criteria {
    web_test_id           = azurerm_application_insights_standard_web_test.api_availability.id
    component_id          = azurerm_application_insights.appinsights.id
    failed_location_count = 2
  }

  action {
    action_group_id = azurerm_monitor_action_group.email_alerts.id
  }

  tags = local.common_tags
}

resource "azurerm_consumption_budget_resource_group" "student_budget" {
  count             = var.enable_budget_alert ? 1 : 0
  name              = "${var.project_name}-budget"
  resource_group_id = azurerm_resource_group.rg.id
  amount            = var.monthly_budget_amount
  time_grain        = "Monthly"

  time_period {
    start_date = "${formatdate("YYYY-MM", timestamp())}-01T00:00:00Z"
  }

  notification {
    enabled        = true
    threshold      = 50
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = [var.alert_email]
  }

  notification {
    enabled        = true
    threshold      = 85
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = [var.alert_email]
  }

  lifecycle {
    ignore_changes = [time_period]
  }
}

# ------------------------------------------------------------------------------
# Database: Azure PostgreSQL Flexible Server
# ------------------------------------------------------------------------------
resource "azurerm_postgresql_flexible_server" "db" {
  name                   = "${var.project_name}-db-${random_string.suffix.result}"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = var.db_location
  version                = "16"
  administrator_login    = var.db_user
  administrator_password = var.db_password

  # Cheapest burstable tier: 1 vCore, 2 GB RAM (~$0.017/hr, $0/hr when destroyed)
  sku_name = "B_Standard_B1ms"

  # Minimum storage (32 GB) & disable auto-grow to prevent surprise costs
  storage_mb        = 32768
  auto_grow_enabled = false

  lifecycle {
    ignore_changes = [zone]
  }

  # Minimum backup retention (included free)
  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  # Public access restricted by firewall rules
  public_network_access_enabled = true

  tags = local.common_tags
}

resource "azurerm_postgresql_flexible_server_database" "appdb" {
  name      = var.db_name
  server_id = azurerm_postgresql_flexible_server.db.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Allow ONLY our Container Apps Environment's static outbound IP to connect over SSL
# (blocks both the public internet and all other Azure tenants/subscriptions)
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_container_app_env" {
  name             = "allow-container-app-env"
  server_id        = azurerm_postgresql_flexible_server.db.id
  start_ip_address = azurerm_container_app_environment.env.static_ip_address
  end_ip_address   = azurerm_container_app_environment.env.static_ip_address
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
# Networking & Container Apps Environment (Free VNet + Workload Profiles Consumption)
# ------------------------------------------------------------------------------
resource "azurerm_virtual_network" "vnet" {
  name                = "${var.project_name}-vnet"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["10.0.0.0/16"]
  tags                = local.common_tags
}

resource "azurerm_subnet" "aca_subnet" {
  name                 = "${var.project_name}-aca-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.0.0/26"]

  delegation {
    name = "aca-delegation"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_container_app_environment" "env" {
  name                       = "${var.project_name}-cae"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  infrastructure_subnet_id   = azurerm_subnet.aca_subnet.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id
  logs_destination           = "log-analytics"

  # Standard Consumption Workload Profiles environment ($0 VNet/cluster fee + serverless free grant,
  # unlocking internal service discovery for external_enabled=false and Key Vault secret refs).
  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  tags = local.common_tags
}

# ------------------------------------------------------------------------------
# Tier 1 (Internal): Spring Boot Healthcare API + Auto-Scaling
# ------------------------------------------------------------------------------
resource "azurerm_container_app" "api" {
  name                         = local.api_app_name
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api_identity.id]
  }

  secret {
    name                = "db-password"
    key_vault_secret_id = azurerm_key_vault_secret.db_password.versionless_id
    identity            = azurerm_user_assigned_identity.api_identity.id
  }

  secret {
    name                = "jwt-secret"
    key_vault_secret_id = azurerm_key_vault_secret.jwt_secret.versionless_id
    identity            = azurerm_user_assigned_identity.api_identity.id
  }

  secret {
    name                = "appinsights-connection-string"
    key_vault_secret_id = azurerm_key_vault_secret.appinsights_connection_string.versionless_id
    identity            = azurerm_user_assigned_identity.api_identity.id
  }

  dynamic "secret" {
    for_each = !var.use_acr && var.registry_password_secret != "" ? [1] : []
    content {
      name  = "registry-password"
      value = var.registry_password_secret
    }
  }

  dynamic "registry" {
    for_each = local.effective_registry_server != "" ? [1] : []
    content {
      server               = local.effective_registry_server
      identity             = var.use_acr ? azurerm_user_assigned_identity.api_identity.id : null
      username             = var.use_acr ? null : var.registry_username
      password_secret_name = !var.use_acr && var.registry_password_secret != "" ? "registry-password" : null
    }
  }

  # Internal-only ingress: reachable only via the Nginx Web Gateway
  ingress {
    external_enabled = false
    target_port      = 8090
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = var.api_min_replicas
    max_replicas = var.api_max_replicas

    http_scale_rule {
      name                = "http-concurrency-rule"
      concurrent_requests = tostring(var.api_scale_concurrent_requests)
    }

    container {
      name   = "api"
      image  = local.effective_api_image
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
        name        = "SECURITY_JWT_SECRET"
        secret_name = "jwt-secret"
      }

      env {
        name        = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        secret_name = "appinsights-connection-string"
      }

      # Suppress 40Hz internal @Scheduled waveform ticks from App Insights Requests telemetry
      env {
        name  = "APPLICATIONINSIGHTS_INSTRUMENTATION_SPRING_SCHEDULING_ENABLED"
        value = "false"
      }

      # Prevent SQL log flooding during load tests & stay under PostgreSQL B1ms connection limit
      env {
        name  = "SPRING_JPA_SHOW_SQL"
        value = "false"
      }

      env {
        name  = "SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE"
        value = "5"
      }

      env {
        name  = "SERVER_FORWARD_HEADERS_STRATEGY"
        value = "framework"
      }

      startup_probe {
        port                    = 8090
        transport               = "TCP"
        initial_delay           = 10
        interval_seconds        = 5
        failure_count_threshold = 18
      }

      readiness_probe {
        port                    = 8090
        transport               = "HTTP"
        path                    = "/api/channels"
        initial_delay           = 15
        interval_seconds        = 10
        failure_count_threshold = 6
      }

      liveness_probe {
        port                    = 8090
        transport               = "HTTP"
        path                    = "/api/channels"
        initial_delay           = 30
        interval_seconds        = 15
        failure_count_threshold = 4
      }
    }
  }

  tags = local.common_tags

  depends_on = [
    azurerm_role_assignment.api_secrets_user,
    azurerm_role_assignment.api_acr_pull,
    azurerm_key_vault_secret.db_password,
    azurerm_key_vault_secret.jwt_secret,
    azurerm_key_vault_secret.appinsights_connection_string,
  ]
}

# ------------------------------------------------------------------------------
# Tier 2 (Public Edge): Nginx L7 Rate-Limiting Gateway & Vue 3 Frontend
# ------------------------------------------------------------------------------
resource "azurerm_container_app" "web" {
  name                         = local.web_app_name
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.web_identity.id]
  }

  dynamic "secret" {
    for_each = !var.use_acr && var.registry_password_secret != "" ? [1] : []
    content {
      name  = "registry-password"
      value = var.registry_password_secret
    }
  }

  dynamic "registry" {
    for_each = local.effective_registry_server != "" ? [1] : []
    content {
      server               = local.effective_registry_server
      identity             = var.use_acr ? azurerm_user_assigned_identity.web_identity.id : null
      username             = var.use_acr ? null : var.registry_username
      password_secret_name = !var.use_acr && var.registry_password_secret != "" ? "registry-password" : null
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = var.web_min_replicas
    max_replicas = var.web_max_replicas

    http_scale_rule {
      name                = "web-concurrency-rule"
      concurrent_requests = tostring(var.web_scale_concurrent_requests)
    }

    container {
      name   = "web"
      image  = local.effective_web_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "API_UPSTREAM"
        value = "https://${azurerm_container_app.api.ingress[0].fqdn}"
      }

      env {
        name  = "WS_BASE_URL"
        value = "wss://${local.web_fqdn}/ws"
      }

      env {
        name  = "AUTH_RATE_LIMIT"
        value = var.nginx_auth_rate_limit
      }

      env {
        name  = "AUTH_BURST"
        value = tostring(var.nginx_auth_burst)
      }

      env {
        name  = "API_RATE_LIMIT"
        value = var.nginx_api_rate_limit
      }

      env {
        name  = "API_BURST"
        value = tostring(var.nginx_api_burst)
      }

      env {
        name  = "MAX_CONNS_PER_IP"
        value = tostring(var.nginx_max_conns_per_ip)
      }

      startup_probe {
        port                    = 8080
        transport               = "HTTP"
        path                    = "/healthz"
        initial_delay           = 2
        interval_seconds        = 5
        failure_count_threshold = 6
      }

      readiness_probe {
        port                    = 8080
        transport               = "HTTP"
        path                    = "/healthz"
        initial_delay           = 2
        interval_seconds        = 10
        failure_count_threshold = 3
      }

      liveness_probe {
        port                    = 8080
        transport               = "HTTP"
        path                    = "/healthz"
        initial_delay           = 10
        interval_seconds        = 15
        failure_count_threshold = 3
      }
    }
  }

  tags = local.common_tags

  depends_on = [
    azurerm_role_assignment.web_acr_pull,
  ]
}

# ------------------------------------------------------------------------------
# Availability Ping Test & Presentation Monitoring Dashboard
# ------------------------------------------------------------------------------
resource "azurerm_application_insights_standard_web_test" "api_availability" {
  name                    = "${var.project_name}-availability"
  resource_group_name     = azurerm_resource_group.rg.name
  location                = azurerm_application_insights.appinsights.location
  application_insights_id = azurerm_application_insights.appinsights.id
  frequency               = var.availability_test_frequency
  timeout                 = 30
  enabled                 = true
  retry_enabled           = true
  geo_locations           = ["emea-nl-ams-azr", "emea-gb-db3-azr", "us-tx-sn1-azr"]

  request {
    url       = "https://${azurerm_container_app.web.ingress[0].fqdn}/api/channels"
    http_verb = "GET"
  }

  validation_rules {
    expected_status_code        = 200
    ignore_status_code          = false
    ssl_check_enabled           = true
    ssl_cert_remaining_lifetime = 7
  }

  tags = merge(local.common_tags, {
    "hidden-link:${azurerm_application_insights.appinsights.id}" = "Resource"
  })

  lifecycle {
    ignore_changes = [tags]
  }
}

locals {
  dashboard_charts = [
    {
      x               = 0
      y               = 0
      title           = "1. Scaling - API Active Replicas (1 -> 5)"
      resource_id     = azurerm_container_app.api.id
      namespace       = "Microsoft.App/containerApps"
      metric_name     = "Replicas"
      display_name    = "API Replicas (Max)"
      aggregationType = 3 # Maximum
    },
    {
      x               = 6
      y               = 0
      title           = "2. Gateway - Incoming Web Requests (Total)"
      resource_id     = azurerm_container_app.web.id
      namespace       = "Microsoft.App/containerApps"
      metric_name     = "Requests"
      display_name    = "Web Gateway Requests"
      aggregationType = 1 # Sum
    },
    {
      x               = 0
      y               = 4
      title           = "3. API - Internal Requests Processed (Total)"
      resource_id     = azurerm_container_app.api.id
      namespace       = "Microsoft.App/containerApps"
      metric_name     = "Requests"
      display_name    = "API Requests"
      aggregationType = 1 # Sum
    },
    {
      x               = 6
      y               = 4
      title           = "4. Performance - API Response Time (Avg ms)"
      resource_id     = azurerm_application_insights.appinsights.id
      namespace       = "microsoft.insights/components"
      metric_name     = "requests/duration"
      display_name    = "Server Response Time (ms)"
      aggregationType = 4 # Average
    },
    {
      x               = 0
      y               = 8
      title           = "5. Availability - Multi-Region Uptime (%)"
      resource_id     = azurerm_application_insights.appinsights.id
      namespace       = "microsoft.insights/components"
      metric_name     = "availabilityResults/availabilityPercentage"
      display_name    = "Availability (%)"
      aggregationType = 4 # Average
    },
    {
      x               = 6
      y               = 8
      title           = "6. Reliability - API Failed Requests (Count)"
      resource_id     = azurerm_application_insights.appinsights.id
      namespace       = "microsoft.insights/components"
      metric_name     = "requests/failed"
      display_name    = "Failed Requests"
      aggregationType = 7 # Count
    },
    {
      x               = 0
      y               = 12
      title           = "7. Stability - API Container Restarts (Count)"
      resource_id     = azurerm_container_app.api.id
      namespace       = "Microsoft.App/containerApps"
      metric_name     = "RestartCount"
      display_name    = "API Restarts"
      aggregationType = 1 # Sum
    },
    {
      x               = 6
      y               = 12
      title           = "8. Gateway - Active Replicas (Max)"
      resource_id     = azurerm_container_app.web.id
      namespace       = "Microsoft.App/containerApps"
      metric_name     = "Replicas"
      display_name    = "Gateway Replicas (Max)"
      aggregationType = 3 # Maximum
    },
    {
      x               = 0
      y               = 16
      title           = "9. Compute - API CPU Usage (Avg Nanocores)"
      resource_id     = azurerm_container_app.api.id
      namespace       = "Microsoft.App/containerApps"
      metric_name     = "UsageNanoCores"
      display_name    = "CPU Usage (Nanocores)"
      aggregationType = 4 # Average
    },
    {
      x               = 6
      y               = 16
      title           = "10. Compute - API Memory Working Set (Avg Bytes)"
      resource_id     = azurerm_container_app.api.id
      namespace       = "Microsoft.App/containerApps"
      metric_name     = "WorkingSetBytes"
      display_name    = "Memory Working Set (Bytes)"
      aggregationType = 4 # Average
    },
    {
      x               = 0
      y               = 20
      title           = "11. PostgreSQL - CPU Percent (Avg)"
      resource_id     = azurerm_postgresql_flexible_server.db.id
      namespace       = "Microsoft.DBforPostgreSQL/flexibleServers"
      metric_name     = "cpu_percent"
      display_name    = "DB CPU (%)"
      aggregationType = 4 # Average
    },
    {
      x               = 6
      y               = 20
      title           = "12. PostgreSQL - Active Connections (Max)"
      resource_id     = azurerm_postgresql_flexible_server.db.id
      namespace       = "Microsoft.DBforPostgreSQL/flexibleServers"
      metric_name     = "active_connections"
      display_name    = "DB Active Connections"
      aggregationType = 3 # Maximum
    }
  ]
}

resource "azurerm_portal_dashboard" "monitoring" {
  name                = "${var.project_name}-monitoring-dashboard"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  dashboard_properties = jsonencode({
    lenses = {
      "0" = {
        order = 0
        parts = {
          for idx, tile in local.dashboard_charts : tostring(idx) => {
            position = {
              x       = tile.x
              y       = tile.y
              colSpan = 6
              rowSpan = 4
            }
            metadata = {
              inputs = [
                {
                  name       = "options"
                  isOptional = true
                },
                {
                  name       = "sharedTimeRange"
                  isOptional = true
                }
              ]
              type = "Extension/HubsExtension/PartType/MonitorChartPart"
              settings = {
                content = {
                  options = {
                    chart = {
                      title = tile.title
                      metrics = [
                        {
                          resourceMetadata = {
                            id = tile.resource_id
                          }
                          name            = tile.metric_name
                          aggregationType = tile.aggregationType
                          namespace       = tile.namespace
                          metricVisualization = {
                            displayName = tile.display_name
                          }
                        }
                      ]
                      visualization = {
                        chartType = 2
                        legendVisualization = {
                          isVisible    = true
                          position     = 2
                          hideSubtitle = false
                        }
                        axisVisualization = {
                          x = {
                            isVisible = true
                            axisType  = 2
                          }
                          y = {
                            isVisible = true
                            axisType  = 1
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    metadata = {
      model = {
        timeRange = {
          value = {
            relative = {
              duration = 1
              timeUnit = 1
            }
          }
          type = "MsPortalFx.Composition.Configuration.ValueTypes.TimeRange"
        }
      }
    }
  })

  tags = merge(local.common_tags, {
    "hidden-title" = "PXL Healthcare - Live Scaling, Security & Monitoring"
  })
}

# Grant teammates read-only Monitoring Reader access to view the shared Azure Portal Dashboard & metrics
resource "azurerm_role_assignment" "team_monitoring_reader" {
  for_each             = toset(var.team_monitoring_reader_object_ids)
  scope                = azurerm_resource_group.rg.id
  role_definition_name = "Monitoring Reader"
  principal_id         = each.value
  principal_type       = "User"
}
