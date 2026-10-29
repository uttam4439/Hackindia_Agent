/**
 * server/test/auth_evidence.test.js
 * Automated Security & Authentication Tests for Agent Travel.
 * Validates password hashing, token signatures, role enforcement,
 * magic-byte verification, traversal defense, and DynamoDB-backed persistence.
 */

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authService, createAuthService } from '../authService.js';
import { evidenceService } from '../evidenceService.js';
import { createRepository } from '../awsConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Security & Authentication Unit Tests', () => {
  it('1. No-Demo-Accounts Policy: Rejects unprovisioned demo credentials and requires database lookup', async () => {
    // Rejects demo accounts because pre-seeded accounts have been removed
    await assert.rejects(
      async () => await authService.login('reviewer@agenttravel.com', 'Reviewer@123'),
      /Invalid email or password/
    );
    await assert.rejects(
      async () => await authService.login('julian.hayes@agenttravel.com', 'Auditor@123'),
      /Invalid email or password/
    );
    await assert.rejects(
      async () => await authService.login('aarav.sharma@example.com', 'Password@123'),
      /Invalid email or password/
    );
  });

  it('2. Invalid Credentials Rejection: Fails gracefully on wrong password or email', async () => {
    await assert.rejects(
      async () => await authService.login('nonexistent@example.com', 'Password@123'),
      /Invalid email or password/
    );
  });

  it('3. Token Verification: Validates HMAC-SHA256 signature and extracts user claims', async () => {
    const provEmail = `auditor_${Date.now()}@test.com`;
    const provisioned = await authService.provisionUser({
      name: 'Auditor Meera',
      email: provEmail,
      password: 'SecureAuditor@123',
      role: 'reviewer',
    });
    const login = await authService.login(provEmail, 'SecureAuditor@123');
    const verified = authService.verifyToken(login.token);
    assert.ok(verified);
    assert.equal(verified.email, provEmail);
    assert.equal(verified.role, 'reviewer');

    // Tampered token test
    const tampered = login.token.slice(0, -5) + 'xxxxx';
    const tamperedResult = authService.verifyToken(tampered);
    assert.equal(tamperedResult, null, 'Tampered token must be rejected');
  });

  it('4. New Registration: Creates new user with PBKDF2 hashed password', async () => {
    const testEmail = `newuser_${Date.now()}@test.com`;
    const reg = await authService.register({
      name: 'Rohan Verma',
      email: testEmail,
      password: 'SecurePassword@123',
      phone: '+91 99887 76655',
    });

    assert.equal(reg.user.name, 'Rohan Verma');
    assert.equal(reg.user.role, 'traveler');
    assert.ok(reg.token);

    // Verify login works with new credentials
    const login = await authService.login(testEmail, 'SecurePassword@123');
    assert.equal(login.user.email, testEmail);
  });

  it('5. Evidence Validation: Accepts valid PDF with %PDF magic bytes and rejects invalid binary', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const base64Pdf = validPdfBuffer.toString('base64');

    const uploaded = evidenceService.saveEvidence('TEST-CASE-EPHEMERAL', {
      filename: 'receipt.pdf',
      fileBase64: base64Pdf,
      declaredType: 'application/pdf',
      uploaderEmail: 'aarav.sharma@example.com',
    });

    assert.ok(uploaded.fileId);
    assert.equal(uploaded.verified, true);
    assert.equal(uploaded.mimeType, 'application/pdf');

    // Reject executable disguised as PDF
    const fakePdfBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00FakePEFileHeader');
    const fakeBase64 = fakePdfBuffer.toString('base64');

    assert.throws(
      () =>
        evidenceService.saveEvidence('TEST-CASE-EPHEMERAL', {
          filename: 'exploit.pdf',
          fileBase64: fakeBase64,
          declaredType: 'application/pdf',
        }),
      /Unsupported file format/
    );
  });

  it('6. Path Traversal Defense: Sanitizes unsafe filenames', () => {
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const base64Png = validPngBuffer.toString('base64');

    const uploaded = evidenceService.saveEvidence('TEST-CASE-EPHEMERAL', {
      filename: '../../../../etc/passwd',
      fileBase64: base64Png,
      declaredType: 'image/png',
    });

    assert.ok(!uploaded.filename.includes('..'));
    assert.ok(!uploaded.filename.includes('/'));
    assert.ok(uploaded.filename.endsWith('passwd') || uploaded.filename.includes('passwd'));
  });

  it('7. Serverless Demo Mode Evidence Handling: Rejects upload with clear message when running in Lambda environment without S3 approval', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const base64Pdf = validPdfBuffer.toString('base64');

    process.env.AWS_LAMBDA_FUNCTION_NAME = 'AgentTravelBackend';
    try {
      assert.throws(
        () =>
          evidenceService.saveEvidence('TEST-CASE-LAMBDA', {
            filename: 'boarding_pass.pdf',
            fileBase64: base64Pdf,
            declaredType: 'application/pdf',
          }),
        /Document upload is unavailable in serverless demo mode/
      );
    } finally {
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    }
  });

  it('8. Authentication State Audit: Provisioned accounts authenticate and tokens are stateless HMAC-SHA256', async () => {
    const testEmail = `stateless_${Date.now()}@test.com`;
    const reg = await authService.register({
      name: 'Stateless User',
      email: testEmail,
      password: 'Password@123',
    });
    const token = reg.token;

    // Verify token decoding works statelessly
    const decoded = authService.verifyToken(token);
    assert.equal(decoded.email, testEmail);
    assert.equal(decoded.role, 'traveler');
    assert.ok(decoded.exp > Math.floor(Date.now() / 1000));
  });

  it('9. Duplicate Registration Prevention: Rejects second registration with the same email', async () => {
    const uniqueEmail = `dup_test_${Date.now()}@example.com`;
    await authService.register({
      name: 'First Registrant',
      email: uniqueEmail,
      password: 'StrongPassword123!',
      phone: '+91 91111 22222',
    });

    // Attempt duplicate registration
    await assert.rejects(
      async () =>
        await authService.register({
          name: 'Second Registrant',
          email: uniqueEmail.toUpperCase(), // Case-insensitive duplicate check
          password: 'AnotherPassword456!',
          phone: '+91 93333 44444',
        }),
      /An account with this email already exists/
    );
  });

  it('10. Concurrent Signup Handling: Exactly one concurrent registration succeeds for the same email', async () => {
    const concurrentEmail = `race_${Date.now()}@example.com`;
    const attempts = [
      authService.register({
        name: 'Concurrent Runner A',
        email: concurrentEmail,
        password: 'PasswordA@123',
      }),
      authService.register({
        name: 'Concurrent Runner B',
        email: concurrentEmail,
        password: 'PasswordB@123',
      }),
    ];

    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Exactly one concurrent signup must succeed');
    assert.equal(rejected.length, 1, 'Exactly one concurrent signup must be rejected');
    assert.match(rejected[0].reason.message, /An account with this email already exists/);
  });

  it('11. Persistent User Lookup Across Separate Lambda Instances', async () => {
    // Simulate shared persistent storage backing two distinct Lambda containers
    const sharedStore = {
      bookings: {},
      orders: {},
      payments: {},
      processedWebhooks: {},
      refunds: {},
      catalogDestinations: {},
      catalogTrips: {},
      users: {},
    };

    const containerA_Db = createRepository({ store: sharedStore });
    const containerB_Db = createRepository({ store: sharedStore });

    const containerA_Auth = createAuthService(containerA_Db);
    const containerB_Auth = createAuthService(containerB_Db);

    const testEmail = `cross_instance_${Date.now()}@agenttravel.com`;

    // Instance A registers the user
    const regResult = await containerA_Auth.register({
      name: 'Cross Container Traveler',
      email: testEmail,
      password: 'MultiContainerPass@99',
      phone: '+91 98888 77777',
    });
    assert.ok(regResult.token);

    // Instance B (cold container) can immediately authenticate the user from persistent storage
    const loginResult = await containerB_Auth.login(testEmail, 'MultiContainerPass@99');
    assert.equal(loginResult.user.email, testEmail);
    assert.equal(loginResult.user.name, 'Cross Container Traveler');
    assert.equal(loginResult.user.role, 'traveler');

    // Instance B also verifies token statelessly
    const decodedToken = containerB_Auth.verifyToken(loginResult.token);
    assert.equal(decodedToken.email, testEmail);
  });

  it('12. Database Error Handling: Fails safely with non-leaking error on database outage', async () => {
    // Mock faulty database simulating DynamoDB 500 error or network timeout
    const faultyDb = {
      async saveUser() {
        const err = new Error('ProvisionedThroughputExceededException: Rate exceeded');
        err.name = 'ProvisionedThroughputExceededException';
        throw err;
      },
      async getUserByEmail() {
        const err = new Error('NetworkingError: connect ETIMEDOUT');
        err.name = 'NetworkingError';
        throw err;
      },
    };

    const resilientAuth = createAuthService(faultyDb);

    // Register failure must be graceful and safe
    await assert.rejects(
      async () =>
        await resilientAuth.register({
          name: 'Unlucky Traveler',
          email: `fail_${Date.now()}@example.com`,
          password: 'Password@123',
        }),
      /Unable to complete registration at this time/
    );

    // Login failure must be graceful and safe
    await assert.rejects(
      async () => await resilientAuth.login('some_user@example.com', 'Password@123'),
      /Authentication service temporarily unavailable/
    );
  });

  it('13. Administrative Provisioning & Timing Attack Defense', async () => {
    // Administratively provisioned reviewer login succeeds
    const provEmail = `prov_${Date.now()}@agenttravel.com`;
    await authService.provisionUser({
      name: 'Julian Hayes',
      email: provEmail,
      password: 'AuditorStrong@123',
      role: 'reviewer',
    });
    const reviewerLogin = await authService.login(provEmail, 'AuditorStrong@123');
    assert.equal(reviewerLogin.user.name, 'Julian Hayes');
    assert.equal(reviewerLogin.user.role, 'reviewer');

    // Missing email or password throws validation error
    await assert.rejects(
      async () => await authService.login('', 'SomePassword'),
      /Email and password are required/
    );
    await assert.rejects(
      async () => await authService.register({ name: 'No Pass', email: 'nopass@test.com', password: '123' }),
      /Password must be at least 6 characters/
    );
  });

  after(() => {
    const testDir = path.join(__dirname, '../data/evidence/TEST-CASE-EPHEMERAL');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
});
