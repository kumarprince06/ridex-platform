// 2,500 on-duty drivers pinging their position every 5 s: a sustained ~500 requests per second
// against POST /api/v1/driver/location, the endpoint the driver app actually calls.
//
// Real tokens, signed here with the perf run's own RIDEX_JWT_SECRET, so every request goes
// through the same JWT filter production does. Verifying an HS256 token is an in-memory HMAC
// with no database call; leaving it in costs microseconds and keeps the numbers honest.
//
// Needs seed-drivers.sql loaded, or every request is a 404 for a driver that does not exist.

import http from 'k6/http';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import { check, fail, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const SECRET = __ENV.RIDEX_JWT_SECRET;
const DRIVERS = 2500;
const PING_SECONDS = 5;

// Jaipur. Each driver starts somewhere within about 5 km and drifts from there.
const CENTRE_LAT = 26.9239;
const CENTRE_LNG = 75.8267;

export const options = {
  scenarios: {
    // A cold JVM's first requests pay for JIT, class loading and Hikari opening connections. They
    // are real, but they are not what 2,500 drivers see, so they are kept out of the thresholds.
    warmup: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
      tags: { phase: 'warmup' },
    },
    drivers: {
      executor: 'ramping-vus',
      startTime: '30s',
      startVUs: 0,
      tags: { phase: 'load' },
      stages: [
        { duration: '1m', target: 500 },
        // Climb to full strength before the measured hold, rather than jumping 2,000 VUs at once.
        { duration: '1m', target: DRIVERS },
        { duration: '3m', target: DRIVERS },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    'http_req_failed{phase:load}': ['rate<0.001'],
    'http_req_duration{phase:load}': ['p(99)<50'],
    'checks{phase:load}': ['rate>0.999'],
  },
};

// Per VU, kept across iterations: each VU is one driver with one token and one position.
let token = null;
let latitude = 0;
let longitude = 0;

export function setup() {
  if (!SECRET) {
    fail('RIDEX_JWT_SECRET is not set: use the same value the app was started with.');
  }
}

export default function () {
  if (token === null) {
    const driver = ((__VU - 1) % DRIVERS) + 1;
    token = signDriverToken(driver);
    latitude = CENTRE_LAT + (Math.random() - 0.5) * 0.09;
    longitude = CENTRE_LNG + (Math.random() - 0.5) * 0.09;
    // Real drivers are not in phase. Without this, every VU fires in the same instant.
    sleep(Math.random() * PING_SECONDS);
  }

  // About 10-30 m between pings: a car in city traffic, not a teleport.
  latitude += (Math.random() - 0.5) * 0.0004;
  longitude += (Math.random() - 0.5) * 0.0004;

  const response = http.post(
    `${BASE_URL}/api/v1/driver/location`,
    JSON.stringify({ latitude, longitude }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      tags: { name: 'driver_location' },
    },
  );

  check(response, {
    'location accepted (204)': (r) => r.status === 204,
  });

  sleep(PING_SECONDS);
}

// The same claims JwtService#buildToken writes. Valid for two hours, which outlasts the run.
function signDriverToken(driver) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: 'PERFUSR' + String(driver).padStart(19, '0'),
    email: `perf-driver-${driver}@ridex.test`,
    roles: ['DRIVER'],
    app: 'DRIVER',
    tokenType: 'access',
    iat: now,
    exp: now + 2 * 60 * 60,
  };
  const unsigned = `${encoding.b64encode(JSON.stringify(header), 'rawurl')}.`
    + encoding.b64encode(JSON.stringify(payload), 'rawurl');
  const signature = encoding.b64encode(crypto.hmac('sha256', SECRET, unsigned, 'binary'), 'rawurl');
  return `${unsigned}.${signature}`;
}
