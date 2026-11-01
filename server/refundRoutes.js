/**
 * server/refundRoutes.js
 * Express API Router for Agent Travel Refunds.
 * Routes:
 * - POST /api/refunds/submit
 * - GET  /api/refunds/:id
 * - POST /api/refunds/:id/decision  (and POST /api/refunds/decision)
 * - POST /api/refunds/:id/draft
 * - GET  /api/refunds
 *
 * Supports router factory (createRefundRouter) to allow tests to bind directly
 * to isolated RefundService and AuthService instances without modifying shared global routes.
 */

import { Router } from 'express';
import {
  defaultRefundService,
  submitRefund as defaultSubmitRefund,
  getRefundById as defaultGetRefundById,
  processReviewerDecision as defaultProcessReviewerDecision,
  listRefunds as defaultListRefunds,
  saveDraftNote as defaultSaveDraftNote,
} from './refundService.js';
import { authService as defaultAuthService } from './authService.js';
import { db as defaultDb } from './awsConfig.js';

export function createRefundRouter(service = defaultRefundService, options = {}) {
  const router = Router();
  const auth = options.authService || defaultAuthService;
  const db = options.db || defaultDb;

  const submit = service?.submitRefund ? service.submitRefund.bind(service) : defaultSubmitRefund;
  const getById = service?.getRefundById ? service.getRefundById.bind(service) : defaultGetRefundById;
  const processDecision = service?.processReviewerDecision
    ? service.processReviewerDecision.bind(service)
    : defaultProcessReviewerDecision;
  const list = service?.listRefunds ? service.listRefunds.bind(service) : defaultListRefunds;
  const saveDraft = service?.saveDraftNote ? service.saveDraftNote.bind(service) : defaultSaveDraftNote;

  // --- Authentication & Authorization Middleware ---
  const authenticate = options.authMiddleware || ((req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.slice(7)
      : req.headers['x-auth-token'];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required. No token provided.' });
    }

    const user = auth.verifyToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session token.' });
    }

    req.user = user;
    next();
  });

  const requireRole = options.roleMiddleware || ((role) => {
    return (req, res, next) => {
      if (!req.user || (req.user.role !== role && req.user.role !== 'admin')) {
        return res.status(403).json({ success: false, error: `Access denied. Requires '${role}' role.` });
      }
      next();
    };
  });

  /**
   * POST /api/refunds/submit
   * Submits a new refund claim for a verified paid booking.
   */
  router.post('/submit', async (req, res) => {
    try {
      const result = await submit(req.body);
      return res.status(result.statusCode).json(result);
    } catch (err) {
      console.error('[REFUND ERROR] Submit failed:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while processing refund submission',
      });
    }
  });

  /**
   * POST /api/refunds/:id/decision
   * Reviewer decision endpoint (Requires Reviewer role).
   * Records reviewer authorization, escalations, or rejections.
   */
  router.post('/:id/decision', authenticate, requireRole('reviewer'), async (req, res) => {
    try {
      const refundId = req.params.id;
      // Audit identity hardening: derive exclusively from verified req.user claims
      const reviewerId = req.user?.name || req.user?.email || 'Lead Auditor';
      const payload = {
        ...req.body,
        reviewerId,
      };
      const result = await processDecision(refundId, payload);
      return res.status(result.statusCode).json(result);
    } catch (err) {
      console.error('[REFUND ERROR] Reviewer decision failed:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while recording reviewer decision',
      });
    }
  });

  /**
   * POST /api/refunds/decision
   * Alternative convenience route accepting refundId in body (Requires Reviewer role).
   */
  router.post('/decision', authenticate, requireRole('reviewer'), async (req, res) => {
    try {
      const refundId = req.body.refundId || req.body.id || req.body.caseId;
      if (!refundId) {
        return res.status(400).json({
          success: false,
          error: 'refundId (or caseId) is required in request body',
        });
      }
      // Audit identity hardening: derive exclusively from verified req.user claims
      const reviewerId = req.user?.name || req.user?.email || 'Lead Auditor';
      const payload = {
        ...req.body,
        reviewerId,
      };
      const result = await processDecision(refundId, payload);
      return res.status(result.statusCode).json(result);
    } catch (err) {
      console.error('[REFUND ERROR] Reviewer decision failed:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while recording reviewer decision',
      });
    }
  });

  /**
   * POST /api/refunds/:id/draft
   * Persists a reviewer draft note without changing the case decision status (Requires Reviewer role).
   */
  router.post('/:id/draft', authenticate, requireRole('reviewer'), async (req, res) => {
    try {
      const refundId = req.params.id;
      // Audit identity hardening: derive exclusively from verified req.user claims
      const reviewerId = req.user?.name || req.user?.email || 'Lead Auditor';
      const payload = {
        ...req.body,
        reviewerId,
      };
      const result = await saveDraft(refundId, payload);
      return res.status(result.statusCode).json(result);
    } catch (err) {
      console.error('[REFUND ERROR] Draft save failed:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while saving reviewer draft',
      });
    }
  });

  /**
   * GET /api/refunds/:id
   * Fetches refund details and live status by refund ID, case reference, or booking ID.
   * Requires authentication:
   * - Reviewers & Admins can access any refund case.
   * - Travelers are strictly scoped to cases corresponding to their own bookings.
   */
  router.get('/:id', authenticate, async (req, res) => {
    try {
      const result = await getById(req.params.id);
      if (!result.success) {
        return res.status(result.statusCode).json(result);
      }

      // Reviewers and Admins can view all cases
      if (req.user?.role === 'reviewer' || req.user?.role === 'admin') {
        return res.status(result.statusCode).json(result);
      }

      // Traveler case ownership authorization
      const refund = result.refund;
      const userSub = (req.user?.sub || req.user?.id || '').toString();
      const userEmail = (req.user?.email || '').toString().toLowerCase();

      let isOwner =
        (refund.userId && userSub && refund.userId.toString() === userSub) ||
        (refund.customerEmail && userEmail && refund.customerEmail.toLowerCase() === userEmail) ||
        (refund.contactEmail && userEmail && refund.contactEmail.toLowerCase() === userEmail) ||
        (refund.traveler?.email && userEmail && refund.traveler.email.toLowerCase() === userEmail);

      if (!isOwner && refund.bookingId) {
        const booking = await db.getBooking(refund.bookingId);
        if (booking) {
          isOwner =
            (booking.userId && userSub && booking.userId.toString() === userSub) ||
            (booking.customerEmail && userEmail && booking.customerEmail.toLowerCase() === userEmail) ||
            (booking.traveler?.email && userEmail && booking.traveler.email.toLowerCase() === userEmail) ||
            (booking.customer?.email && userEmail && booking.customer.email.toLowerCase() === userEmail);
        }
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not have permission to view this refund case.',
        });
      }

      return res.status(result.statusCode).json(result);
    } catch (err) {
      console.error('[REFUND ERROR] Fetch failed:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving refund case',
      });
    }
  });

  /**
   * GET /api/refunds
   * Lists all refund cases for reviewer queue or analytics.
   * Protected: Restricted exclusively to Reviewers and Admins.
   */
  router.get('/', authenticate, requireRole('reviewer'), async (req, res) => {
    try {
      const filter = {
        status: req.query.status,
        bookingId: req.query.bookingId,
      };
      const pagination = {};
      if (req.query.limit) {
        pagination.limit = Number(req.query.limit);
      }
      if (req.query.cursor) {
        try {
          pagination.exclusiveStartKey = JSON.parse(decodeURIComponent(req.query.cursor));
        } catch {
          pagination.exclusiveStartKey = { id: req.query.cursor };
        }
      }
      const result = await list(filter, pagination);
      return res.status(result.statusCode).json(result);
    } catch (err) {
      console.error('[REFUND ERROR] List failed:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving refunds list',
      });
    }
  });

  return router;
}

export default createRefundRouter();
