import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.4/index.js';

const BASE_URL = (__ENV.TARGET_URL || __ENV.API_URL || 'http://localhost:8080').replace(/\/+$/, '');
const REQUEST_DELAY_MS = __ENV.REQUEST_DELAY_MS || '200';

export const options = {
  stages: [
    // Fase 1 (15s): Rustige baseline (blijft op 1 API-replica)
    { duration: '15s', target: 2 },
    // Fase 2 (75s): Gecontroleerde burst binnen de Nginx /api/ rate-limit (300r/s)
    // zodat KEDA (concurrent_requests=2) opschaalt van 1 naar 5 API-replica's
    { duration: '5s', target: 50 },
    { duration: '70s', target: 50 },
    // Fase 3 (20s): Cooldown naar 0 VUs om scale-down te observeren
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/channels`, {
    headers: {
      Accept: 'application/json',
      'x-set-response-delay-ms': REQUEST_DELAY_MS,
    },
    tags: { name: 'ChannelsEndpoint' },
  });

  check(res, {
    'status is 200 OK': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'not rate-limited (no 429 during normal load)': (r) => r.status !== 429,
    'no 5xx internal server error': (r) => r.status < 500,
  });

  sleep(0.1);
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
