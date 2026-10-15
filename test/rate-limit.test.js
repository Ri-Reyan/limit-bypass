import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import rateLimit from 'express-rate-limit';

describe('Rate Limiter Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    const testApp = express();
    const testLimiter = rateLimit({
      windowMs: 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: 'Too many requests, please try again later.',
      },
    });

    testApp.use(testLimiter);
    testApp.get('/test-limit', (req, res) => res.json({ success: true }));

    server = http.createServer(testApp);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('Enforces 429 when rate limit threshold is crossed', async () => {
    const res1 = await fetch(`${baseUrl}/test-limit`);
    assert.equal(res1.status, 200);

    const res2 = await fetch(`${baseUrl}/test-limit`);
    assert.equal(res2.status, 200);

    const res3 = await fetch(`${baseUrl}/test-limit`);
    assert.equal(res3.status, 429);
    const data = await res3.json();
    assert.equal(data.success, false);
    assert.match(data.error, /Too many requests/i);
  });
});

