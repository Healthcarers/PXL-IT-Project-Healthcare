# Healthcare API – Scalability & Load Testing (k6)

Deze map bevat het k6 load-testing script om de automatische schaalbaarheid (auto-scaling) van onze Spring Boot API op **Azure Container Apps** aan te tonen.

---

## 🎯 Doel van de Test

Onze Azure Container App (`cheap-pg-api`) is via Terraform geconfigureerd met:
* **Minimale replica's**: `1`
* **Maximale replica's**: `5`
* **HTTP Concurrency Scale Rule**: Triggert opschaling bij meer dan **20 gelijktijdige requests**.

Het k6-script (`k6-scalability-test.js`) simuleert een realistisch verkeerspatroon:
1. **Fase 1 (0:00 - 0:30)**: Ramp-up van 0 naar 30 virtuele gebruikers (VUs).
2. **Fase 2 (0:30 - 1:30)**: 1 minuut constante piekdruk op 60 virtuele gebruikers (ruimschoots boven de drempelwaarde van 20 requests).
3. **Fase 3 (1:30 - 1:50)**: Ramp-down naar 0 virtuele gebruikers om scale-down te observeren.

---

## 🚀 De Test Uitvoeren

Je kunt de test lokaal uitvoeren met de k6 CLI of via Docker (geen installatie vereist).

### Optie A: Met lokaal geïnstalleerde k6

```bash
# Windows (PowerShell / CMD) of Linux / macOS
k6 run -e API_URL=https://<jouw-container-app-fqdn> loadtest/k6-scalability-test.js
```

*Voorbeeld met de echte Azure URL uit `terraform output -raw api_url`:*
```bash
k6 run -e API_URL=https://cheap-pg-api.gentlepond-xxxxxxxx.switzerlandnorth.azurecontainerapps.io loadtest/k6-scalability-test.js
```

### Optie B: Zonder k6 installatie via Docker

```bash
# In PowerShell:
Get-Content loadtest/k6-scalability-test.js | docker run --rm -i -e API_URL=https://<jouw-container-app-fqdn> grafana/k6 run -

# In Bash / Git Bash:
docker run --rm -i -e API_URL=https://<jouw-container-app-fqdn> grafana/k6 run - < loadtest/k6-scalability-test.js
```

---

## 📸 Waar Screenshots Maken in de Azure Portal?

Tijdens en direct na de load-test moeten voor de oplevering en documentatie screenshots worden vastgelegd op de volgende locaties:

### 1. Azure Container Apps (`cheap-pg-api`)
* **Locatie**: Azure Portal $\rightarrow$ Resource Group (`cheap-pg-rg`) $\rightarrow$ Container App `cheap-pg-api` $\rightarrow$ menu links onder **Monitoring** $\rightarrow$ **Metrics**.
* **Te maken screenshots**:
  * **Schaalgrafiek (Replicas)**:
    * *Metric:* **Replicas**
    * *Aggregation:* **Max**
    * *Wat je moet zien:* De grafiek toont hoe het aantal actieve replica's tijdens de test stijgt van 1 naar 2, 3 of meer (tot max 5) en na afloop van de test weer terugvalt naar 1.
  * **Requests & Concurrency**:
    * *Metric:* **Requests** en/of **Active Concurrent Requests**
    * *Wat je moet zien:* De piek in inkomende HTTP-verzoeken die overeenkomt met de 60 VUs uit de k6-test.

### 2. Application Insights (`cheap-pg-ai`)
* **Locatie**: Azure Portal $\rightarrow$ Resource Group $\rightarrow$ Application Insights `cheap-pg-ai`.
* **Te maken screenshots**:
  * **Live Metrics (Investigate $\rightarrow$ Live Metrics)**:
    * *Tip:* Open dit tabblad **tijdens** het uitvoeren van de test.
    * *Wat je moet zien:* Real-time meters voor *Incoming Requests/sec*, *Request Duration*, en onderin het aantal *Server Instances* dat toeneemt naarmate Container Apps nieuwe pods lanceert.
  * **Performance (Investigate $\rightarrow$ Performance)**:
    * *Wat je moet zien:* Overzicht van responstijden per endpoint (`/api/auth/register`), percentielen (p50, p95) en transactievolumes.

### 3. Azure PostgreSQL Flexible Server (`cheap-pg-*****`)
* **Locatie**: Azure Portal $\rightarrow$ Resource Group $\rightarrow$ PostgreSQL Flexible Server.
* **Te maken screenshots**:
  * **Metrics (Monitoring $\rightarrow$ Metrics)**:
    * *Metric:* **CPU percent** (Aggregation: *Average* of *Max*)
    * *Metric:* **Active Connections**
    * *Wat je moet zien:* De impact van de gelijktijdige registratie-requests op de database (Hikari connection pool) en bevestiging dat het CPU-verbruik binnen veilige marges bleef en de metric alert (> 80%) niet is overschreden.
