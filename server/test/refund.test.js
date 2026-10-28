/**
 * server/test/refund.test.js
 * Automated Backend Tests for Refund Backend & Persistence Layer (Person 3).
 * Executed via Node.js built-in test runner: `npm run test:server`
 */

import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { createDatabase, safeCleanup } from '../awsConfig.js';
import {
  createRefundService,
  REFUND_STATUSES,
} from '../refundService.js';
import { createRefundRouter } from '../refundRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataFile = path.join(__dirname, '../data/store.refund-test.json');

// Dedicated, isolated database and service instances for Refund Tests
const db = createDatabase({ isTest: true, testDataFile });
const refundService = createRefundService(db);
const {
  submitRefund,
  getRefundById,
  processReviewerDecision,
  listRefunds,
  saveDraftNote,
} = refundService;
const refundRouter = createRefundRouter(refundService);

// In-process invocation helper to test Express routes without binding TCP ports (sandbox safe)
const invokeRefundRoute = (app, method, url, body = null) => {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = { 'content-type': 'application/json' };
    if (body) req.body = body;

    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.bodyData = null;
    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
    res.getHeader = (k) => res.headers[k.toLowerCase()];
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => {
      res.bodyData = data;
      resolve({ status: res.statusCode, body: data });
      return res;
    };
    res.send = (data) => {
      res.bodyData = data;
      resolve({ status: res.statusCode, body: data });
      return res;
    };
    res.end = () => {
      resolve({ status: res.statusCode, body: res.bodyData });
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
    });
  });
};

beforeEach(async () => {
  await db._reset();
});

after(() => {
  safeCleanup(testDataFile);
});

