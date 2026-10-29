/**
 * server/test/pricing_tamper.test.js
 * Automated Regression Test: Client-Side Price Tampering Defense
 *
 * Validates that POST /api/payment/create-order strictly enforces authoritative
 * server-side pricing from the catalog and rejects/ignores any client-supplied
 * fareAmount, basePrice, amount, or total fields.
 *
 * Safety Invariants:
 * - Direct in-process mock invocation (no network ports opened, sandbox-compatible)
 * - NODE_ENV=test and placeholder secrets ensure ZERO calls to Razorpay or DynamoDB
 * - Operates exclusively against InMemoryTestRepository
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

// Enforce test mode flags before importing application and database modules
process.env.NODE_ENV = 'test';
process.env.RAZORPAY_KEY_SECRET = 'YOUR_RAZORPAY_KEY_SECRET';

const { app } = await import('../index.js');
const { db } = await import('../awsConfig.js');

/**
 * Helper to simulate an Express HTTP request in-process without network sockets.
 */
function invokeCreateOrder(body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = 'POST';
    req.url = '/api/payment/create-order';
    req.headers = {
      'content-type': 'application/json',
      ...headers,
    };
    req.body = body;

    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.bodyData = null;
    res.setHeader = (k, v) => {
      res.headers[k.toLowerCase()] = v;
    };
    res.getHeader = (k) => res.headers[k.toLowerCase()];
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.bodyData = data;
      resolve({ statusCode: res.statusCode, body: data });
      return res;
    };
    res.send = (data) => {
      res.bodyData = data;
      resolve({ statusCode: res.statusCode, body: data });
      return res;
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
    });
  });
}

describe('Authoritative Pricing & Anti-Tampering Regression Tests', () => {
  beforeEach(async () => {
    if (typeof db._reset === 'function') {
      await db._reset();
    }
  });

  it('1. Authoritative Fare Enforcement: AI-805 ignores client-supplied fareAmount: 1, basePrice: 1, amount: 1', async () => {
    // Attempt price tampering on AI-805 (catalog fare is ₹4,872)
    const tamperedPayload = {
      tripDetails: {
        catalogTripId: 'AI-805',
        tripId: 'AI-805',
        passengerCount: 1,
        // Attacker attempts to overwrite price with ₹1
        fareAmount: 1,
        basePrice: 1,
        amount: 1,
        total: 1,
      },
      travelerDetails: {
        name: 'Security Test Traveler',
        email: 'traveler.test@example.com',
      },
    };

    const res = await invokeCreateOrder(tamperedPayload);

    // 1. HTTP and response payload checks
    assert.equal(res.statusCode, 200, 'Order creation route must return HTTP 200');
    assert.equal(res.body.success, true, 'Response must indicate success');
    assert.ok(res.body.bookingId, 'Response must return a clean bookingId');
    assert.ok(res.body.bookingId.startsWith('BK-'), 'Booking ID must be prefixed with BK-');

    // 2. Strict Anti-Tampering Proof: Authoritative Fare ₹4,872 = 487,200 paise
    assert.notEqual(res.body.amount, 100, 'Must NOT use client-supplied fare of ₹1 (100 paise)');
    assert.notEqual(res.body.amount, 1, 'Must NOT use client-supplied fare of 1 paise');
    assert.equal(
      res.body.amount,
      487200,
      'Must strictly enforce authoritative catalog fare of ₹4,872 = 487,200 paise'
    );
    assert.equal(res.body.currency, 'INR');

    // 3. Provider Order ID check: provider is disabled/mocked in test mode
    // (Invariant: Do not assert an order was created if provider is mocked or disabled)
    assert.equal(res.body.orderId, null, 'Order ID must be null when real payment provider is disabled');

    // 4. Persistence verification: Verify persisted booking state in repository
    const storedBooking = await db.getBooking(res.body.bookingId);
    assert.ok(storedBooking, 'Booking record must be persisted in repository');
    assert.equal(storedBooking.amount, 4872, 'Persisted booking amount must be ₹4,872');
    assert.notEqual(storedBooking.amount, 1, 'Persisted booking amount must NOT be ₹1');
    assert.equal(storedBooking.bookingDetails.baseFare, 4872, 'Persisted baseFare must be ₹4,872');
    assert.equal(storedBooking.bookingDetails.fareAmount, 4872, 'Persisted fareAmount must be ₹4,872');
    assert.equal(storedBooking.paymentStatus, 'PENDING');
  });

  it('2. Multi-Passenger Authoritative Calculation: Multiplies base fare correctly and rejects tampered unit prices', async () => {
    // 2 passengers for AI-805: 2 * ₹4,872 = ₹9,744 = 974,400 paise
    const multiPassengerPayload = {
      tripDetails: {
        catalogTripId: 'AI-805',
        passengerCount: 2,
        fareAmount: 2,
        basePrice: 1,
        amount: 2,
      },
      travelerDetails: {
        name: 'Group Traveler',
        email: 'group@example.com',
      },
    };

    const res = await invokeCreateOrder(multiPassengerPayload);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.notEqual(res.body.amount, 200, 'Must NOT use client-supplied 200 paise');
    assert.equal(
      res.body.amount,
      974400,
      'Must calculate authoritative fare: 2 passengers * ₹4,872 = ₹9,744 (974,400 paise)'
    );

    const storedBooking = await db.getBooking(res.body.bookingId);
    assert.equal(storedBooking.amount, 9744, 'Stored booking amount must be ₹9,744');
    assert.equal(storedBooking.passengerCount, 2);
  });

  it('3. Passenger Count Validation: Rejects invalid or out-of-range passenger counts', async () => {
    // Test count < 1
    const zeroPassengerRes = await invokeCreateOrder({
      tripDetails: { catalogTripId: 'AI-805', passengerCount: 0 },
    });
    assert.equal(zeroPassengerRes.statusCode, 400);
    assert.equal(zeroPassengerRes.body.success, false);
    assert.match(zeroPassengerRes.body.error, /Invalid passenger count/);

    // Test count > 9
    const excessivePassengerRes = await invokeCreateOrder({
      tripDetails: { catalogTripId: 'AI-805', passengerCount: 10 },
    });
    assert.equal(excessivePassengerRes.statusCode, 400);
    assert.equal(excessivePassengerRes.body.success, false);
    assert.match(excessivePassengerRes.body.error, /Invalid passenger count/);

    // Test non-integer
    const fractionalPassengerRes = await invokeCreateOrder({
      tripDetails: { catalogTripId: 'AI-805', passengerCount: 1.5 },
    });
    assert.equal(fractionalPassengerRes.statusCode, 400);
    assert.equal(fractionalPassengerRes.body.success, false);
    assert.match(fractionalPassengerRes.body.error, /Invalid passenger count/);
  });

  it('4. Non-Existent Inventory: Rejects booking creation for invalid catalog trips', async () => {
    const invalidTripRes = await invokeCreateOrder({
      tripDetails: { catalogTripId: 'NONEXISTENT-TRIP-999', passengerCount: 1, fareAmount: 100 },
    });
    assert.equal(invalidTripRes.statusCode, 404);
    assert.equal(invalidTripRes.body.success, false);
    assert.match(invalidTripRes.body.error, /not found in inventory/i);
  });
});
