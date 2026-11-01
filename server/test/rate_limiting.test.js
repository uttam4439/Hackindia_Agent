/**
 * server/test/rate_limiting.test.js
 * Comprehensive Rate Limiting Verification Suite for Authentication Endpoints.
 *
 * Verifies:
 * 1. IP extraction and normalization (IPv4, IPv6 localhost, x-forwarded-for, x-real-ip).
 * 2. RateLimit headers injection (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset).
 * 3. HTTP 429 enforcement with Retry-After header when limit is breached.
 * 4. IP isolation (requests from one IP do not exhaust quota of other IPs).
 * 5. Window reset and store pruning capabilities.
 * 6. Integration tests on POST /api/auth/login and POST /api/auth/register via Express app.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import { app } from '../index.js';
import {
  createRateLimiter,
  extractClientIp,
  normalizeIp,
  loginRateLimiter,
  registerRateLimiter,
} from '../rateLimiter.js';

// Helper to invoke Express app in-process with custom headers and IP
const invokeApp = (method, url, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const safeResolve = (val) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = { 'content-type': 'application/json', ...headers };
    if (body) req.body = body;

    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.bodyData = null;
    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = String(v); };
    res.getHeader = (k) => res.headers[k.toLowerCase()];
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => {
      res.bodyData = data;
      safeResolve({ status: res.statusCode, body: data, headers: res.headers });
      return res;
    };
    res.send = (data) => {
      res.bodyData = data;
      safeResolve({ status: res.statusCode, body: data, headers: res.headers });
      return res;
    };
    res.end = () => {
      safeResolve({ status: res.statusCode, body: res.bodyData, headers: res.headers });
    };

    app.handle(req, res, (err) => {
      if (err) return reject(err);
      if (!resolved) {
        safeResolve({ status: 404, body: { error: 'Not Found' }, headers: res.headers });
      }
    });
  });
};

describe('Authentication Rate Limiting Suite', () => {
  beforeEach(() => {
    loginRateLimiter.reset();
    registerRateLimiter.reset();
  });

  describe('1. IP Extraction and Normalization', () => {
    it('normalizes standard IPv4 and IPv6 variants', () => {
      assert.equal(normalizeIp('192.168.1.1'), '192.168.1.1');
      assert.equal(normalizeIp('::1'), '127.0.0.1');
      assert.equal(normalizeIp('::ffff:10.0.0.1'), '10.0.0.1');
      assert.equal(normalizeIp(''), '127.0.0.1');
      assert.equal(normalizeIp(null), '127.0.0.1');
    });

    it('extracts client IP from x-forwarded-for header (first hop)', () => {
      const req = {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
      };
      assert.equal(extractClientIp(req), '203.0.113.195');
    });

    it('extracts client IP from x-real-ip when x-forwarded-for is missing', () => {
      const req = {
        headers: { 'x-real-ip': '198.51.100.42' },
      };
      assert.equal(extractClientIp(req), '198.51.100.42');
    });

    it('falls back to socket remoteAddress or 127.0.0.1', () => {
      const reqWithSocket = { headers: {}, socket: { remoteAddress: '172.16.0.5' } };
      assert.equal(extractClientIp(reqWithSocket), '172.16.0.5');

      const emptyReq = { headers: {} };
      assert.equal(extractClientIp(emptyReq), '127.0.0.1');
    });
  });

  describe('2. Custom Rate Limiter Unit Behavior', () => {
    it('allows requests within limit and sets RateLimit headers', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 3 });
      const req = { headers: { 'x-forwarded-for': '192.0.2.1' } };

      const runMiddleware = () => {
        let nextCalled = false;
        const resHeaders = {};
        const res = {
          setHeader: (k, v) => { resHeaders[k.toLowerCase()] = String(v); },
          status: () => res,
          json: () => res,
        };
        limiter(req, res, () => { nextCalled = true; });
        return { nextCalled, headers: resHeaders };
      };

      // Request 1
      const res1 = runMiddleware();
      assert.equal(res1.nextCalled, true);
      assert.equal(res1.headers['ratelimit-limit'], '3');
      assert.equal(res1.headers['ratelimit-remaining'], '2');

      // Request 2
      const res2 = runMiddleware();
      assert.equal(res2.nextCalled, true);
      assert.equal(res2.headers['ratelimit-remaining'], '1');

      // Request 3
      const res3 = runMiddleware();
      assert.equal(res3.nextCalled, true);
      assert.equal(res3.headers['ratelimit-remaining'], '0');

      // Request 4 (Limit exceeded -> 429)
      let statusCode = 200;
      let jsonBody = null;
      const res4Headers = {};
      const res4 = {
        setHeader: (k, v) => { res4Headers[k.toLowerCase()] = String(v); },
        status: (code) => { statusCode = code; return res4; },
        json: (data) => { jsonBody = data; return res4; },
      };
      let nextCalled4 = false;
      limiter(req, res4, () => { nextCalled4 = true; });

      assert.equal(nextCalled4, false);
      assert.equal(statusCode, 429);
      assert.equal(jsonBody.success, false);
      assert.ok(jsonBody.retryAfterSeconds > 0);
      assert.ok(res4Headers['retry-after']);
    });

    it('isolates rate limit counters across distinct IP addresses', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 1 });
      const reqA = { headers: { 'x-forwarded-for': '198.51.100.1' } };
      const reqB = { headers: { 'x-forwarded-for': '198.51.100.2' } };

      const noopRes = () => ({
        setHeader: () => {},
        status: () => ({ json: () => {} }),
      });

      let nextA1 = false;
      limiter(reqA, noopRes(), () => { nextA1 = true; });
      assert.equal(nextA1, true);

      // reqA second attempt is blocked
      let nextA2 = false;
      limiter(reqA, noopRes(), () => { nextA2 = true; });
      assert.equal(nextA2, false);

      // reqB first attempt is allowed despite reqA being blocked
      let nextB1 = false;
      limiter(reqB, noopRes(), () => { nextB1 = true; });
      assert.equal(nextB1, true);
    });

    it('resets counters when .reset() is invoked', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 1 });
      const req = { headers: { 'x-forwarded-for': '192.0.2.99' } };
      const noopRes = () => ({
        setHeader: () => {},
        status: () => ({ json: () => {} }),
      });

      limiter(req, noopRes(), () => {});
      let blockedBeforeReset = true;
      limiter(req, noopRes(), () => { blockedBeforeReset = false; });
      assert.equal(blockedBeforeReset, true);

      // Reset
      limiter.reset();

      let allowedAfterReset = false;
      limiter(req, noopRes(), () => { allowedAfterReset = true; });
      assert.equal(allowedAfterReset, true);
    });
  });

  describe('3. Integration: POST /api/auth/login Rate Limiting', () => {
    it('enforces maximum 10 login attempts per IP and blocks the 11th with 429', async () => {
      const testIp = '203.0.113.50';
      const headers = { 'x-forwarded-for': testIp };

      // Make 10 attempts (each fails with 401 invalid creds, but is within rate limit)
      for (let i = 1; i <= 10; i++) {
        const res = await invokeApp('POST', '/api/auth/login', {
          email: `test${i}@example.com`,
          password: 'WrongPassword123!',
        }, headers);

        assert.equal(res.status, 401);
        assert.equal(res.headers['ratelimit-limit'], '10');
        assert.equal(res.headers['ratelimit-remaining'], String(10 - i));
      }

      // 11th attempt from same IP must be rejected with HTTP 429
      const breachRes = await invokeApp('POST', '/api/auth/login', {
        email: 'test11@example.com',
        password: 'WrongPassword123!',
      }, headers);

      assert.equal(breachRes.status, 429);
      assert.equal(breachRes.body.success, false);
      assert.match(breachRes.body.error, /Too many login attempts from this IP address/);
      assert.ok(breachRes.headers['retry-after']);

      // Attempt from a DIFFERENT IP must NOT be blocked
      const diffIpHeaders = { 'x-forwarded-for': '203.0.113.99' };
      const otherRes = await invokeApp('POST', '/api/auth/login', {
        email: 'other@example.com',
        password: 'WrongPassword123!',
      }, diffIpHeaders);

      assert.equal(otherRes.status, 401); // Not 429
      assert.equal(otherRes.headers['ratelimit-remaining'], '9');
    });
  });

  describe('4. Integration: POST /api/auth/register Rate Limiting', () => {
    it('enforces maximum 5 registration attempts per IP and blocks the 6th with 429', async () => {
      const testIp = '203.0.113.60';
      const headers = { 'x-forwarded-for': testIp };

      // Make 5 registration attempts
      for (let i = 1; i <= 5; i++) {
        const res = await invokeApp('POST', '/api/auth/register', {
          name: `User ${i}`,
          email: `unique.user.${i}.${Date.now()}@example.com`,
          password: 'ValidPassword123!',
        }, headers);

        // Created or validation response
        assert.ok([201, 400].includes(res.status));
        assert.equal(res.headers['ratelimit-limit'], '5');
        assert.equal(res.headers['ratelimit-remaining'], String(5 - i));
      }

      // 6th attempt must be rejected with HTTP 429
      const breachRes = await invokeApp('POST', '/api/auth/register', {
        name: 'User 6',
        email: `unique.user.6.${Date.now()}@example.com`,
        password: 'ValidPassword123!',
      }, headers);

      assert.equal(breachRes.status, 429);
      assert.equal(breachRes.body.success, false);
      assert.match(breachRes.body.error, /Too many registration attempts from this IP address/);
      assert.ok(breachRes.headers['retry-after']);
    });
  });
});