describe('Refund Backend & Persistence Tests (Person 3)', () => {
  it('1. Input Validation: Rejects missing bookingId or reason', async () => {
    const noBooking = await submitRefund({ reason: 'Flight cancelled' });
    assert.equal(noBooking.success, false);
    assert.equal(noBooking.statusCode, 400);
    assert.match(noBooking.error, /bookingId is required/);

    const noReason = await submitRefund({ bookingId: 'BK-101' });
    assert.equal(noReason.success, false);
    assert.equal(noReason.statusCode, 400);
    assert.match(noReason.error, /reason is required/);
  });

  it('2. Booking Existence: Rejects non-existent booking ID', async () => {
    const res = await submitRefund({
      bookingId: 'BK-NONEXISTENT',
      reason: 'Flight delayed over 4 hours',
    });
    assert.equal(res.success, false);
    assert.equal(res.statusCode, 404);
    assert.match(res.error, /not found/i);
  });

  it('3. Payment Eligibility: Rejects bookings that are not in PAID status', async () => {
    // 1. Pending payment booking
    await db.saveBooking({
      id: 'BK-PENDING-1',
      amount: 4500,
      paymentStatus: 'PENDING',
    });

    const pendingRes = await submitRefund({
      bookingId: 'BK-PENDING-1',
      reason: 'Flight cancelled by carrier',
    });
    assert.equal(pendingRes.success, false);
    assert.equal(pendingRes.statusCode, 400);
    assert.match(pendingRes.error, /must be PAID/);

    // 2. Failed payment booking
    await db.saveBooking({
      id: 'BK-FAILED-1',
      amount: 3200,
      paymentStatus: 'FAILED',
    });

    const failedRes = await submitRefund({
      bookingId: 'BK-FAILED-1',
      reason: 'Trip cancelled',
    });
    assert.equal(failedRes.success, false);
    assert.equal(failedRes.statusCode, 400);
    assert.match(failedRes.error, /must be PAID/);
  });

  it('4. Amount Validation: Validates claim amounts against eligible paid amounts', async () => {
    const bookingId = 'BK-AMT-1';
    await db.saveBooking({
      id: bookingId,
      amount: 5000,
      paymentStatus: 'PAID',
      razorpayPaymentId: 'pay_amt_test_1',
    });

    // Zero or negative claim amount
    const zeroRes = await submitRefund({
      bookingId,
      reason: 'Cancellation',
      claimAmount: 0,
    });
    assert.equal(zeroRes.success, false);
    assert.equal(zeroRes.statusCode, 400);
    assert.match(zeroRes.error, /greater than 0/);

    // Excessive claim amount exceeding paid amount (₹6000 > ₹5000)
    const excessRes = await submitRefund({
      bookingId,
      reason: 'Cancellation',
      claimAmount: 6000,
    });
    assert.equal(excessRes.success, false);
    assert.equal(excessRes.statusCode, 400);
    assert.match(excessRes.error, /cannot exceed/);

    // Valid partial claim amount (₹3000 <= ₹5000)
    const partialRes = await submitRefund({
      bookingId,
      reason: 'Cancellation of return leg only',
      claimAmount: 3000,
    });
    assert.equal(partialRes.success, true);
    assert.equal(partialRes.statusCode, 201);
    assert.equal(partialRes.refund.claimAmount, 3000);
    assert.equal(partialRes.refund.eligiblePaidAmount, 5000);
  });

  it('5. Duplicate Prevention: Prevents multiple active refund requests for the same booking', async () => {
    const bookingId = 'BK-DUP-CHECK-1';
    await db.saveBooking({
      id: bookingId,
      amount: 4200,
      paymentStatus: 'PAID',
      razorpayPaymentId: 'pay_dup_1',
    });

    // 1st submission succeeds
    const firstRes = await submitRefund({
      bookingId,
      reason: 'Train cancelled by Indian Railways',
    });
    assert.equal(firstRes.success, true);
    assert.equal(firstRes.statusCode, 201);
    assert.ok(firstRes.refund.id);

    // 2nd submission for same booking must be rejected with 409 Conflict
    const secondRes = await submitRefund({
      bookingId,
      reason: 'Duplicate claim attempt',
    });
    assert.equal(secondRes.success, false);
    assert.equal(secondRes.statusCode, 409);
    assert.match(secondRes.error, /already exists/i);
    assert.equal(secondRes.refund.id, firstRes.refund.id);
  });

  it('6. Persistence & Reconciliation: Persists case in store and links to booking', async () => {
    const bookingId = 'BK-PERSIST-1';
    await db.saveBooking({
      id: bookingId,
      amount: 7800,
      currency: 'INR',
      paymentStatus: 'PAID',
      razorpayPaymentId: 'pay_persist_99',
      razorpayOrderId: 'order_persist_99',
      paymentVerifiedAt: '2026-10-18T10:00:00.000Z',
      bookingDetails: {
        operator: 'Vistara',
        code: 'UK-812',
        serviceType: 'flights',
        route: 'Delhi → Bengaluru',
        passengers: 'Ananya Verma',
      },
    });

    const submitRes = await submitRefund({
      bookingId,
      reason: 'Flight delayed > 5 hours without accommodation',
      evidence: ['flight_delay_sms.png'],
    });

    assert.equal(submitRes.success, true);
    const refundId = submitRes.refund.id;

    // Verify stored in DB
    const retrieved = await db.getRefund(refundId);
    assert.ok(retrieved);
    assert.equal(retrieved.id, refundId);
    assert.equal(retrieved.bookingId, bookingId);
    assert.equal(retrieved.claimAmount, 7800);
    assert.equal(retrieved.carrier.name, 'Vistara');
    assert.equal(retrieved.evidence[0], 'flight_delay_sms.png');

    // Verify booking is reconciled with refund case ID and status
    const updatedBooking = await db.getBooking(bookingId);
    assert.equal(updatedBooking.refundCaseId, refundId);
    assert.equal(updatedBooking.refundStatus, 'Under Investigation');
  });

  it('7. GET /api/refunds/:id: Retrieves refund by ID, caseRef, or booking ID', async () => {
    const bookingId = 'BK-LOOKUP-1';
    await db.saveBooking({ id: bookingId, amount: 2500, paymentStatus: 'PAID' });
    const createdResult = await submitRefund({ bookingId, reason: 'Carrier cancelled' });
    const created = createdResult.refund;

    // By ID
    const byId = await getRefundById(created.id);
    assert.equal(byId.success, true);
    assert.equal(byId.refund.id, created.id);

    // By caseRef (with #)
    const byRef = await getRefundById(created.caseRef);
    assert.equal(byRef.success, true);
    assert.equal(byRef.refund.id, created.id);

    // By booking ID
    const byBooking = await getRefundById(bookingId);
    assert.equal(byBooking.success, true);
    assert.equal(byBooking.refund.id, created.id);

    // Non-existent ID returns 404
    const notFound = await getRefundById('RF-UNKNOWN');
    assert.equal(notFound.success, false);
    assert.equal(notFound.statusCode, 404);
  });

  it('8. Reviewer Decision: Coordinates with Person 4 (Approve / Reject / Docs / Escalate)', async () => {
    const bookingId = 'BK-DECISION-1';
    await db.saveBooking({ id: bookingId, amount: 6200, paymentStatus: 'PAID' });
    const refundResult = await submitRefund({ bookingId, reason: 'Medical emergency' });
    const refund = refundResult.refund;

    // Missing comment / note rejected
    const noNote = await processReviewerDecision(refund.id, { decision: 'APPROVE' });
    assert.equal(noNote.success, false);
    assert.equal(noNote.statusCode, 400);

    // Request additional info / carrier evidence
    const docsRes = await processReviewerDecision(refund.id, {
      decision: 'more_docs',
      note: 'Need hospital admission certificate copy',
      reviewerId: 'Lead Auditor Julian',
    });
    assert.equal(docsRes.success, true);
    assert.equal(docsRes.refund.decisionStatus, REFUND_STATUSES.AWAITING_CARRIER_EVIDENCE);
    assert.equal(docsRes.refund.reviewerComment, 'Need hospital admission certificate copy');

    // Escalate to senior desk
    const escRes = await processReviewerDecision(refund.id, {
      decision: 'ESCALATE',
      note: 'Complex policy question, escalating',
      reviewerId: 'Auditor Maya',
    });
    assert.equal(escRes.success, true);
    assert.equal(escRes.refund.decisionStatus, REFUND_STATUSES.UNDER_HUMAN_REVIEW);

    // Approve refund
    const approveRes = await processReviewerDecision(refund.id, {
      decision: 'eligible',
      note: 'Medical certificate verified and approved under exceptional policy waiver',
      reviewerId: 'Senior Auditor Julian Hayes',
    });
    assert.equal(approveRes.success, true);
    assert.equal(approveRes.refund.decisionStatus, REFUND_STATUSES.APPROVED);
    assert.equal(approveRes.refund.approvedAmount, 6200);

    // Check booking updated
    const booking = await db.getBooking(bookingId);
    assert.equal(booking.refundStatus, 'Full Refund Eligible');
  });

  it('9. Invalid Status Transitions: Rejects altering finalized or approved refunds', async () => {
    const bookingId = 'BK-FINAL-1';
    await db.saveBooking({ id: bookingId, amount: 3500, paymentStatus: 'PAID' });
    const refundResult = await submitRefund({ bookingId, reason: 'Flight cancelled' });
    const refund = refundResult.refund;

    // Approve the refund
    const appRes = await processReviewerDecision(refund.id, {
      decision: 'APPROVE',
      note: 'Approved',
    });
    assert.equal(appRes.success, true);

    // Attempting to re-approve or reject an already approved refund must be rejected
    const alterRes = await processReviewerDecision(refund.id, {
      decision: 'REJECT',
      note: 'Attempting to reject after approval',
    });
    assert.equal(alterRes.success, false);
    assert.equal(alterRes.statusCode, 400);
    assert.match(alterRes.error, /Cannot alter decision/);
  });

  it('10. Express Router End-to-End: Verifies HTTP routing via in-process Express handler', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/refunds', refundRouter);

    await db.saveBooking({ id: 'BK-HTTP-1', amount: 5500, paymentStatus: 'PAID' });

    // 1. Submit POST /api/refunds/submit
    const submitRes = await invokeRefundRoute(app, 'POST', '/api/refunds/submit', {
      bookingId: 'BK-HTTP-1',
      reason: 'Severe weather cancellation',
    });
    assert.equal(submitRes.status, 201);
    assert.equal(submitRes.body.success, true);
    const refundId = submitRes.body.refund.id;

    // 2. Query GET /api/refunds/:id
    const getRes = await invokeRefundRoute(app, 'GET', `/api/refunds/${refundId}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.refund.id, refundId);

    // 3. Reviewer Decision POST /api/refunds/:id/decision
    const decRes = await invokeRefundRoute(app, 'POST', `/api/refunds/${refundId}/decision`, {
      decision: 'APPROVE',
      note: 'Weather alert cross-referenced with METAR logs',
      reviewerId: 'Auditor Julian',
    });
    assert.equal(decRes.status, 200);
    assert.equal(decRes.body.refund.decisionStatus, 'Approved');

    // 4. List GET /api/refunds
    const listRes = await invokeRefundRoute(app, 'GET', '/api/refunds');
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.count, 1);
  });

  it('11. Regression Test: Booking BK-148123 data consistency (IndiGo, ₹5,120, non-fabricated traveler, no AT-9842 fallback)', async () => {
    // Seed verified paid booking BK-148123 exactly as stored in store.json
    await db.saveBooking({
      id: 'BK-148123',
      amount: 5120,
      currency: 'INR',
      paymentStatus: 'PAID',
      razorpayOrderId: 'order_Tog5jR7Qp2CgP4',
      razorpayPaymentId: 'pay_TogBAypoJSOi1K',
      paymentVerifiedAt: '2026-10-16T18:31:24.095Z',
      bookingDetails: {
        id: '6E-2134',
        code: '6E-2134',
        operator: 'IndiGo',
        serviceType: 'flights',
        title: 'IndiGo · 6E-2134',
        route: 'Delhi (DEL) → Mumbai (BOM)',
        origin: 'Delhi (DEL)',
        destination: 'Mumbai (BOM)',
        departDate: '2026-12-21',
        fareAmount: 5120,
        passengers: '1 Traveller · Economy',
        refundable: true,
      },
    });

    // 1. Submit claim for BK-148123
    const submitResult = await submitRefund({
      bookingId: 'BK-148123',
      reason: 'Cancelled by airline / operator (Flight 6E-2134)',
      contact: 'aarav.sharma@example.com',
      currency: 'INR',
    });

    assert.equal(submitResult.success, true);
    assert.equal(submitResult.statusCode, 201);
    const refund = submitResult.refund;

    // Verify booking reference / PNR
    assert.equal(refund.pnr, 'BK-148123');
    assert.notEqual(refund.pnr, '482910');

    // Verify Carrier is IndiGo 6E-2134, NOT Air India AI-805
    assert.equal(refund.carrier.name, 'IndiGo');
    assert.equal(refund.carrier.code, '6E-2134');
    assert.notEqual(refund.carrier.name, 'Air India');
    assert.notEqual(refund.carrier.code, 'AI-805');

    // Verify Authoritative Amount is ₹5,120, NOT ₹9,450
    assert.equal(refund.claimAmount, 5120);
    assert.equal(refund.eligiblePaidAmount, 5120);
    assert.equal(refund.claimAmountFormatted, '₹5,120');
    assert.notEqual(refund.claimAmount, 9450);

    // Verify Traveler is not fabricated mock persona 'Rahul Sharma'
    assert.notEqual(refund.traveler.name, 'Rahul Sharma');
    assert.equal(refund.traveler.name, 'Aarav Sharma');

    // Verify Case ID is not the mock ID AT-9842
    assert.notEqual(refund.id, 'AT-9842');
    assert.match(refund.id, /^RF-/);

    // 2. Query by booking ID directly via getRefundById
    const getResult = await getRefundById('BK-148123');
    assert.equal(getResult.success, true);
    assert.equal(getResult.statusCode, 200);
    assert.equal(getResult.refund.id, refund.id);
    assert.equal(getResult.refund.carrier.name, 'IndiGo');
    assert.equal(getResult.refund.claimAmount, 5120);

    // 3. Test HTTP routing for GET /api/refunds/BK-148123 via in-process Express handler
    const app = express();
    app.use(express.json());
    app.use('/api/refunds', refundRouter);

    const httpRes = await invokeRefundRoute(app, 'GET', '/api/refunds/BK-148123');
    assert.equal(httpRes.status, 200);
    assert.equal(httpRes.body.success, true);
    assert.equal(httpRes.body.refund.bookingId, 'BK-148123');
    assert.equal(httpRes.body.refund.carrier.name, 'IndiGo');
    assert.equal(httpRes.body.refund.claimAmount, 5120);
    assert.notEqual(httpRes.body.refund.carrier.name, 'Air India');
    assert.notEqual(httpRes.body.refund.claimAmount, 9450);
  });

  it('12. Draft Persistence: saveDraftNote persists note to store.json and survives reload', async () => {
    // Setup a PAID booking and submit a refund
    await db.saveBooking({
      id: 'BK-DRAFT-TEST',
      amount: 3800,
      currency: 'INR',
      paymentStatus: 'PAID',
      bookingDetails: {
        operator: 'SpiceJet',
        code: 'SG-101',
        serviceType: 'flights',
        route: 'Chennai (MAA) → Delhi (DEL)',
        departDate: '2026-11-15',
        fareAmount: 3800,
        travelClass: 'Economy',
        passengers: '1 Traveller · Economy',
        refundable: true,
      },
    });

    const submitResult = await submitRefund({
      bookingId: 'BK-DRAFT-TEST',
      reason: 'Carrier cancelled flight SG-101',
    });
    assert.equal(submitResult.success, true);
    const refundId = submitResult.refund.id;

    // 1. Save a draft note
    const draftNote = 'Awaiting additional carrier ops log from SpiceJet GDS system.';
    const draftResult = await saveDraftNote(refundId, {
      reviewerNote: draftNote,
      draftDecision: 'more_docs',
      reviewerId: 'Julian Hayes (Lead Auditor)',
    });

    // Verify draft was accepted
    assert.equal(draftResult.success, true);
    assert.equal(draftResult.statusCode, 200);
    assert.match(draftResult.message, /Draft note saved/);

    // 2. Verify the draft note is persisted in the returned refund
    assert.equal(draftResult.refund.reviewerDraftNote, draftNote);
    assert.equal(draftResult.refund.reviewerDraftDecision, 'more_docs');
    assert.ok(draftResult.refund.reviewerDraftSavedAt);

    // 3. Verify the decision status is NOT changed by a draft save
    assert.equal(draftResult.refund.decisionStatus, REFUND_STATUSES.UNDER_HUMAN_REVIEW);

    // 4. Verify an audit log entry was created
    assert.ok(draftResult.refund.auditLog.length > 0);
    const draftLogEntry = draftResult.refund.auditLog[0];
    assert.equal(draftLogEntry.title, 'Reviewer Draft Note Saved');
    assert.match(draftLogEntry.description, /Draft saved by Julian Hayes/);
    assert.match(draftLogEntry.description, /more_docs/);

    // 5. Simulate reload: re-fetch from db directly (simulates server restart / page refresh)
    const reloaded = await getRefundById(refundId);
    assert.equal(reloaded.success, true);
    assert.equal(reloaded.refund.reviewerDraftNote, draftNote);
    assert.equal(reloaded.refund.reviewerDraftDecision, 'more_docs');
    assert.equal(reloaded.refund.decisionStatus, REFUND_STATUSES.UNDER_HUMAN_REVIEW);

    // 6. Verify HTTP endpoint also returns draft note via in-process Express handler
    const app = express();
    app.use(express.json());
    app.use('/api/refunds', refundRouter);

    // GET by refund ID
    const getRes = await invokeRefundRoute(app, 'GET', `/api/refunds/${refundId}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.refund.reviewerDraftNote, draftNote);

    // POST /draft endpoint
    const updatedNote = 'Confirmed carrier cancellation. Ready for review.';
    const postDraftRes = await invokeRefundRoute(app, 'POST', `/api/refunds/${refundId}/draft`, {
      reviewerNote: updatedNote,
      draftDecision: 'eligible',
    });
    assert.equal(postDraftRes.status, 200);
    assert.equal(postDraftRes.body.success, true);
    assert.equal(postDraftRes.body.refund.reviewerDraftNote, updatedNote);
    assert.equal(postDraftRes.body.refund.reviewerDraftDecision, 'eligible');
    // Decision status unchanged
    assert.equal(postDraftRes.body.refund.decisionStatus, REFUND_STATUSES.UNDER_HUMAN_REVIEW);

    // 7. Verify draft rejects empty note
    const emptyDraft = await saveDraftNote(refundId, { reviewerNote: '   ' });
    assert.equal(emptyDraft.success, false);
    assert.equal(emptyDraft.statusCode, 400);
    assert.match(emptyDraft.error, /reviewerNote is required/);

    // 8. Verify draft rejects finalized (approved) case
    const approveResult = await processReviewerDecision(refundId, {
      decision: 'APPROVE',
      reviewerComment: 'Final approval after carrier evidence confirmed.',
    });
    assert.equal(approveResult.success, true);

    const finalDraft = await saveDraftNote(refundId, { reviewerNote: 'Late draft attempt.' });
    assert.equal(finalDraft.success, false);
    assert.equal(finalDraft.statusCode, 400);
    assert.match(finalDraft.error, /finalized status/);
  });

  it('13. Concurrency & Optimistic Locking: Detects version conflict on simultaneous reviewer decisions', async () => {
    const bookingId = 'BK-CONCURRENCY-1';
    await db.saveBooking({ id: bookingId, amount: 4900, paymentStatus: 'PAID' });
    const refundResult = await submitRefund({ bookingId, reason: 'Flight cancellation' });
    const refundId = refundResult.refund.id;

    // First reviewer submits a decision (advances version from 1 to 2)
    const firstDecision = await processReviewerDecision(refundId, {
      decision: 'more_docs',
      note: 'Auditor A: Requesting luggage tags',
      reviewerId: 'Auditor A',
    });
    assert.equal(firstDecision.success, true);
    assert.equal(firstDecision.refund.version, 2);

    // Stale direct transact attempt with stale expectedVersion 1 must fail with concurrencyConflict
    const staleTx = await db.transactReviewerDecision({
      refundId,
      bookingId,
      updateData: {
        decisionStatus: 'Approved',
        status: 'APPROVED',
        finalDecision: 'Approved by Auditor B',
        reviewerComment: 'Auditor B: Approved with stale view',
        assignedAuditor: 'Auditor B',
        approvedAmount: 4900,
        auditLog: [],
        history: [],
      },
      expectedVersion: 1, // Stale version!
    });
    assert.equal(staleTx.success, false);
    assert.equal(staleTx.concurrencyConflict, true);
  });
});
