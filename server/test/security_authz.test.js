/**
 * server/test/security_authz.test.js
 * Pre-Deployment Security Remediation & Access Control Regression Suite.
 *
 * Verifies:
 * 1. Production JWT secret fail-closed validation (missing / weak secret throws fatal error).
 * 2. Refund decision & draft endpoints strictly require reviewer authorization (401 anon, 403 traveler, 200 reviewer).
 * 3. System-wide refund queue listing strictly restricted to reviewers (401 anon, 403 traveler, 200 reviewer).
 * 4. Case detail viewing enforced by case-level ownership (401 anon, 403 non-owner traveler, 200 legitimate owner, 200 reviewer).
 * 5. Evidence upload, listing, download, and arbitration summary dossier protected by authentication & case ownership
 *    (401 anon, 403 non-owner traveler, 201/200 owner, 200 reviewer).
 * 6. Expired, malformed, and non-bearer tokens are rejected with 401.
 * 7. Administrators ('admin' role) have full authorized access across reviewer routes and evidence.
 * 8. Registration role-tampering attempts are strictly rejected/coerced to 'traveler'.
 * 9. Reviewer audit identity is derived strictly from verified JWT claims, ignoring client-supplied reviewerId.
 * 10. Query-string session tokens are rejected; evidence viewing requires Authorization header.
 * 11. Booking payment status lookup is protected by authentication and ownership/reviewer role.
 */

import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app } from '../index.js';
import { db } from '../awsConfig.js';
import { authService, resolveJwtSecret } from '../authService.js';
import { loginRateLimiter, registerRateLimiter } from '../rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to invoke Express app in-process without opening TCP ports
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
    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
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

