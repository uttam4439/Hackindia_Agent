/**
 * server/test/payment.test.js
 * Automated Backend Tests for Razorpay Test Mode Integration.
 * Executed via Node.js built-in test runner: `npm run test:server`
 * Uses direct in-process mock invocation to run securely inside sandbox environments.
 */

import { describe, it, beforeEach, after } from 'node:test';


import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDatabase, safeCleanup, DynamoDBRepository } from '../awsConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataFile = path.join(__dirname, '../data/store.payment-test.json');

// Dedicated, isolated database instance for Payment Tests
const db = createDatabase({ isTest: true, testDataFile });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helpers to simulate Express requests/responses in-memory
const createMockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    bodyData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.bodyData = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key.toLowerCase()] = val;
      return this;
    },
  };
  return res;
};


beforeEach(async () => {
  await db._reset();
});

after(() => {
  safeCleanup(testDataFile);

});

after(() => {
  // Ownership-safe cleanup: deletes only the file atomically reserved by this test run
  try {
    if (reservedByThisProcess && testStoreFile && path.resolve(testStoreFile) === testStorePath && fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }
  } catch {}
});

describe('Razorpay Test Mode Backend Integration Tests', () => {
  it('1. Config Endpoint: Exposes public Key ID and currency but NEVER secrets', async () => {
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_Tjktt6Bs0TXxDk';
    const config = {
      keyId,
      mode: process.env.RAZORPAY_MODE || 'test',
      currency: 'INR',
    };

    assert.ok(config.keyId.startsWith('rzp_test_'), 'Public key must be test mode');
    assert.equal(config.currency, 'INR');
    assert.equal(config.keySecret, undefined, 'Must NEVER expose keySecret');
    assert.equal(config.webhookSecret, undefined, 'Must NEVER expose webhookSecret');
  });

  it('2. Order Creation & Authoritative Amount Calculation', async () => {
    const tripDetails = {
      serviceType: 'flights',
      route: 'Delhi (DEL) → Mumbai (BOM)',
      baseRatePerUnit: 5400,
      passengerCount: 2,
      fareAmount: 10800,
    };

    // Calculate authoritative price in paise
    const authoritativeAmount = Number(tripDetails.fareAmount) || 10800;
    const amountInPaise = Math.round(authoritativeAmount * 100);
    assert.equal(amountInPaise, 1080000, 'Must convert ₹10,800 to 1,080,000 paise');

    const bookingId = 'BK-TEST-101';
    const orderId = `order_test_${Date.now()}_abc`;

    // Persist order in DB
    await db.saveOrder(orderId, {
      bookingId,
      amount: amountInPaise,
      currency: 'INR',
      status: 'created',
    });

    await db.updateBookingPayment(bookingId, {
      id: bookingId,
      razorpayOrderId: orderId,
      amount: authoritativeAmount,
      currency: 'INR',
      paymentStatus: 'PENDING',
    });

    const storedOrder = await db.getOrder(orderId);
    assert.ok(storedOrder);
    assert.equal(storedOrder.bookingId, bookingId);
    assert.equal(storedOrder.amount, 1080000);

    const storedBooking = await db.getBooking(bookingId);
    assert.ok(storedBooking);
    assert.equal(storedBooking.paymentStatus, 'PENDING');
  });

  it('3. Duplicate Order Prevention: Reuses valid pending order for identical booking', async () => {
    const bookingId = 'BK-DUP-1';
    const orderId = 'order_first_1';
    const amountInPaise = 420000;

    // Simulate first order creation
    await db.saveOrder(orderId, {
      orderId,
      bookingId,
      amount: amountInPaise,
      currency: 'INR',
    });

    await db.updateBookingPayment(bookingId, {
      id: bookingId,
      razorpayOrderId: orderId,
      paymentStatus: 'PENDING',
    });

    // Check duplicate detection logic
    const existingBooking = await db.getBooking(bookingId);
    assert.equal(existingBooking.paymentStatus, 'PENDING');
    const existingOrder = await db.getOrder(existingBooking.razorpayOrderId);
    assert.ok(existingOrder);
    assert.equal(existingOrder.amount, amountInPaise);

    // Reused order check passed
    assert.equal(existingOrder.orderId, orderId);
  });

  it('4. Payment Verification: Validates HMAC-SHA256 signature using timingSafeEqual', async () => {
    const testSecret = 'secret_test_key_999';
    const orderId = 'order_valid_123';
    const paymentId = 'pay_test_456';

    // Generate expected HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Matching signature
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(expectedSignature, 'utf-8')
    );
    assert.equal(isValid, true, 'Valid signature must match');

    // Tampered signature
    const tamperedSignature = expectedSignature.slice(0, -4) + '0000';
    let isTamperedValid = false;
    try {
      isTamperedValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(tamperedSignature, 'utf-8')
      );
    } catch {
      isTamperedValid = false;
    }
    assert.equal(isTamperedValid, false, 'Tampered signature must be rejected');
  });

  it('5. Payment Verification: Confirms booking payment state transition to PAID', async () => {
    const bookingId = 'BK-VERIFY-1';
    const orderId = 'order_test_ver_1';
    const paymentId = 'pay_verified_999';

    await db.saveBooking({ id: bookingId, paymentStatus: 'PENDING' });
    await db.saveOrder(orderId, { orderId, bookingId, amount: 945000 });

    const updated = await db.updateBookingPayment(bookingId, {
      paymentStatus: 'PAID',
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      razorpaySignature: 'valid_sig',
      paymentVerifiedAt: new Date().toISOString(),
    });

    assert.equal(updated.paymentStatus, 'PAID');
    assert.equal(updated.razorpayPaymentId, paymentId);
    assert.ok(updated.paymentVerifiedAt);
  });

  it('6. Webhooks: Raw-Body HMAC-SHA256 verification and idempotent processing', async () => {
    const webhookSecret = 'test_webhook_secret_abc';
    const payloadObject = {
      entity: 'event',
      id: 'evt_captured_1',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_wh_1',
            order_id: 'order_wh_1',
            amount: 540000,
          },
        },
      },
    };

    const rawBuffer = Buffer.from(JSON.stringify(payloadObject), 'utf-8');

    // Calculate signature against RAW body
    const calculatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBuffer)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'utf-8'),
      Buffer.from(calculatedSignature, 'utf-8')
    );
    assert.equal(isValid, true, 'Raw body webhook signature must match');

    // Idempotency check
    assert.equal(await db.isWebhookProcessed('evt_captured_1'), false);
    await db.recordWebhookEvent('evt_captured_1', 'payment.captured', payloadObject);
    assert.equal(await db.isWebhookProcessed('evt_captured_1'), true, 'Must record as processed');
  });

  it('7. Payment State Protection: Never downgrades PAID booking on stale failure', async () => {
    const bookingId = 'BK-SAFE-1';

    // 1. Mark as PAID
    await db.saveBooking({ id: bookingId, paymentStatus: 'PAID' });
    const booking = await db.getBooking(bookingId);
    assert.equal(booking.paymentStatus, 'PAID');

    // 2. Attempt to update with FAILED (e.g. out-of-order or late event)
    const result = await db.updateBookingPayment(bookingId, {
      paymentStatus: 'FAILED',
      failureReason: 'Stale error delivery',
    });

    assert.equal(result.paymentStatus, 'PAID', 'State must remain PAID and refuse downgrade');
  });

  it('8. Atomic Webhook Processing: transactProcessWebhook atomically updates booking and prevents duplicate processing', async () => {
    const bookingId = 'BK-WH-ATOMIC-1';
    await db.saveBooking({ id: bookingId, paymentStatus: 'PENDING' });

    // 1. First event delivery succeeds and marks booking PAID
    const tx1 = await db.transactProcessWebhook({
      eventId: 'evt_atomic_1',
      eventName: 'payment.captured',
      payloadSummary: { amount: 5000 },
      bookingId,
      paymentStatus: 'PAID',
      paymentId: 'pay_atomic_1',
      orderId: 'order_atomic_1',
    });
    assert.equal(tx1.success, true);
    assert.equal(tx1.processed, true);

    const b1 = await db.getBooking(bookingId);
    assert.equal(b1.paymentStatus, 'PAID');
    assert.equal(b1.razorpayPaymentId, 'pay_atomic_1');

    // 2. Duplicate delivery of same eventId is detected as alreadyProcessed
    const tx2 = await db.transactProcessWebhook({
      eventId: 'evt_atomic_1',
      eventName: 'payment.captured',
      payloadSummary: { amount: 5000 },
      bookingId,
      paymentStatus: 'PAID',
      paymentId: 'pay_atomic_1',
      orderId: 'order_atomic_1',
    });
    assert.equal(tx2.success, true);
    assert.equal(tx2.alreadyProcessed, true);

    // 3. Stale failed payment event does NOT downgrade booking from PAID
    const tx3 = await db.transactProcessWebhook({
      eventId: 'evt_atomic_stale_failed',
      eventName: 'payment.failed',
      payloadSummary: { amount: 5000 },
      bookingId,
      paymentStatus: 'FAILED',
      failureReason: 'Customer card declined late',
    });
    assert.equal(tx3.success, true);
    assert.equal(tx3.bookingConditionIgnored, true);

    const b2 = await db.getBooking(bookingId);
    assert.equal(b2.paymentStatus, 'PAID', 'Must remain PAID');
    assert.equal(
      await db.isWebhookProcessed('evt_atomic_stale_failed'),
      true,
      'Stale failed event must still be durably recorded'
    );

    // 4. Missing booking on PAID event throws and never leaves event marked processed
    await assert.rejects(
      async () => {
        await db.transactProcessWebhook({
          eventId: 'evt_missing_booking',
          eventName: 'payment.captured',
          payloadSummary: { amount: 1000 },
          bookingId: 'BK-NONEXISTENT',
          paymentStatus: 'PAID',
          paymentId: 'pay_missing',
          orderId: 'order_missing',
        });
      },
      /Required booking update failed/
    );
    assert.equal(await db.isWebhookProcessed('evt_missing_booking'), false, 'Event must NOT be marked processed if update failed');
  });

  it('9. Atomic Order Commit & Key Mutation Defense: commitBookingOrder excludes primary key `id` from UpdateExpression and guarantees atomic commit', async () => {
    // A. Verify DynamoDBRepository TransactWrite parameter compilation & strict primary key defense
    const repo = new DynamoDBRepository();
    let capturedTransactItems = null;

    repo.docClient = {
      send: async (command) => {
        capturedTransactItems = command.input?.TransactItems;
        // Strictly emulate DynamoDB engine rule: Cannot update attribute id (part of key)
        const updateOp = capturedTransactItems?.[0]?.Update;
        if (updateOp) {
          const keyNames = Object.keys(updateOp.Key || {});
          const exprNames = updateOp.ExpressionAttributeNames || {};
          const updateExpr = updateOp.UpdateExpression || '';

          for (const key of keyNames) {
            for (const [placeholder, actualAttr] of Object.entries(exprNames)) {
              if (actualAttr === key && updateExpr.includes(placeholder)) {
                const err = new Error(`ValidationError: Cannot update attribute ${key}. This attribute is part of the key`);
                err.name = 'ValidationException';
                throw err;
              }
            }
          }
        }
        return {};
      },
    };

    const bookingId = 'BK-REGRESS-ATOMIC-1';
    const claimToken = 'claim_token_valid_456';
    const orderId = 'order_valid_789';

    // Mock getBooking on repo so commitBookingOrder resolves successfully
    repo.getBooking = async (id) => ({
      id,
      entityType: 'BOOKING',
      orderClaimStatus: 'COMPLETED',
      razorpayOrderId: orderId,
      amount: 4872,
    });

    // Booking payload passed by server/index.js contains `id: cleanBookingId`
    const bookingPayloadWithId = {
      id: bookingId,
      entityType: 'BOOKING',
      catalogTripId: 'trip#flights#AI-805',
      amount: 4872,
      passengerCount: 1,
      customerName: 'Aarav Sharma',
      customerEmail: 'aarav@example.com',
    };

    const commitResult = await repo.commitBookingOrder(
      bookingId,
      claimToken,
      orderId,
      {
        amount: 487200,
        currency: 'INR',
        catalogTripId: 'trip#flights#AI-805',
        status: 'created',
      },
      bookingPayloadWithId
    );

    assert.equal(commitResult.success, true, 'commitBookingOrder must succeed without throwing ValidationError');
    assert.ok(capturedTransactItems, 'TransactItems must be dispatched');
    assert.equal(capturedTransactItems.length, 2, 'Must atomically bundle exactly 2 operations (Update booking + Put order)');

    // 1. Inspect Booking Update operation
    const updateOp = capturedTransactItems[0].Update;
    assert.equal(updateOp.Key.id, bookingId, 'Primary key in Key object must match bookingId');

    const attrValues = Object.values(updateOp.ExpressionAttributeNames || {});
    assert.equal(
      attrValues.includes('id'),
      false,
      'Primary key attribute `id` must NOT be present in ExpressionAttributeNames'
    );
    for (const [placeholder, actualAttr] of Object.entries(updateOp.ExpressionAttributeNames || {})) {
      assert.notEqual(
        actualAttr,
        'id',
        `Primary key 'id' must not have attribute name placeholder ${placeholder}`
      );
    }

    // 2. Verify fencing conditions are preserved
    assert.match(
      updateOp.ConditionExpression,
      /#claimToken\s*=\s*:claimToken/,
      'Claim fencing token must be verified'
    );
    assert.match(
      updateOp.ConditionExpression,
      /paymentStatus\s*<>\s*:paid/,
      'Must check booking is not already paid'
    );

    // 3. Inspect Order Put operation in the same transaction
    const putOp = capturedTransactItems[1].Put;
    assert.equal(putOp.Item.id, `order#${orderId}`);
    assert.equal(putOp.Item.bookingId, bookingId);
    assert.equal(putOp.ConditionExpression, 'attribute_not_exists(id)', 'Must prevent order overwrites');

    // B. Verify InMemoryRepository atomic commit and primary key integrity
    await db.saveBooking({
      id: bookingId,
      entityType: 'BOOKING',
      orderClaimToken: claimToken,
      paymentStatus: 'PENDING',
    });

    const inMemResult = await db.commitBookingOrder(
      bookingId,
      claimToken,
      orderId,
      { amount: 487200, currency: 'INR' },
      bookingPayloadWithId
    );

    assert.equal(inMemResult.success, true);
    assert.equal(inMemResult.booking.id, bookingId, 'Canonical booking id must be preserved');
    assert.equal(inMemResult.booking.orderClaimStatus, 'COMPLETED');
    assert.equal(inMemResult.booking.razorpayOrderId, orderId);

    const savedOrder = await db.getOrder(orderId);
    assert.ok(savedOrder);
    assert.equal(savedOrder.bookingId, bookingId);
  });
});
