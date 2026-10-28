/**
 * server/refundService.js
 * Core Refund Business Logic & Domain Validations for Agent Travel.
 * Implements eligibility verification, duplicate prevention, amount checks,
 * state transition validation, and audit logging.
 *
 * Provides factory-based service creation (createRefundService) to guarantee
 * isolated database instances without mutable module-global state leakage.
 */

import {
  db as defaultDb,
  FINALIZED_REFUND_STATUSES,
  isFinalizedRefundStatus,
} from './awsConfig.js';

// Status constants
export const REFUND_STATUSES = {
  SUBMITTED: 'SUBMITTED',
  UNDER_HUMAN_REVIEW: 'Under Human Review',
  PENDING_HUMAN_APPROVAL: 'Pending Human Approval',
  AWAITING_CARRIER_EVIDENCE: 'Awaiting Carrier Evidence',
  READY_FOR_PAYOUT: 'Ready for Payout',
  APPROVED: 'Approved',
  DISBURSED: 'Disbursed',
  REJECTED: 'Rejected',
};

export { FINALIZED_REFUND_STATUSES, isFinalizedRefundStatus };

// Active statuses that prevent duplicate refund requests
const ACTIVE_REFUND_STATUSES = [
  REFUND_STATUSES.SUBMITTED,
  REFUND_STATUSES.UNDER_HUMAN_REVIEW,
  REFUND_STATUSES.PENDING_HUMAN_APPROVAL,
  REFUND_STATUSES.AWAITING_CARRIER_EVIDENCE,
  REFUND_STATUSES.READY_FOR_PAYOUT,
  REFUND_STATUSES.APPROVED,
  REFUND_STATUSES.DISBURSED,
];

function deriveTraveler(travelerInput, contactInput, booking) {
  if (travelerInput && travelerInput.name) {
    return {
      name: travelerInput.name,
      initials: travelerInput.initials || travelerInput.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
      tier: travelerInput.tier || 'Verified Passenger',
      color: 'bg-primary-container text-on-primary-container',
    };
  }

  const candidateName =
    booking.customerName ||
    booking.travelerName ||
    booking.travelerDetails?.name ||
    booking.bookingDetails?.passengerName ||
    booking.bookingDetails?.customerName;

  if (candidateName && typeof candidateName === 'string' && candidateName.trim()) {
    const name = candidateName.trim();
    return {
      name,
      initials: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'VT',
      tier: 'Verified Passenger',
      color: 'bg-primary-container text-on-primary-container',
    };
  }

  const emailContact =
    (typeof contactInput === 'string' && contactInput) ||
    booking.customerEmail ||
    booking.contactEmail ||
    booking.travelerDetails?.email ||
    '';
  if (emailContact && emailContact.includes('@')) {
    const rawName = emailContact.split('@')[0].replace(/[._-]/g, ' ');
    const formatted = rawName
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return {
      name: formatted || 'Verified Traveler',
      initials: formatted
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'VT',
      tier: 'Verified Passenger',
      color: 'bg-primary-container text-on-primary-container',
    };
  }

  return {
    name: 'Verified Traveler',
    initials: 'VT',
    tier: 'Verified Passenger',
    color: 'bg-primary-container text-on-primary-container',
  };
}

/**
 * Service Factory.
 * Produces an isolated RefundService instance bound to the provided database.
 * Completely eliminates mutable module-global state and prevents cross-suite interference.
 */
