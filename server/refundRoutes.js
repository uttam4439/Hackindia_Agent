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
 * to isolated RefundService instances without modifying shared global routes.
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

export function createRefundRouter(service = defaultRefundService) {
  const router = Router();

  const submit = service?.submitRefund ? service.submitRefund.bind(service) : defaultSubmitRefund;
  const getById = service?.getRefundById ? service.getRefundById.bind(service) : defaultGetRefundById;
  const processDecision = service?.processReviewerDecision
    ? service.processReviewerDecision.bind(service)
    : defaultProcessReviewerDecision;
  const list = service?.listRefunds ? service.listRefunds.bind(service) : defaultListRefunds;
  const saveDraft = service?.saveDraftNote ? service.saveDraftNote.bind(service) : defaultSaveDraftNote;

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
   * Reviewer decision endpoint (coordinated with Person 4).
   * Records reviewer authorization, escalations, or rejections.
   */
  router.post('/:id/decision', async (req, res) => {
    try {
      const refundId = req.params.id;
      const result = await processDecision(refundId, req.body);
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
   * Alternative convenience route accepting refundId in body (for Person 4 integration).
   */
  router.post('/decision', async (req, res) => {
    try {
      const refundId = req.body.refundId || req.body.id || req.body.caseId;
      if (!refundId) {
        return res.status(400).json({
          success: false,
          error: 'refundId (or caseId) is required in request body',
        });
      }
      const result = await processDecision(refundId, req.body);
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
   * Persists a reviewer draft note without changing the case decision status.
   * Allows auditors to save work-in-progress notes that survive page refreshes.
   */
  router.post('/:id/draft', async (req, res) => {
    try {
      const refundId = req.params.id;
      const result = await saveDraft(refundId, req.body);
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
   */
  router.get('/:id', async (req, res) => {
    try {
      const result = await getById(req.params.id);
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
   */
  router.get('/', async (req, res) => {
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
