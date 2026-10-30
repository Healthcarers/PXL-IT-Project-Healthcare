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