describe('Pre-Deployment Security & Role-Based Authorization Tests', () => {
  // Generate identities
  const travelerA = {
    id: 'usr_traveler_a',
    email: 'traveler.a@example.com',
    name: 'Traveler Alice',
    role: 'traveler',
  };
  const tokenTravelerA = authService.generateToken(travelerA);
  const headersTravelerA = { authorization: `Bearer ${tokenTravelerA}` };

  const travelerB = {
    id: 'usr_traveler_b',
    email: 'traveler.b@example.com',
    name: 'Traveler Bob',
    role: 'traveler',
  };
  const tokenTravelerB = authService.generateToken(travelerB);
  const headersTravelerB = { authorization: `Bearer ${tokenTravelerB}` };

  const reviewer = {
    id: 'usr_reviewer_julian',
    email: 'julian.hayes@agenttravel.com',
    name: 'Julian Hayes',
    role: 'reviewer',
  };
  const tokenReviewer = authService.generateToken(reviewer);
  const headersReviewer = { authorization: `Bearer ${tokenReviewer}` };

  const admin = {
    id: 'usr_admin_alexandra',
    email: 'alexandra.admin@agenttravel.com',
    name: 'Alexandra Vance (Admin)',
    role: 'admin',
  };
  const tokenAdmin = authService.generateToken(admin);
  const headersAdmin = { authorization: `Bearer ${tokenAdmin}` };

  const caseId = 'RF-SEC-CASE-101';
  const bookingId = 'BK-SEC-BKG-101';

  beforeEach(async () => {
    // Reset test database and seed booking + refund owned by Traveler A
    await db._reset();

    loginRateLimiter.reset();
    registerRateLimiter.reset();

    await db.saveBooking({
      id: bookingId,
      userId: travelerA.id,
      customerEmail: travelerA.email,
      amount: 4500,
      currency: 'INR',
      paymentStatus: 'PAID',
      traveler: {
        name: travelerA.name,
        email: travelerA.email,
      },
    });

    await db.saveRefund({
      id: caseId,
      bookingId,
      userId: travelerA.id,
      customerEmail: travelerA.email,
      pnr: bookingId,
      caseRef: `#${caseId}`,
      claimAmount: 4500,
      eligiblePaidAmount: 4500,
      decisionStatus: 'Under Human Review',
      carrier: { name: 'Air India', code: 'AI-101' },
      traveler: { name: travelerA.name, email: travelerA.email },
      auditLog: [],
    });
  });

  after(() => {
    // Clean up test evidence files created during this test run
    const testDir = path.join(__dirname, `../data/evidence/${caseId}`);
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      for (const file of files) {
        if (file !== 'ev_mvtulgal_6ea4a463_boarding_pass.pdf') {
          try {
            fs.unlinkSync(path.join(testDir, file));
          } catch {
            // ignore
          }
        }
      }
    }
  });

  // =========================================================================
  // 1. JWT Secret Production Fail-Closed
  // =========================================================================
  describe('1. JWT Secret Resolution & Production Fail-Closed Security', () => {
    it('fails closed in production if SESSION_SECRET is missing', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        assert.throws(
          () => resolveJwtSecret(''),
          /\[SECURITY FATAL\] SESSION_SECRET environment variable is missing/
        );
        assert.throws(
          () => resolveJwtSecret(undefined),
          /\[SECURITY FATAL\] SESSION_SECRET environment variable is missing/
        );
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('fails closed in production if SESSION_SECRET is too weak (< 32 characters)', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        assert.throws(
          () => resolveJwtSecret('short-weak-secret-12345'),
          /\[SECURITY FATAL\] SESSION_SECRET is too weak/
        );
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('accepts strong >= 32 characters secret in production', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const strongSecret = 'super-secure-production-jwt-hmac-secret-min-32-chars!';
        const resolved = resolveJwtSecret(strongSecret);
        assert.equal(resolved, strongSecret);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('falls back safely to test secret in non-production environments', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'test';
        const resolved = resolveJwtSecret(undefined);
        assert.ok(resolved.length >= 32);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  // =========================================================================
  // 2. Token Expiry, Malformed Token & Header Format Tests (Phase 1.2)
  // =========================================================================
  describe('2. Token Expiry, Malformation & Header Validation (Phase 1.2)', () => {
    it('rejects an expired JWT with 401 on protected endpoints', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const expiredPayload = Buffer.from(
        JSON.stringify({
          sub: reviewer.id,
          email: reviewer.email,
          name: reviewer.name,
          role: reviewer.role,
          iat: Math.floor(Date.now() / 1000) - 7200,
          exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
        })
      ).toString('base64url');
      const secret = resolveJwtSecret();
      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${expiredPayload}`)
        .digest('base64url');
      const expiredToken = `${header}.${expiredPayload}.${signature}`;

      // Verify verifyToken returns null
      assert.equal(authService.verifyToken(expiredToken), null);

      // Verify HTTP routes reject with 401
      const resQueue = await invokeApp('GET', '/api/refunds', null, {
        authorization: `Bearer ${expiredToken}`,
      });
      assert.equal(resQueue.status, 401);
      assert.match(resQueue.body.error, /Invalid or expired session token/);

      const resCase = await invokeApp('GET', `/api/refunds/${caseId}`, null, {
        authorization: `Bearer ${expiredToken}`,
      });
      assert.equal(resCase.status, 401);
      assert.match(resCase.body.error, /Invalid or expired session token/);
    });

    it('rejects malformed tokens (not enough parts or random strings) with 401', async () => {
      const malformedTokens = [
        'not-a-valid-jwt',
        'part1.part2',
        'part1.part2.part3.part4',
        'undefined',
        '',
      ];

      for (const badToken of malformedTokens) {
        assert.equal(authService.verifyToken(badToken), null);
        const res = await invokeApp('GET', '/api/refunds', null, {
          authorization: `Bearer ${badToken}`,
        });
        assert.equal(res.status, 401);
      }
    });

    it('rejects tokens with tampered cryptographic signatures with 401', async () => {
      const tampered = tokenReviewer.slice(0, -6) + 'xxxxxx';
      assert.equal(authService.verifyToken(tampered), null);

      const res = await invokeApp('GET', '/api/refunds', null, {
        authorization: `Bearer ${tampered}`,
      });
      assert.equal(res.status, 401);
      assert.match(res.body.error, /Invalid or expired session token/);
    });

    it('rejects non-Bearer authentication schemes with 401', async () => {
      const res = await invokeApp('GET', '/api/refunds', null, {
        authorization: 'Basic dXNlcjpwYXNzd29yZA==',
      });
      assert.equal(res.status, 401);
      assert.match(res.body.error, /Authentication required\. No token provided\./);
    });
  });

  // =========================================================================
  // 3. Admin Role Authorization (Phase 1.2)
  // =========================================================================
  describe('3. Admin Role Authorization (Phase 1.2)', () => {
    it('allows admin role to list global refund queue (200)', async () => {
      const res = await invokeApp('GET', '/api/refunds', null, headersAdmin);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.refunds));
    });

    it('allows admin role to view any case detail (200)', async () => {
      const res = await invokeApp('GET', `/api/refunds/${caseId}`, null, headersAdmin);
      assert.equal(res.status, 200);
      assert.equal(res.body.refund.id, caseId);
    });

    it('allows admin role to save reviewer draft notes (200)', async () => {
      const res = await invokeApp(
        'POST',
        `/api/refunds/${caseId}/draft`,
        {
          reviewerNote: 'Admin supervisory review note.',
          draftDecision: 'eligible',
        },
        headersAdmin
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    it('allows admin role to finalize refund decisions (200)', async () => {
      const res = await invokeApp(
        'POST',
        `/api/refunds/${caseId}/decision`,
        {
          decision: 'APPROVE',
          reviewerComment: 'Authorized by Executive Administrator.',
        },
        headersAdmin
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.refund.decisionStatus, 'Approved');
    });

    it('allows admin role to download case arbitration summary (200)', async () => {
      const res = await invokeApp('GET', `/api/cases/${caseId}/summary`, null, headersAdmin);
      assert.equal(res.status, 200);
      assert.match(res.body.toString(), /AGENT TRAVEL — REFUND DISPUTE & ARBITRATION SUMMARY DOSSIER/);
    });
  });

  // =========================================================================
  // 4. Registration Role-Tampering Protection (Phase 1.2)
  // =========================================================================
  describe('4. Registration Role-Tampering Protection (Phase 1.2)', () => {
    it('coerces requested role: "reviewer" to "traveler" on public registration', async () => {
      const email = `tamper_rev_${Date.now()}@example.com`;
      const res = await invokeApp('POST', '/api/auth/register', {
        name: 'Sneaky Reviewer Attempt',
        email,
        password: 'SecurePassword@123',
        role: 'reviewer', // Malicious attempt to self-provision reviewer privileges
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.role, 'traveler', 'Public registration MUST strictly assign traveler role');

      // Verify the returned token also has role: 'traveler'
      const claims = authService.verifyToken(res.body.token);
      assert.equal(claims.role, 'traveler');

      // Verify the returned token cannot access reviewer routes
      const queueAttempt = await invokeApp('GET', '/api/refunds', null, {
        authorization: `Bearer ${res.body.token}`,
      });
      assert.equal(queueAttempt.status, 403);
      assert.match(queueAttempt.body.error, /Requires 'reviewer' role/);
    });

    it('coerces requested role: "admin" to "traveler" on public registration', async () => {
      const email = `tamper_adm_${Date.now()}@example.com`;
      const res = await invokeApp('POST', '/api/auth/register', {
        name: 'Sneaky Admin Attempt',
        email,
        password: 'SecurePassword@123',
        role: 'admin', // Malicious attempt to self-provision admin privileges
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.role, 'traveler', 'Public registration MUST strictly assign traveler role');

      const claims = authService.verifyToken(res.body.token);
      assert.equal(claims.role, 'traveler');
    });
  });

  // =========================================================================
  // 5. Audit Identity Binding & Spoofing Immunity (Phase 1.4)
  // =========================================================================
  describe('5. Audit Identity Binding & Spoofing Immunity (Phase 1.4)', () => {
    it('ignores client-supplied reviewerId and derives audit identity strictly from req.user', async () => {
      const res = await invokeApp(
        'POST',
        `/api/refunds/${caseId}/decision`,
        {
          decision: 'APPROVE',
          reviewerComment: 'Legitimate decision verified.',
          reviewerId: 'Spoofed Malicious Auditor (Attempted Impersonation)', // Spoofed identity
        },
        headersReviewer
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify audit log entry derives identity from Julian Hayes (req.user.name), NOT the spoofed string
      const logEntries = res.body.refund.auditLog || [];
      assert.ok(logEntries.length > 0);
      const latest = logEntries[0];
      assert.match(latest.description, /Julian Hayes/);
      assert.doesNotMatch(latest.description, /Spoofed Malicious Auditor/);
    });

    it('ignores client-supplied reviewerId in draft saves and records verified reviewer name', async () => {
      const res = await invokeApp(
        'POST',
        `/api/refunds/${caseId}/draft`,
        {
          reviewerNote: 'Saving draft investigation note.',
          reviewerId: 'Spoofed Draft Impersonator',
        },
        headersReviewer
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const logEntries = res.body.refund.auditLog || [];
      const draftLog = logEntries.find((l) => l.title === 'Reviewer Draft Note Saved');
      assert.ok(draftLog);
      assert.match(draftLog.description, /Julian Hayes/);
      assert.doesNotMatch(draftLog.description, /Spoofed Draft Impersonator/);
    });
  });

  // =========================================================================
  // 6. Refund Decision Endpoints Authorization
  // =========================================================================
  describe('6. Refund Decision & Draft Endpoints Authorization', () => {
    it('rejects anonymous callers on decision endpoint with 401', async () => {
      const res = await invokeApp('POST', `/api/refunds/${caseId}/decision`, {
        decision: 'APPROVE',
        note: 'Approved anonymously',
      });
      assert.equal(res.status, 401);
      assert.match(res.body.error, /Authentication required/);
    });

    it('rejects non-reviewer travelers on decision endpoint with 403', async () => {
      const res = await invokeApp(
        'POST',
        `/api/refunds/${caseId}/decision`,
        {
          decision: 'APPROVE',
          note: 'Approved by traveler',
        },
        headersTravelerA
      );
      assert.equal(res.status, 403);
      assert.match(res.body.error, /Access denied\. Requires 'reviewer' role\./);
    });

    it('rejects non-reviewer travelers on alternative decision route with 403', async () => {
      const res = await invokeApp(
        'POST',
        '/api/refunds/decision',
        {
          refundId: caseId,
          decision: 'APPROVE',
        },
        headersTravelerB
      );
      assert.equal(res.status, 403);
      assert.match(res.body.error, /Access denied\. Requires 'reviewer' role\./);
    });

    it('rejects anonymous callers on draft note endpoint with 401', async () => {
      const res = await invokeApp('POST', `/api/refunds/${caseId}/draft`, {
        reviewerNote: 'Draft note without token',
      });
      assert.equal(res.status, 401);
    });

    it('rejects non-reviewer travelers on draft note endpoint with 403', async () => {
      const res = await invokeApp(
        'POST',
        `/api/refunds/${caseId}/draft`,
        {
          reviewerNote: 'Draft note by traveler',
        },
        headersTravelerA
      );
      assert.equal(res.status, 403);
      assert.match(res.body.error, /Access denied\. Requires 'reviewer' role\./);
    });

    it('allows authorized reviewer to save draft notes (200)', async () => {
      const res = await invokeApp(
        'POST',
        `/api/refunds/${caseId}/draft`,
        {
          reviewerNote: 'Carrier flight disruption log verified in GDS.',
          draftDecision: 'eligible',
        },
        headersReviewer
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.refund.reviewerDraftNote, 'Carrier flight disruption log verified in GDS.');
    });

    it('allows authorized reviewer to finalize decisions (200)', async () => {
      const res = await invokeApp(
        'POST',
        `/api/refunds/${caseId}/decision`,
        {
          decision: 'APPROVE',
          reviewerComment: 'Fully verified claim eligible for compensation.',
        },
        headersReviewer
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.refund.decisionStatus, 'Approved');
    });
  });

  // =========================================================================
  // 7. System-wide Refund Queue Authorization
  // =========================================================================
  describe('7. System-Wide Refund Queue Listing Authorization', () => {
    it('rejects anonymous callers listing refund queue with 401', async () => {
      const res = await invokeApp('GET', '/api/refunds');
      assert.equal(res.status, 401);
      assert.match(res.body.error, /Authentication required/);
    });

    it('rejects traveler listing refund queue with 403', async () => {
      const res = await invokeApp('GET', '/api/refunds', null, headersTravelerA);
      assert.equal(res.status, 403);
      assert.match(res.body.error, /Access denied\. Requires 'reviewer' role\./);
    });

    it('allows authorized reviewer to list system refund queue (200)', async () => {
      const res = await invokeApp('GET', '/api/refunds', null, headersReviewer);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.refunds));
      assert.ok(res.body.refunds.length >= 1);
    });
  });

  // =========================================================================
  // 8. Case Detail Ownership Authorization
  // =========================================================================
  describe('8. Case Detail Ownership Authorization (GET /api/refunds/:id)', () => {
    it('rejects anonymous callers with 401', async () => {
      const res = await invokeApp('GET', `/api/refunds/${caseId}`);
      assert.equal(res.status, 401);
    });

    it('rejects non-owner traveler attempting to view another traveler case with 403', async () => {
      const res = await invokeApp('GET', `/api/refunds/${caseId}`, null, headersTravelerB);
      assert.equal(res.status, 403);
      assert.match(res.body.error, /Access denied: You do not have permission to view this refund case\./);
    });

    it('allows legitimate traveler owner to view their own case (200)', async () => {
      const res = await invokeApp('GET', `/api/refunds/${caseId}`, null, headersTravelerA);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.refund.id, caseId);
    });

    it('allows authorized reviewer to view any case detail (200)', async () => {
      const res = await invokeApp('GET', `/api/refunds/${caseId}`, null, headersReviewer);
      assert.equal(res.status, 200);
      assert.equal(res.body.refund.id, caseId);
    });
  });

  // =========================================================================
  // 9. Evidence & Summary Dossier Authorization (Phase 1.3 - Query Token Removed)
  // =========================================================================
  describe('9. Evidence & Summary Dossier Authorization (/api/cases/:id/...)', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const validPdfBase64 = validPdfBuffer.toString('base64');
    let uploadedFileId = null;

    it('rejects anonymous callers on evidence upload with 401', async () => {
      const res = await invokeApp('POST', `/api/cases/${caseId}/evidence`, {
        filename: 'flight_ticket.pdf',
        fileBase64: validPdfBase64,
      });
      assert.equal(res.status, 401);
    });

    it('rejects non-owner traveler from uploading evidence to another case with 403', async () => {
      const res = await invokeApp(
        'POST',
        `/api/cases/${caseId}/evidence`,
        {
          filename: 'flight_ticket.pdf',
          fileBase64: validPdfBase64,
        },
        headersTravelerB
      );
      assert.equal(res.status, 403);
      assert.match(res.body.error, /Access denied: You do not have permission to access evidence or records for this case\./);
    });

    it('allows legitimate owner to upload evidence to their case (201)', async () => {
      const res = await invokeApp(
        'POST',
        `/api/cases/${caseId}/evidence`,
        {
          filename: 'boarding_pass.pdf',
          fileBase64: validPdfBase64,
          declaredType: 'application/pdf',
        },
        headersTravelerA
      );
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.evidence.fileId);
      uploadedFileId = res.body.evidence.fileId;
    });

    it('rejects non-owner traveler from listing evidence with 403', async () => {
      const res = await invokeApp('GET', `/api/cases/${caseId}/evidence`, null, headersTravelerB);
      assert.equal(res.status, 403);
    });

    it('allows legitimate owner to list evidence for their case (200)', async () => {
      const res = await invokeApp('GET', `/api/cases/${caseId}/evidence`, null, headersTravelerA);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.evidence));
      assert.ok(res.body.evidence.length >= 1);
    });

    it('rejects non-owner traveler from downloading private evidence file with 403', async () => {
      assert.ok(uploadedFileId);
      const res = await invokeApp(
        'GET',
        `/api/cases/${caseId}/evidence/${uploadedFileId}`,
        null,
        headersTravelerB
      );
      assert.equal(res.status, 403);
    });

    it('allows legitimate owner to download their private evidence file with Bearer header (200)', async () => {
      assert.ok(uploadedFileId);
      const res = await invokeApp(
        'GET',
        `/api/cases/${caseId}/evidence/${uploadedFileId}`,
        null,
        headersTravelerA
      );
      assert.equal(res.status, 200);
      assert.equal(res.headers['content-type'], 'application/pdf');
    });

    it('rejects evidence download via query-string token with 401 (Phase 1.3 - query token eliminated)', async () => {
      assert.ok(uploadedFileId);
      const res = await invokeApp(
        'GET',
        `/api/cases/${caseId}/evidence/${uploadedFileId}?token=${encodeURIComponent(tokenTravelerA)}`
      );
      assert.equal(res.status, 401);
      assert.match(res.body.error, /Authentication required\. No token provided\./);
    });

    it('allows reviewer to download any private evidence file (200)', async () => {
      assert.ok(uploadedFileId);
      const res = await invokeApp(
        'GET',
        `/api/cases/${caseId}/evidence/${uploadedFileId}`,
        null,
        headersReviewer
      );
      assert.equal(res.status, 200);
      assert.equal(res.headers['content-type'], 'application/pdf');
    });

    it('rejects anonymous download of summary dossier with 401', async () => {
      const res = await invokeApp('GET', `/api/cases/${caseId}/summary`);
      assert.equal(res.status, 401);
    });

    it('rejects non-owner traveler download of summary dossier with 403', async () => {
      const res = await invokeApp('GET', `/api/cases/${caseId}/summary`, null, headersTravelerB);
      assert.equal(res.status, 403);
    });

    it('allows legitimate owner to download summary dossier (200)', async () => {
      const res = await invokeApp('GET', `/api/cases/${caseId}/summary`, null, headersTravelerA);
      assert.equal(res.status, 200);
      assert.match(res.body.toString(), /AGENT TRAVEL — REFUND DISPUTE & ARBITRATION SUMMARY DOSSIER/);
    });

    it('allows reviewer to download summary dossier for any case (200)', async () => {
      const res = await invokeApp('GET', `/api/cases/${caseId}/summary`, null, headersReviewer);
      assert.equal(res.status, 200);
      assert.match(res.body.toString(), /Case Identifier: #RF-SEC-CASE-101/);
    });
  });

  // =========================================================================
  // 10. Booking Payment Status Authorization (Additional Check)
  // =========================================================================
  describe('10. Booking Payment Status Endpoint Authorization', () => {
    it('rejects anonymous callers on payment status lookup with 401', async () => {
      const res = await invokeApp('GET', `/api/bookings/${bookingId}/payment-status`);
      assert.equal(res.status, 401);
      assert.match(res.body.error, /Authentication required/);
    });

    it('rejects non-owner travelers on payment status lookup with 403', async () => {
      const res = await invokeApp(
        'GET',
        `/api/bookings/${bookingId}/payment-status`,
        null,
        headersTravelerB
      );
      assert.equal(res.status, 403);
      assert.match(res.body.error, /Access denied: You do not have permission to view payment status for this booking\./);
    });

    it('allows legitimate owner traveler to query their payment status (200)', async () => {
      const res = await invokeApp(
        'GET',
        `/api/bookings/${bookingId}/payment-status`,
        null,
        headersTravelerA
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.bookingId, bookingId);
      assert.equal(res.body.paymentStatus, 'PAID');
      assert.equal(res.body.amount, 4500);
    });

    it('allows reviewer to query payment status for any booking (200)', async () => {
      const res = await invokeApp(
        'GET',
        `/api/bookings/${bookingId}/payment-status`,
        null,
        headersReviewer
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.bookingId, bookingId);
      assert.equal(res.body.paymentStatus, 'PAID');
    });

    it('allows admin to query payment status for any booking (200)', async () => {
      const res = await invokeApp(
        'GET',
        `/api/bookings/${bookingId}/payment-status`,
        null,
        headersAdmin
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.bookingId, bookingId);
      assert.equal(res.body.paymentStatus, 'PAID');
    });
  });

  // =========================================================================
  // 11. No-Demo-Account Policy & Administrative Provisioning Enforcement
  // =========================================================================
  describe('11. No-Demo-Account Policy & Administrative Provisioning Enforcement', () => {
    it('rejects public login attempts using unprovisioned demo reviewer credentials (401)', async () => {
      const demoLogins = [
        { email: 'reviewer@agenttravel.com', password: 'Reviewer@123' },
        { email: 'julian.hayes@agenttravel.com', password: 'Auditor@123' },
        { email: 'aarav.sharma@example.com', password: 'Password@123' },
      ];

      for (const creds of demoLogins) {
        const res = await invokeApp('POST', '/api/auth/login', creds);
        assert.equal(res.status, 401);
        assert.match(res.body.error, /Invalid email or password/);
      }
    });

    it('confirms that no public endpoint exists for role promotion (404)', async () => {
      const candidateEndpoints = [
        ['POST', '/api/auth/promote'],
        ['POST', '/api/auth/make-reviewer'],
        ['POST', '/api/users/role'],
        ['PUT', '/api/auth/role'],
        ['PATCH', '/api/auth/role'],
      ];

      for (const [method, route] of candidateEndpoints) {
        const res = await invokeApp(method, route, { role: 'reviewer' }, headersTravelerA);
        assert.equal(res.status, 404);
      }
    });

    it('allows legitimate administrative reviewer provisioning via script/tooling and subsequent login', async () => {
      const legitReviewerEmail = `staff.auditor.${Date.now()}@agenttravel.com`;
      const legitReviewerPass = 'StrongAuditPass2026!';

      // Provision via internal/administrative method (simulating server/scripts/provisionUser.js)
      const provResult = await authService.provisionUser({
        name: 'Staff Auditor Mira',
        email: legitReviewerEmail,
        password: legitReviewerPass,
        role: 'reviewer',
      });
      assert.equal(provResult.success, true);
      assert.equal(provResult.user.role, 'reviewer');

      // Now authenticate via public login endpoint
      const loginRes = await invokeApp('POST', '/api/auth/login', {
        email: legitReviewerEmail,
        password: legitReviewerPass,
      });
      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.body.success, true);
      assert.equal(loginRes.body.user.role, 'reviewer');
      assert.ok(loginRes.body.token);

      // Verify the provisioned reviewer can access the global refund queue
      const queueRes = await invokeApp('GET', '/api/refunds', null, {
        authorization: `Bearer ${loginRes.body.token}`,
      });
      assert.equal(queueRes.status, 200);
      assert.ok(Array.isArray(queueRes.body.refunds));
    });
  });
});