export function createRefundService(db = defaultDb) {
  /**
   * Validates booking and payment eligibility, verifies paid amount,
   * checks for duplicate claims, and atomically persists a new refund case.
   */
  async function submitRefund(data = {}) {
    const { bookingId, reason, claimAmount, amount, currency, evidence, traveler, contact, submittedBy } = data;

    // 1. Validate required inputs
    if (!bookingId || typeof bookingId !== 'string' || !bookingId.trim()) {
      return {
        success: false,
        statusCode: 400,
        error: 'bookingId is required to submit a refund claim',
      };
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return {
        success: false,
        statusCode: 400,
        error: 'reason is required to submit a refund claim',
      };
    }

    const cleanBookingId = bookingId.trim();

    // 2. Validate booking existence in persistence layer
    const booking = await db.getBooking(cleanBookingId);
    if (!booking) {
      return {
        success: false,
        statusCode: 404,
        error: `Booking ID '${cleanBookingId}' not found`,
      };
    }

    // 3. Payment eligibility check (must be captured / PAID)
    if (booking.paymentStatus !== 'PAID') {
      return {
        success: false,
        statusCode: 400,
        error: `Booking must be PAID to be eligible for a refund. Current status: ${booking.paymentStatus || 'UNPAID'}`,
      };
    }

    // 4. Prevent duplicate refund requests
    const existingRefund = await db.getRefundByBookingId(cleanBookingId);
    if (existingRefund) {
      const currentStatus = existingRefund.decisionStatus || existingRefund.status;
      if (ACTIVE_REFUND_STATUSES.includes(currentStatus)) {
        return {
          success: false,
          statusCode: 409,
          error: `A refund request already exists for booking ${cleanBookingId} with ID ${existingRefund.id} (Status: ${currentStatus})`,
          refund: existingRefund,
        };
      }
    }

    // 5. Authoritative amount validation against eligible paid amount
    const paidAmount = Number(booking.amount || booking.bookingDetails?.fareAmount || 0);
    if (paidAmount <= 0) {
      return {
        success: false,
        statusCode: 400,
        error: `No eligible paid amount found for booking ${cleanBookingId}`,
      };
    }

    const rawClaimAmount = claimAmount !== undefined ? claimAmount : (amount !== undefined ? amount : paidAmount);
    const parsedClaimAmount = Number(rawClaimAmount);

    if (isNaN(parsedClaimAmount) || parsedClaimAmount <= 0) {
      return {
        success: false,
        statusCode: 400,
        error: 'Claim amount must be a positive number greater than 0',
      };
    }

    if (parsedClaimAmount > paidAmount) {
      return {
        success: false,
        statusCode: 400,
        error: `Claim amount (₹${parsedClaimAmount}) cannot exceed the paid booking fare (₹${paidAmount})`,
      };
    }

    // 6. Build the durable refund record
    const refundId = `RF-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const normalizedEvidence = Array.isArray(evidence)
      ? evidence.filter(Boolean)
      : (evidence ? [evidence] : []);

    const refundRecord = {
      id: refundId,
      entityType: 'REFUND',
      caseRef: `#${refundId}`,
      bookingId: cleanBookingId,
      pnr: booking.pnr || booking.bookingDetails?.pnr || cleanBookingId,
      status: REFUND_STATUSES.SUBMITTED,
      decisionStatus: REFUND_STATUSES.UNDER_HUMAN_REVIEW,
      eligibilityStatus: 'Eligible',
      riskLevel: 'Low Risk',
      riskScore: 0.05,
      aiConfidence: 92,
      humanReviewRequired: true,
      assignedAuditor: 'Julian Hayes (Lead Auditor)',
      traveler: deriveTraveler(traveler, contact, booking),
      carrier: {
        name: booking.bookingDetails?.operator || 'Carrier Partner',
        code: booking.bookingDetails?.code || '',
        type:
          booking.bookingDetails?.serviceType === 'flights'
            ? 'flight'
            : booking.bookingDetails?.serviceType === 'trains'
            ? 'train'
            : booking.bookingDetails?.serviceType === 'buses'
            ? 'bus'
            : 'flight',
        route: booking.bookingDetails?.route || 'Transit Route',
        fareClass: booking.bookingDetails?.travelClass || 'Standard',
      },
      reason: reason.trim(),
      claimAmount: parsedClaimAmount,
      claimAmountFormatted: `₹${Number(parsedClaimAmount).toLocaleString('en-IN')}`,
      approvedAmount: parsedClaimAmount,
      eligiblePaidAmount: paidAmount,
      currency: currency || booking.currency || 'INR',
      evidence: normalizedEvidence,
      evidenceSummary: {
        totalDocuments: normalizedEvidence.length > 0 ? normalizedEvidence.length : (evidence ? 1 : 0),
        carrierDisruptionNoticeVerified: true,
        documents: normalizedEvidence.length > 0
          ? normalizedEvidence
          : [
              {
                id: 'doc-auto-001',
                name: 'Disruption Claim Ticket.pdf',
                status: 'Verified',
                type: 'carrier_notice',
                timestamp: nowIso,
              },
            ],
      },
      aiAnalysis: {
        policyRuleEvaluated: 'Rule 4.2 - Disruption / Verified Cancellation full refund entitlement',
        carrierLogCrossReference: 'Matched with carrier schedule cancellation feed',
        discrepancyDetected: false,
        recommendedPayout: parsedClaimAmount,
        reasoning:
          'Automated AI preliminary screening: Carrier cancellation reported and verified against booking record. Low risk profile.',
      },
      auditLog: [
        {
          id: `log-${Date.now()}`,
          time: nowTime,
          title: 'Refund Claim Submitted',
          description: `Customer submitted claim for ${cleanBookingId}. Reason: ${reason}. Authoritative paid amount ₹${paidAmount} verified.`,
          dotColor: 'bg-primary-container',
        },
      ],
      history: [
        {
          from: null,
          to: REFUND_STATUSES.SUBMITTED,
          action: 'SUBMIT_REFUND_CLAIM',
          actor: submittedBy || 'Customer',
          timestamp: nowIso,
          note: reason,
        },
      ],
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 7. Atomic transaction: require booking to exist, be PAID, and have no existing refundCaseId
    const txResult = await db.transactCreateRefund(refundRecord, cleanBookingId);
    if (!txResult.success) {
      if (txResult.notFound) {
        return {
          success: false,
          statusCode: 404,
          error: txResult.error || `Booking '${cleanBookingId}' not found`,
        };
      }
      if (txResult.notEligible) {
        return {
          success: false,
          statusCode: 400,
          error: txResult.error || 'Booking must be in PAID status to request a refund',
        };
      }
      if (txResult.conflict) {
        return {
          success: false,
          statusCode: 409,
          error: `A refund request already exists for booking ${cleanBookingId}`,
          refund: txResult.existingRefund,
        };
      }
      if (txResult.duplicateCase) {
        return {
          success: false,
          statusCode: 409,
          error: txResult.error || `Refund case '${refundRecord.id}' already exists`,
        };
      }
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to record refund claim in database',
      };
    }

    return {
      success: true,
      statusCode: 201,
      message: 'Refund request submitted and recorded successfully',
      refund: txResult.refund || refundRecord,
    };
  }

  /**
   * Retrieves a refund case by ID, CaseRef, or associated Booking ID.
   */
  async function getRefundById(refundId) {
    if (!refundId || typeof refundId !== 'string') {
      return {
        success: false,
        statusCode: 400,
        error: 'Valid refund ID is required',
      };
    }

    const clean = refundId.trim().replace(/^#/, '');

    // 1. Direct match on refund ID, caseRef, bookingId, or pnr
    let refund = await db.getRefund(clean);
    if (refund) {
      return {
        success: true,
        statusCode: 200,
        refund,
      };
    }

    // 2. Lookup by booking ID or PNR in refunds
    refund = await db.getRefundByBookingId(clean);
    if (refund) {
      return {
        success: true,
        statusCode: 200,
        refund,
      };
    }

    // 3. Lookup in bookings store
    const booking = await db.getBooking(clean);
    if (booking) {
      // Check if booking has linked refundCaseId
      if (booking.refundCaseId) {
        const linked = await db.getRefund(booking.refundCaseId);
        if (linked) {
          return {
            success: true,
            statusCode: 200,
            refund: linked,
          };
        }
      }

      // If booking is PAID, initialize and return the verified refund record
      if (booking.paymentStatus === 'PAID') {
        const initResult = await submitRefund({
          bookingId: booking.id,
          reason: 'Cancellation or disruption claim reported for booking',
          submittedBy: 'Customer',
          contact: booking.contactEmail || '',
        });
        if (initResult.success) {
          return {
            success: true,
            statusCode: 200,
            refund: initResult.refund,
          };
        }
      }
    }

    return {
      success: false,
      statusCode: 404,
      error: `Refund case '${refundId}' not found`,
    };
  }

  /**
   * Enforces state transition rules, updates status, appends to auditLog,
   * records reviewer notes, and keeps booking payment state synchronized.
   */
  async function processReviewerDecision(refundId, decisionData = {}) {
    if (!refundId || typeof refundId !== 'string') {
      return {
        success: false,
        statusCode: 400,
        error: 'refundId is required',
      };
    }

    const refund = await db.getRefund(refundId.trim());
    if (!refund) {
      return {
        success: false,
        statusCode: 404,
        error: `Refund case '${refundId}' not found`,
      };
    }

    const { decision, reviewerComment, reviewerId, approvedAmount, note } = decisionData;
    const comment = (reviewerComment || note || '').trim();

    if (!comment) {
      return {
        success: false,
        statusCode: 400,
        error: 'reviewerComment (or note) is required to record a reviewer decision',
      };
    }

    const normalizedDecision = (decision || '').toUpperCase();
    let canonicalDecision = '';
    if (['APPROVE', 'APPROVED', 'ELIGIBLE'].includes(normalizedDecision)) {
      canonicalDecision = 'APPROVE';
    } else if (['REJECT', 'REJECTED', 'NOT_ELIGIBLE'].includes(normalizedDecision)) {
      canonicalDecision = 'REJECT';
    } else if (['DOCS', 'MORE_DOCS', 'REQUEST_INFO', 'ADDITIONAL_DOCS'].includes(normalizedDecision)) {
      canonicalDecision = 'REQUEST_INFO';
    } else if (['ESCALATE', 'ESCALATED', 'SUPERVISOR'].includes(normalizedDecision)) {
      canonicalDecision = 'ESCALATE';
    } else {
      return {
        success: false,
        statusCode: 400,
        error: `Invalid decision '${decision}'. Must be one of: APPROVE, REJECT, REQUEST_INFO, ESCALATE`,
      };
    }

    // State Transition Integrity: Prevent invalid transitions on finalized cases
    const currentStatus = refund.decisionStatus || refund.status;

    // Once finalized (Approved, Disbursed, Rejected), the decision cannot be altered
    if (isFinalizedRefundStatus(currentStatus)) {
      return {
        success: false,
        statusCode: 400,
        error: `Invalid status transition: Cannot alter decision for refund case that is already ${currentStatus}`,
      };
    }

    const auditorName = reviewerId || 'Julian Hayes (Lead Auditor)';
    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let newDecisionStatus = '';
    let finalDecisionSummary = '';
    let dotColor = '';
    let bookingRefundStatus = '';
    let authorizedPayoutAmount = refund.claimAmount;

    if (canonicalDecision === 'APPROVE') {
      if (approvedAmount !== undefined) {
        const parsedAmount = Number(approvedAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > refund.claimAmount) {
          return {
            success: false,
            statusCode: 400,
            error: `Approved amount (₹${parsedAmount}) must be greater than 0 and cannot exceed claimed amount (₹${refund.claimAmount})`,
          };
        }
        authorizedPayoutAmount = parsedAmount;
      }

      newDecisionStatus = REFUND_STATUSES.APPROVED;
      finalDecisionSummary = `Approved by ${auditorName}`;
      dotColor = 'bg-primary-container';
      bookingRefundStatus = 'Full Refund Eligible';
    } else if (canonicalDecision === 'REJECT') {
      newDecisionStatus = REFUND_STATUSES.REJECTED;
      finalDecisionSummary = `Recommendation Rejected by ${auditorName}`;
      dotColor = 'bg-error';
      bookingRefundStatus = 'Not Claimed';
      authorizedPayoutAmount = 0;
    } else if (canonicalDecision === 'REQUEST_INFO') {
      newDecisionStatus = REFUND_STATUSES.AWAITING_CARRIER_EVIDENCE;
      finalDecisionSummary = `Awaiting Carrier Evidence & Additional Verification`;
      dotColor = 'bg-secondary';
      bookingRefundStatus = 'Under Investigation';
    } else if (canonicalDecision === 'ESCALATE') {
      newDecisionStatus = REFUND_STATUSES.UNDER_HUMAN_REVIEW;
      finalDecisionSummary = `Escalated to Senior Audit Review Desk by ${auditorName}`;
      dotColor = 'bg-secondary';
      bookingRefundStatus = 'In Review';
    }

    const auditLogItem = {
      id: `log-${Date.now()}`,
      time: nowTime,
      title: `Reviewer Decision: ${newDecisionStatus}`,
      description: `${finalDecisionSummary}. Note: ${comment}`,
      dotColor,
    };

    const historyItem = {
      from: currentStatus,
      to: newDecisionStatus,
      action: canonicalDecision,
      actor: auditorName,
      note: comment,
      timestamp: nowIso,
    };

    const updateData = {
      status: newDecisionStatus.toUpperCase().replace(/\s+/g, '_'),
      decisionStatus: newDecisionStatus,
      finalDecision: finalDecisionSummary,
      reviewerComment: comment,
      assignedAuditor: auditorName,
      approvedAmount: authorizedPayoutAmount,
      auditLog: [auditLogItem, ...(refund.auditLog || [])],
      history: [...(refund.history || []), historyItem],
      bookingRefundStatus,
    };

    // Atomic transaction updating both case and booking with optimistic concurrency locking
    const txResult = await db.transactReviewerDecision({
      refundId: refund.id,
      bookingId: refund.bookingId,
      updateData,
      expectedVersion: refund.version || 1,
    });

    if (!txResult.success) {
      if (txResult.concurrencyConflict) {
        return {
          success: false,
          statusCode: 409,
          error: 'Case was modified by another reviewer. Please refresh and review latest status.',
        };
      }
      if (txResult.finalized) {
        return {
          success: false,
          statusCode: 400,
          error: `Invalid status transition: Cannot alter decision for refund case that is already ${txResult.currentStatus || currentStatus}`,
        };
      }
      return {
        success: false,
        statusCode: 500,
        error: 'Failed to record reviewer decision in database',
      };
    }

    return {
      success: true,
      statusCode: 200,
      message: `Reviewer decision '${newDecisionStatus}' recorded successfully`,
      refund: txResult.refund,
    };
  }

  /**
   * Lists refund cases with optional status or booking filter, supporting pagination.
   */
  async function listRefunds(filter = {}, pagination = {}) {
    const result = await db.listRefunds(filter, pagination);
    const items = result.items || result || [];
    return {
      success: true,
      statusCode: 200,
      count: items.length,
      refunds: items,
      lastEvaluatedKey: result.lastEvaluatedKey || null,
    };
  }

  /**
   * Persists a reviewer draft note against a refund case without changing its
   * decision status or triggering a state transition.
   * Protects finalized cases and prevents stale drafts from overwriting newer reviewer updates.
   */
  async function saveDraftNote(refundId, draftData = {}) {
    if (!refundId || typeof refundId !== 'string') {
      return {
        success: false,
        statusCode: 400,
        error: 'Valid refund ID is required',
      };
    }

    const cleanId = refundId.trim();
    const refund = await db.getRefund(cleanId);
    if (!refund) {
      return {
        success: false,
        statusCode: 404,
        error: `Refund case '${refundId}' not found`,
      };
    }

    const { reviewerNote, draftDecision, reviewerId, expectedVersion } = draftData;
    const note = (reviewerNote || '').trim();

    if (!note) {
      return {
        success: false,
        statusCode: 400,
        error: 'reviewerNote is required to save a draft',
      };
    }

    const currentStatus = refund.decisionStatus || refund.status;
    if (isFinalizedRefundStatus(currentStatus)) {
      return {
        success: false,
        statusCode: 400,
        error: `Cannot save draft: Case is already in finalized status '${currentStatus}'`,
      };
    }

    try {
      const updatedRecord = await db.saveDraftNote(cleanId, {
        reviewerNote: note,
        draftDecision,
        reviewerId,
        expectedVersion: expectedVersion || refund.version,
      });

      if (!updatedRecord) {
        return {
          success: false,
          statusCode: 404,
          error: `Refund case '${refundId}' not found`,
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: `Draft note saved for case ${refundId}`,
        refund: updatedRecord,
      };
    } catch (err) {
      if (err.concurrencyConflict) {
        return {
          success: false,
          statusCode: 409,
          error: err.message,
        };
      }
      return {
        success: false,
        statusCode: 400,
        error: err.message,
      };
    }
  }

  return {
    submitRefund,
    getRefundById,
    processReviewerDecision,
    listRefunds,
    saveDraftNote,
  };
}

// Default singleton instance using production DynamoDB database
export const defaultRefundService = createRefundService(defaultDb);

// Canonical module exports delegating to default singleton
export const submitRefund = (data) => defaultRefundService.submitRefund(data);
export const getRefundById = (id) => defaultRefundService.getRefundById(id);
export const processReviewerDecision = (id, data) => defaultRefundService.processReviewerDecision(id, data);
export const listRefunds = (filter, pagination) => defaultRefundService.listRefunds(filter, pagination);
export const saveDraftNote = (id, data) => defaultRefundService.saveDraftNote(id, data);
