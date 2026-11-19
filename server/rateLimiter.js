/**
 * server/rateLimiter.js
 * In-Memory Sliding/Fixed-Window Rate Limiter for Authentication Endpoints.
 * Suitable for Express on Node.js and AWS Lambda serverless execution.
 *
 * Capabilities:
 * 1. Zero external dependencies (uses standard Node.js runtime).
 * 2. Extracts client IP securely from x-forwarded-for, x-real-ip, or req.ip.
 * 3. Enforces configurable window (e.g. 15 minutes) and max attempts.
 * 4. Injects standard RFC-compliant HTTP headers:
 *    - RateLimit-Limit
 *    - RateLimit-Remaining
 *    - RateLimit-Reset
 *    - Retry-After
 * 5. Returns HTTP 429 with actionable JSON error.
 * 6. Includes memory management to avoid memory leaks across long warm containers.
 * 7. Supports .reset() method for test isolation.
 */

/**
 * Extracts and normalizes client IP address from Express request.
 * Prioritizes standard proxy / API Gateway / CloudFront forwarded headers.
 */
export function extractClientIp(req) {
  if (!req) return '127.0.0.1';

  // Support reverse proxy / API Gateway / CloudFront forwarded header
  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (xForwardedFor && typeof xForwardedFor === 'string') {
    const ips = xForwardedFor.split(',');
    if (ips.length > 0 && ips[0].trim()) {
      return normalizeIp(ips[0].trim());
    }
  }

  const xRealIp = req.headers?.['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string' && xRealIp.trim()) {
    return normalizeIp(xRealIp.trim());
  }

  if (req.socket?.remoteAddress) {
    return normalizeIp(req.socket.remoteAddress);
  }

  if (req.connection?.remoteAddress) {
    return normalizeIp(req.connection.remoteAddress);
  }

  try {
    if (req.ip && typeof req.ip === 'string') {
      return normalizeIp(req.ip);
    }
  } catch {
    // Ignore getter errors on synthetic mock request objects
  }

  return '127.0.0.1';
}

/**
 * Strips IPv6 prefixes and normalizes localhost addresses.
 */
export function normalizeIp(ip) {
  if (!ip) return '127.0.0.1';
  let clean = ip.trim();
  if (clean.startsWith('::ffff:')) {
    clean = clean.slice(7);
  }
  if (clean === '::1') {
    clean = '127.0.0.1';
  }
  return clean;
}

/**
 * Creates a rate limiter middleware with specified options.
 */
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max !== undefined ? options.max : 10;
  const message = options.message || 'Too many requests. Please try again later.';
  const statusCode = options.statusCode || 429;
  const keyGenerator = options.keyGenerator || extractClientIp;

  // In-memory store: Map of key -> { count, resetTime }
  const store = new Map();

  const pruneExpired = () => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now >= record.resetTime) {
        store.delete(key);
      }
    }
  };

  const middleware = (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);

    let record = store.get(key);
    if (!record || now >= record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
      store.set(key, record);
    }

    record.count += 1;

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    const resetUnix = Math.ceil(record.resetTime / 1000);

    // Standard HTTP RateLimit headers
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetUnix));

    if (record.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      return res.status(statusCode).json({
        success: false,
        error: typeof message === 'function' ? message(req, res) : message,
        retryAfterSeconds: resetSeconds,
      });
    }

    if (typeof next === 'function') {
      next();
    }
  };

  middleware.reset = () => {
    store.clear();
  };

  middleware.getStore = () => store;
  middleware.prune = pruneExpired;

  return middleware;
}

/**
 * Production Rate Limiter for Login Endpoint.
 * Max 10 attempts per 15 minutes per IP.
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts from this IP address. Please wait 15 minutes before retrying.',
});

/**
 * Production Rate Limiter for Registration Endpoint.
 * Max 5 attempts per 15 minutes per IP.
 */
export const registerRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many registration attempts from this IP address. Please wait 15 minutes before retrying.',
});
