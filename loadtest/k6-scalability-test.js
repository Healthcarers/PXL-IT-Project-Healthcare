import http from 'k6/http';
import { check, sleep } from 'k6';

// Haal de API URL op uit de omgevingsvariabele of val terug op localhost
const BASE_URL = (__ENV.API_URL || 'http://localhost:8090').replace(/\/+$/, '');

// Simuleer realistische verwerkingstijd (200ms) wanneer de placeholder echo-container actief is.
// Spring Boot negeert deze custom header en gebruikt zijn eigen API + database latency.
const REQUEST_DELAY_MS = __ENV.REQUEST_DELAY_MS || '200';

export const options = {
  stages: [
    // Fase 1 (15s): Rustige baseline op 2 VUs (~1.8 concurrent requests -> blijft op 1 replica)
    { duration: '15s', target: 2 },
    // Fase 2 (90s): Snelle burst/spike naar 100 VUs en continu parallel vasthouden
    // zodat de KEDA-scaler (eval elke 15-30s bij concurrent_requests=2) opschaalt van 1 naar 5 replica's
    { duration: '5s', target: 100 },
    { duration: '85s', target: 100 },
    // Fase 3 (20s): Cooldown naar 0 VUs om scale-down te observeren
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    // 95% van alle requests moet onder 2000ms blijven
    http_req_duration: ['p(95)<2000'],
    // Foutpercentage (5xx responses) moet minimaal blijven onder zware burst load
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const sharedHeaders = {
    'Accept': 'application/json',
    'x-set-response-delay-ms': REQUEST_DELAY_MS,
  };

  const registerParams = {
    headers: {
      ...sharedHeaders,
      'Content-Type': 'application/json',
    },
    tags: { name: 'RegisterEndpoint' },
  };

  // Genereer unieke payload per VU en iteratie om database primary key/unieke email checks te passeren
  const uniqueId = `${Date.now()}-${__VU}-${__ITER}`;
  const registerPayload = JSON.stringify({
    firstname: 'Scalability',
    lastname: 'Tester',
    email: `loadtest-${uniqueId}@pxl-healthcare.be`,
    password: 'SecurePassword2026!',
    passwordRepeated: 'SecurePassword2026!',
  });

  // 1. POST request naar public register endpoint
  const resRegister = http.post(`${BASE_URL}/api/auth/register`, registerPayload, registerParams);

  check(resRegister, {
    'register status is acceptable (200 OK, 201 Created of 400 Bad Request)': (r) =>
      r.status === 200 || r.status === 201 || r.status === 400,
    'register response time < 2000ms': (r) => r.timings.duration < 2000,
    'no 5xx internal server error on register': (r) => r.status < 500,
  });

  // 2. GET request naar public root voor extra parallelle HTTP concurrency
  const resPing = http.get(`${BASE_URL}/`, {
    headers: sharedHeaders,
    tags: { name: 'RootEndpoint' },
  });

  check(resPing, {
    'root endpoint response is valid (200 OK, 401 Unauthorized of 404 Not Found)': (r) =>
      r.status === 200 || r.status === 401 || r.status === 404,
    'no 5xx internal server error on ping': (r) => r.status < 500,
  });

  // Minimale pauze (50ms) zodat VUs continu parallelle druk op KEDA houden
  sleep(0.05);
}
