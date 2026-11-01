/**
 * server/authService.js
 * Cryptographic Authentication & Session Management for Agent Travel.
 * Provides secure password hashing (PBKDF2-SHA512), role-based session tokens (HMAC-SHA256),
 * preloaded credentials for travelers and reviewers, and persistent storage via DynamoDB.
 */

import crypto from 'crypto';
import { db as defaultDb } from './awsConfig.js';

// Explicit test secret for unit tests & local dev when SESSION_SECRET is not set
export const TEST_JWT_SECRET = 'agent_travel_test_secret_for_local_development_and_unit_tests_32chars';

/**
 * Resolves the JWT HMAC signing secret.
 * Enforces fail-closed security in production if SESSION_SECRET is missing or weak (< 32 chars).
 */
export function resolveJwtSecret(providedSecret = process.env.SESSION_SECRET) {
  const secret = (providedSecret || '').trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!secret) {
      throw new Error(
        '[SECURITY FATAL] SESSION_SECRET environment variable is missing in production. Server startup aborted.'
      );
    }
    if (secret.length < 32) {
      throw new Error(
        `[SECURITY FATAL] SESSION_SECRET is too weak (${secret.length} chars). Minimum 32 characters required in production.`
      );
    }
    return secret;
  }

  // Non-production (local development and test execution)
  if (secret) {
    return secret;
  }
  return TEST_JWT_SECRET;
}

// Secret for HMAC-SHA256 token signing
const JWT_SECRET = resolveJwtSecret();

// Helper: Hash password with salt
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// Helper: Verify password
export function verifyPassword(password, hash, salt) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

/**
 * Creates an AuthService instance bound to a persistence repository.
 * Allows dependency injection of isolated database instances for testing.
 * Enforces no-demo-account policy: All authentications query persistent storage.
 */
export function createAuthService(database = defaultDb, options = {}) {
  const secret = options.jwtSecret || (options.sessionSecret ? resolveJwtSecret(options.sessionSecret) : resolveJwtSecret());

  return {
    // Generate signed HMAC-SHA256 session token
    generateToken(user) {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: user.id || user.userId,
          email: user.email,
          name: user.name,
          role: user.role,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
        })
      ).toString('base64url');

      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

      return `${header}.${payload}.${signature}`;
    },

    // Verify signed token (Stateless, constant-time)
    verifyToken(token) {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, payload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

      try {
        const isValid = crypto.timingSafeEqual(
          Buffer.from(signature, 'utf-8'),
          Buffer.from(expectedSignature, 'utf-8')
        );
        if (!isValid) return null;

        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
        if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
          return null; // Expired
        }
        return data;
      } catch {
        return null;
      }
    },

    // Login handler (Enforces no-demo-accounts policy: strictly verifies against persistent storage)
    async login(email, password) {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Query persistent database
      let user = null;
      if (database && typeof database.getUserByEmail === 'function') {
        try {
          user = await database.getUserByEmail(normalizedEmail);
        } catch (dbErr) {
          console.warn(`[AUTH] Database lookup error for ${normalizedEmail}:`, dbErr.message);
          throw new Error('Authentication service temporarily unavailable');
        }
      }

      // If user not found, perform dummy PBKDF2 hash to defend against timing attacks
      if (!user) {
        hashPassword(password);
        throw new Error('Invalid email or password');
      }

      const isMatch = verifyPassword(password, user.passwordHash, user.salt);
      if (!isMatch) {
        throw new Error('Invalid email or password');
      }

      const token = this.generateToken(user);
      return {
        token,
        user: {
          id: user.id || user.userId,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
        },
      };
    },

    // Registration handler with conditional write enforcement (Strictly provisions 'traveler' accounts)
    async register({ email, password, name, phone }) {
      if (!email || !password || !name) {
        throw new Error('Name, email, and password are required');
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { hash, salt } = hashPassword(password);
      const userId = `usr_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
      const newUser = {
        id: userId,
        userId,
        email: normalizedEmail,
        name: name.trim(),
        phone: phone?.trim() || '',
        role: 'traveler', // Defense-in-depth: Self-registration strictly provisions traveler accounts
        passwordHash: hash,
        salt,
        createdAt: new Date().toISOString(),
      };

      // Persist to database with atomic conditional write
      if (database && typeof database.saveUser === 'function') {
        try {
          await database.saveUser(newUser);
        } catch (err) {
          if (
            err.name === 'ConditionalCheckFailedException' ||
            err.code === 'USER_EXISTS' ||
            err.name === 'DuplicateUserException'
          ) {
            throw new Error('An account with this email already exists');
          }
          console.warn('[AUTH] Database error during registration:', err.message);
          throw new Error('Unable to complete registration at this time');
        }
      }

      const token = this.generateToken(newUser);
      return {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          phone: newUser.phone,
        },
      };
    },

    /**
     * Administrative Reviewer/Staff Provisioning Helper.
     * Strictly callable by project owner CLI or administrative tooling (no public HTTP route).
     */
    async provisionUser({ email, password, name, phone, role = 'reviewer' }) {
      if (!email || !password || !name) {
        throw new Error('Name, email, and password are required for provisioning');
      }

      const normalizedEmail = email.toLowerCase().trim();
      const validRoles = ['reviewer', 'admin', 'traveler'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role '${role}'. Must be one of: ${validRoles.join(', ')}`);
      }

      if (password.length < 8) {
        throw new Error('Provisioned password must be at least 8 characters');
      }

      const { hash, salt } = hashPassword(password);
      const userId = `usr_${role}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
      const newUser = {
        id: userId,
        userId,
        email: normalizedEmail,
        name: name.trim(),
        phone: phone?.trim() || '',
        role,
        passwordHash: hash,
        salt,
        createdAt: new Date().toISOString(),
        provisionedBy: 'Administrator',
      };

      if (database && typeof database.saveUser === 'function') {
        try {
          await database.saveUser(newUser);
        } catch (err) {
          if (
            err.name === 'ConditionalCheckFailedException' ||
            err.code === 'USER_EXISTS' ||
            err.name === 'DuplicateUserException'
          ) {
            throw new Error('An account with this email already exists in persistent storage');
          }
          throw err;
        }
      }

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      };
    },

    async getUserByEmail(email) {
      if (!email) return null;
      const normalizedEmail = email.toLowerCase().trim();
      if (database && typeof database.getUserByEmail === 'function') {
        const user = await database.getUserByEmail(normalizedEmail);
        if (!user) return null;
        return {
          id: user.id || user.userId,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
        };
      }
      return null;
    },
  };
}

export const authService = createAuthService(defaultDb);
export default authService;
