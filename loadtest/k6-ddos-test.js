import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.4/index.js';

const BASE_URL = (__ENV.TARGET_URL || __ENV.API_URL || 'http://localhost:8080').replace(/\/+$/, '');

const rateLimited429 = new Counter('rate_limited_429');
const serverErrors5xx = new Counter('server_errors_5xx');
const healthzOk = new Rate('healthz_availability_rate');

export const options = {
  scenarios: {
    // 1. Brute-force / credential stuffing flood op /api/auth/login (Nginx limit: 10r/s, burst 15)
    auth_bruteforce_flood: {
      executor: 'constant-vus',
      vus: 40,
      duration: '25s',
      exec: 'authFlood',
    },
    // 2. High-concurrency L7 HTTP flood op /api/ (Nginx limit: 300r/s, burst 600)
    api_http_flood: {
      executor: 'constant-vus',
      vus: 120,
      duration: '25s',
      exec: 'apiFlood',
    },
    // 3. Legitieme beschikbaarheidscheck tijdens actieve DDoS-aanval
    availability_during_attack: {
      executor: 'constant-vus',
      vus: 1,
      duration: '25s',
      exec: 'checkHealthz',
    },
  },
  thresholds: {
    // Bewijs dat de Nginx L7 DDoS-shield actief 429 Too Many Requests teruggeeft
    rate_limited_429: ['count>0'],
    // Bewijs dat de backend & database niet crashen (geen 5xx server errors)
    server_errors_5xx: ['count==0'],
    // Bewijs dat de gateway bereikbaar blijft tijdens een aanval
    healthz_availability_rate: ['rate==1'],
    'http_req_duration{scenario:availability_during_attack}': ['p(95)<1500'],
  },
};

export function authFlood() {
  const payload = JSON.stringify({
    email: `ddos-${__VU}-${__ITER}@invalid-pxl.be`,
    password: 'WrongPassword123!',
  });

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'DDoS_AuthLogin' },
  });

  if (res.status === 429) {
    rateLimited429.add(1);
  }
  if (res.status >= 500 || res.status === 0) {
    serverErrors5xx.add(1);
  }

  check(res, {
    'auth flood blocked (429) or safely rejected (400/401)': (r) =>
      r.status === 429 || r.status === 400 || r.status === 401,
    'no 5xx crash on auth flood': (r) => r.status > 0 && r.status < 500,
  });
}

export function apiFlood() {
  const res = http.get(`${BASE_URL}/api/channels`, {
    tags: { name: 'DDoS_ApiChannels' },
  });

  if (res.status === 429) {
    rateLimited429.add(1);
  }
  if (res.status >= 500 || res.status === 0) {
    serverErrors5xx.add(1);
  }

  check(res, {
    'api flood throttled (429) or served (200)': (r) => r.status === 429 || r.status === 200,
    'no 5xx crash on api flood': (r) => r.status > 0 && r.status < 500,
  });
}

export function checkHealthz() {
  const res = http.get(`${BASE_URL}/healthz`, {
    tags: { name: 'HealthzDuringAttack' },
  });

  const ok = res.status === 200;
  healthzOk.add(ok);
  if (res.status >= 500 || res.status === 0) {
    serverErrors5xx.add(1);
  }

  check(res, {
    'gateway remains 200 OK during DDoS attack': (r) => r.status === 200,
    'gateway latency < 1500ms during attack': (r) => r.timings.duration < 1500,
  });

  sleep(0.5);
}

export function handleSummary(data) {
  const summary = {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };

  if (__ENV.SUMMARY_FILE) {
    summary[__ENV.SUMMARY_FILE] = JSON.stringify(data, null, 2);
  }

  return summary;
}
