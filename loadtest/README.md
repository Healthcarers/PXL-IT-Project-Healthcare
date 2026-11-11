# Healthcare API – Scalability & Load Testing (k6)

Deze map bevat het k6 Burst/Spike load-testing script om de automatische schaalbaarheid (auto-scaling van `1` naar `5` replica's) van onze API op **Azure Container Apps** live aan te tonen tijdens demo's en feedbackmomenten.

---

## 🎯 Doel van de Test

Onze Azure Container App (`cheap-pg-api`) is via Terraform geconfigureerd met:
* **Minimale replica's**: `1`
* **Maximale replica's**: `5`
* **HTTP Concurrency Scale Rule**: Triggert opschaling al vanaf **2 gelijktijdige in-flight requests** (`concurrent_requests = "2"`), zodat elke kleine piek direct zichtbaar meerdere replica's bijstart.

Het k6-script (`k6-scalability-test.js`) voert een **Burst / Spike Test** van ~2 minuten uit met minimale pauze (`sleep(0.05)`):
1. **Fase 1 (15s)**: Rustige baseline op `2` VUs (blijft stabiel op `1` replica).
2. **Fase 2 (90s)**: Directe spike naar `100` parallelle VUs (5s ramp + 85s hold) zodat de KEDA-scaler (die elke 15–30s evalueert) gegarandeerd opschaalt naar meerdere replica's (`2..5`).
3. **Fase 3 (20s)**: Cooldown naar `0` VUs om scale-down te observeren.

*(Tip: Wanneer de placeholder container `mendhak/http-https-echo:31` draait, zorgt de header `x-set-response-delay-ms: 200` automatisch voor realistische verwerkingstijd per request. De echte Spring Boot API negeert deze header en levert zijn eigen CPU/PostgreSQL-load.)*

---

## 🚀 De Test Uitvoeren

Je kunt de test lokaal uitvoeren met de k6 CLI of via Docker (geen installatie vereist).

### Optie A: Met lokaal geïnstalleerde k6

```bash
# Windows (PowerShell / CMD) of Linux / macOS
k6 run -e API_URL=https://<jouw-container-app-fqdn> loadtest/k6-scalability-test.js
```

### Optie B: Zonder k6 installatie via Docker

```powershell
# In PowerShell:
docker run --rm -v "${PWD}/loadtest:/scripts" -e API_URL="https://<jouw-container-app-fqdn>" grafana/k6 run /scripts/k6-scalability-test.js
```

```bash
# In Bash / Git Bash:
docker run --rm -i -e API_URL="https://<jouw-container-app-fqdn>" grafana/k6 run - < loadtest/k6-scalability-test.js
```

---

## 📸 Visuele Monitoring & Screenshots in Azure Portal

### 1. Kant-en-klaar Azure Monitoring Dashboard (`pxl-healthcare-monitoring-dashboard`)
Na `terraform apply` (of `.\up.ps1`) verschijnt direct in de output een klikbare **`dashboard_url`**. Dit dashboard toont alle KPI's overzichtelijk in 1 scherm (tijdsbereik standaard op het laatste uur):
* **Container App — Replica Count (Max)** (`1` $\rightarrow$ `5` schaling)
* **Container App — HTTP Requests (Sum)**
* **Container App — CPU Usage (Avg)** & **Memory Working Set (Avg)**
* **PostgreSQL — CPU Percent (Avg)** & **Active Connections (Max)**

### 2. Application Insights (`cheap-pg-ai`)
* **Availability ($\rightarrow$ Availability)**: Toont de automatische 5-minuten SSL/HTTP 200 Availability Ping Test vanaf meerdere regio's (*West Europe*, *North Europe*, *South Central US*) als groene vinkjes op de wereldkaart.
* **Live Metrics (Investigate $\rightarrow$ Live Metrics)**: Real-time *Incoming Requests/sec*, *Request Duration* en *Online Servers* tijdens de k6-run.

### 3. Alerts Overzicht (`cheap-pg-rg` $\rightarrow$ `Alerts`)
Naast database- en request-alerts triggert tijdens de schaling ook de alert **`cheap-pg-api-auto-scaled`** (`Replicas > 1`), zichtbaar in Azure Monitor Alerts als bewijs dat auto-scaling actief is aangeslagen.
