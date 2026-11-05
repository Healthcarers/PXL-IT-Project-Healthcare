import http from 'k6/http';
import { check, sleep } from 'k6';

// Haal de API URL op uit de omgevingsvariabele of val terug op localhost
const BASE_URL = (__ENV.API_URL || 'http://localhost:8090').replace(/\/+$/, '');

export const options = {
  stages: [
    { duration: '30s', target: 30 }, // Fase 1: Ramp-up naar 30 virtuele gebruikers
    { duration: '1m', target: 60 },  // Fase 2: Vasthouden op 60 VUs (triggert ACA 20 concurrent requests scale-rule!)
    { duration: '20s', target: 0 },  // Fase 3: Ramp-down naar 0 VUs
  ],
  thresholds: {
    // 95% van alle requests moet onder 2000ms blijven
    http_req_duration: ['p(95)<2000'],
    // Foutpercentage (5xx responses) moet minimaal blijven onder zware load
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
  const resRegister = http.post(`${BASE_URL}/api/auth/register`, registerPayload, params);
  
  check(resRegister, {
    'register status is acceptable (201 Created of 400 Bad Request)': (r) =>
      r.status === 201 || r.status === 400,
    'register response time < 2000ms': (r) => r.timings.duration < 2000,
    'no 5xx internal server error on register': (r) => r.status < 500,
  });

  // 2. GET request naar public root/auth voor HTTP throughput load
  const resPing = http.get(`${BASE_URL}/`, { tags: { name: 'RootEndpoint' } });
  
  check(resPing, {
    'root endpoint response is valid (200 OK, 401 Unauthorized of 404 Not Found)': (r) =>
      r.status === 200 || r.status === 401 || r.status === 404,
    'no 5xx internal server error on ping': (r) => r.status < 500,
  });

  // Korte pacing tussen requests (simuleert gebruikersinteractie)
  sleep(0.3);
}
