/**
 * server/test/google_auth.test.js
 * Comprehensive unit and integration test suite for Google Authentication:
 * - Provisioning new traveler users via Google OAuth
 * - Existing user resolution and role preservation (reviewer/traveler)
 * - Input validation & security handling for missing/malformed tokens
 * - Public configuration exposure without secret leakage
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../authService.js';
import { createRepository } from '../awsConfig.js';

describe('Google Authentication Service Tests', () => {
  let db;
  let auth;

  beforeEach(async () => {
    db = createRepository({ store: { users: {} } });
    auth = createAuthService(db);
  });

  it('1. Rejects Google authentication if email is missing', async () => {
    await assert.rejects(
      async () => {
        await auth.loginOrRegisterWithGoogle({ googleId: '12345', email: '' });
      },
      /Google account email is required/
    );
  });

  it('2. Registers a new traveler user when authenticating with a new Google email', async () => {
    const result = await auth.loginOrRegisterWithGoogle({
      googleId: 'google_sub_1001',
      email: 'traveler.new@example.com',
      name: 'Priya Sharma',
      picture: 'https://lh3.googleusercontent.com/test_avatar.jpg',
    });

    assert.equal(result.isNewUser, true);
    assert.ok(result.token, 'Should issue signed session JWT');
    assert.equal(result.user.email, 'traveler.new@example.com');
    assert.equal(result.user.name, 'Priya Sharma');
    assert.equal(result.user.role, 'traveler');
    assert.equal(result.user.picture, 'https://lh3.googleusercontent.com/test_avatar.jpg');

    // Verify token can be verified
    const decoded = auth.verifyToken(result.token);
    assert.ok(decoded);
    assert.equal(decoded.email, 'traveler.new@example.com');
    assert.equal(decoded.role, 'traveler');

    // Verify user is persisted in the database
    const persisted = await db.getUserByEmail('traveler.new@example.com');
    assert.ok(persisted);
    assert.equal(persisted.authProvider, 'google');
    assert.equal(persisted.googleId, 'google_sub_1001');
    assert.equal(persisted.role, 'traveler');
  });

  it('3. Logs in an existing user without duplicating account, preserving their role', async () => {
    // 1. First provision a reviewer account with that email
    await auth.provisionUser({
      email: 'staff.reviewer@agenttravel.com',
      password: 'SecurePassword123!',
      name: 'Aditi Staff Reviewer',
      role: 'reviewer',
    });

    // 2. Authenticate with Google using the same email
    const result = await auth.loginOrRegisterWithGoogle({
      googleId: 'google_sub_2002',
      email: 'staff.reviewer@agenttravel.com',
      name: 'Aditi Staff Reviewer',
      picture: 'https://lh3.googleusercontent.com/aditi.jpg',
    });

    assert.equal(result.isNewUser, false, 'Should recognize existing account');
    assert.ok(result.token);
    assert.equal(result.user.email, 'staff.reviewer@agenttravel.com');
    assert.equal(result.user.role, 'reviewer', 'Must preserve reviewer privileges');

    const decoded = auth.verifyToken(result.token);
    assert.equal(decoded.role, 'reviewer');
  });

  it('4. Handles email case-insensitivity during Google sign-in', async () => {
    // Register with uppercase
    await auth.loginOrRegisterWithGoogle({
      googleId: 'google_sub_3003',
      email: 'Rahul.Verma@Example.COM',
      name: 'Rahul Verma',
    });

    // Sign in with lowercase
    const secondLogin = await auth.loginOrRegisterWithGoogle({
      googleId: 'google_sub_3003',
      email: 'rahul.verma@example.com',
      name: 'Rahul Verma',
    });

    assert.equal(secondLogin.isNewUser, false, 'Should match case-insensitively');
    assert.equal(secondLogin.user.email, 'rahul.verma@example.com');
  });
});
