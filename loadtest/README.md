# PXL Healthcare – Scalability & DDoS Protection Tests (k6 + Docker Compose)

Deze map bevat de geautomatiseerde **Scalability Burst Test** en **L7 DDoS / Brute-Force Protection Test** om zowel auto-scaling (`1 → 5` replica's) als Nginx rate-limiting (`429 Too Many Requests`) op Azure aan te tonen.

---

## 🎯 Wat wordt er getest?

1. **Scalability Burst Test (`k6-scalability-test.js`)**
   * Stuurt eerst een rustige baseline (`2 VUs`, 15s) en daarna een gecontroleerde burst (`50 VUs`, 75s) naar `GET /api/channels` (veilig publiek endpoint zonder zware database-writes).
   * Blijft netjes binnen de Nginx `/api/` rate-limit (`300r/s`, burst `600`) zodat KEDA (`concurrent_requests = "2"`) `pxl-healthcare-api` opschaalt van `1` naar `5` replica's en na de 20s cooldown weer afschaalt.
2. **DDoS & Brute-Force Test (`k6-ddos-test.js`)**
   * **Auth Flood:** `40 VUs` zonder pauze op `POST /api/auth/login` (Nginx limit `10r/s`, burst `15`).
   * **HTTP API Flood:** `120 VUs` zonder pauze op `GET /api/channels` (Nginx limit `300r/s`, burst `600`).
   * **Beschikbaarheidscheck tijdens aanval:** controleert continu `GET /healthz`.
   * **Slaagcriteria:** actief HTTP `429 Too Many Requests` (`rate_limited_429 > 0`), **0** `5xx`-crashes (`server_errors_5xx == 0`), en **100%** uptime op `/healthz`.

---

## 🚀 Uitvoeren via Docker Compose (aanbevolen)

### Volledige suite (eerst Scalability, daarna DDoS)
```powershell
# PowerShell:
$env:TARGET_URL="https://<jouw-web-fqdn>"
docker compose -f loadtest/docker-compose.yml up --exit-code-from ddos-test
```

```bash
# Bash / CI:
TARGET_URL="https://<jouw-web-fqdn>" docker compose -f loadtest/docker-compose.yml up --exit-code-from ddos-test
```

De JSON-resultaten verschijnen automatisch in `loadtest/results/`.

### Losse tests uitvoeren
```bash
# Enkel scalability test:
TARGET_URL="https://<jouw-web-fqdn>" docker compose -f loadtest/docker-compose.yml run --rm scalability-test

# Enkel DDoS test (zonder eerst scalability te draaien):
TARGET_URL="https://<jouw-web-fqdn>" docker compose -f loadtest/docker-compose.yml run --rm --no-deps ddos-test
```

---

## 📸 Visuele Monitoring in Azure Portal

Open de **`dashboard_url`** uit de Terraform output (`pxl-healthcare-monitoring-dashboard`) om alle KPI's live op 1 scherm te tonen:
1. **Scaling (`1 → 5` replica's)** op `pxl-healthcare-api`
2. **Gateway vs. Internal API Requests** (zichtbaar verschil wanneer Nginx tijdens DDoS `429` teruggeeft!)
3. **Response Time (ms)**, **Multi-Region Availability (%)** & **Failed Requests**
4. **Container Restarts (`0`)**, **CPU**, **Memory**
5. **PostgreSQL CPU (%)** & **Active Connections** (blijft beschermd onder de limiet)
