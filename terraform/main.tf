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
  backend "azurerm" {}
}

provider "azurerm" {
  features {}
}

# ------------------------------------------------------------------------------
# Infrastructure (Cheapest possible Azure PostgreSQL Flexible Server)
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

  # Minimum backup retention (included free)
  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  # Public access so anyone on the team can connect directly
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

# Firewall: open to all IPs (0.0.0.0 - 255.255.255.255) so the team can connect easily
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_all" {
  name             = "allow-all"
  server_id        = azurerm_postgresql_flexible_server.db.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "255.255.255.255"
}
