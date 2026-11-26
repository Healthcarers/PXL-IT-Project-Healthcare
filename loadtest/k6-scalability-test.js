import http from 'k6/http';
import { check } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.4/index.js';

const BASE_URL = (__ENV.TARGET_URL || __ENV.API_URL || 'http://localhost:8080').replace(/\/+$/, '');
const REQUEST_DELAY_MS = __ENV.REQUEST_DELAY_MS || '200';

export const options = {
  scenarios: {
    // Stepped arrival-rate staircase designed for KEDA (concurrent_requests = 50 RPS per replica).
    // Each 35-40s plateau exceeds 300+ requests per KEDA window and adds 1 replica at a time:
    //   1 replica (baseline) -> 2 (+1) -> 3 (+2) -> 4 (+3) -> 5 (+4) -> cooldown
    gradual_staircase_scaling: {
      executor: 'ramping-arrival-rate',
      startRate: 15,
      timeUnit: '1s',
      preAllocatedVUs: 60,
      maxVUs: 150,
      stages: [
        // Step 0 (20s): Baseline ~20 req/s (< 50 RPS threshold -> stays at 1 API replica)
        { duration: '20s', target: 20 },
        // Step 1 (35s): ~75 req/s (1,125+ reqs per 15s window -> scales 1 -> 2 replicas, +1 instance)
        { duration: '5s', target: 75 },
        { duration: '30s', target: 75 },
        // Step 2 (35s): ~125 req/s (1,875+ reqs per 15s window -> scales 2 -> 3 replicas, +2 instances)
        { duration: '5s', target: 125 },
        { duration: '30s', target: 125 },
        // Step 3 (35s): ~175 req/s (2,625+ reqs per 15s window -> scales 3 -> 4 replicas, +3 instances)
        { duration: '5s', target: 175 },
        { duration: '30s', target: 175 },
        // Step 4 (40s): ~235 req/s (3,525+ reqs per 15s window, below Nginx 300r/s DDoS cap -> scales 4 -> 5 replicas)
        { duration: '5s', target: 235 },
        { duration: '35s', target: 235 },
        // Step 5 (20s): Cooldown to observe scale-down
        { duration: '20s', target: 0 },
      ],
    },
  },
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
