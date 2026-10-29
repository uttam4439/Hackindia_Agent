/**
 * src/utils/refundStatus.ts
 * Authoritative Refund Status Normalization and Classification Utility.
 *
 * Enforces business rules for refund indicators:
 * - Green completion tick (✓) is shown ONLY when the backend explicitly confirms 'Disbursed' or 'Completed'.
 * - Approved but unpaid claims show approved/processing status, NOT a completion tick.
 * - Submitted claims show pending/processing status.
 * - Claims under investigation/review show investigation status.
 * - Rejected/failed claims show rejected status.
 * - Missing or unknown statuses return a neutral "Status unavailable" state.
 */

export type RefundCanonicalCategory =
  | 'COMPLETED'
  | 'APPROVED'
  | 'UNDER_REVIEW'
  | 'PENDING'
  | 'REJECTED'
  | 'UNAVAILABLE';

export interface RefundStatusMeta {
  canonicalCategory: RefundCanonicalCategory;
  rawStatus: string;
  label: string;
  iconName: string;
  badgeClass: string;
  dotColor: string;
  showsCompletionTick: boolean;
  accessibleDescription: string;
}

/**
 * Normalizes an arbitrary status string into one of the canonical categories.
 */
export function normalizeRefundStatus(status?: string | null): RefundCanonicalCategory {
  if (!status || typeof status !== 'string') {
    return 'UNAVAILABLE';
  }

  const clean = status.trim().toLowerCase();
  if (!clean || clean === 'unknown' || clean === 'null' || clean === 'undefined') {
    return 'UNAVAILABLE';
  }

  // 1. Completed / Disbursed: The ONLY state that represents money actually refunded
  if (['disbursed', 'completed', 'refunded', 'payout_completed'].includes(clean)) {
    return 'COMPLETED';
  }

  // 2. Approved (eligible and authorized, but money payout NOT yet disbursed)
  if (['approved', 'ready for payout', 'ready_for_payout', 'payout queued', 'authorized'].includes(clean)) {
    return 'APPROVED';
  }

  // 3. Under investigation / human review / awaiting evidence
  if (
    [
      'under human review',
      'pending human approval',
      'under review',
      'in review',
      'awaiting carrier evidence',
      'carrier evidence pending',
      'audit in progress',
      'auto-filed tdr',
      'investigating',
      'dispute review',
    ].includes(clean)
  ) {
    return 'UNDER_REVIEW';
  }

  // 4. Submitted / Pending: claim received but not yet adjudicated
  if (
    [
      'submitted',
      'pending',
      'claim filed',
      'new',
      'received',
      'queued',
      'processing',
    ].includes(clean)
  ) {
    return 'PENDING';
  }

  // 5. Rejected / Failed / Flagged
  if (
    [
      'rejected',
      'flagged',
      'declined',
      'failed',
      'not eligible',
      'ineligible',
      'cancelled claim',
    ].includes(clean)
  ) {
    return 'REJECTED';
  }

  return 'UNAVAILABLE';
}

/**
 * Retrieves comprehensive metadata for presenting refund status in the UI.
 */
export function getRefundStatusMeta(status?: string | null): RefundStatusMeta {
  const category = normalizeRefundStatus(status);
  const raw = (status || '').trim();

  switch (category) {
    case 'COMPLETED':
      return {
        canonicalCategory: 'COMPLETED',
        rawStatus: raw || 'Disbursed',
        label: raw.toLowerCase() === 'completed' ? 'Completed' : 'Disbursed',
        iconName: 'check_circle',
        badgeClass: 'bg-[#ecfdf5] text-[#166534] border-[#bbf7d0]',
        dotColor: 'bg-[#166534]',
        showsCompletionTick: true,
        accessibleDescription: 'Refund completed and funds disbursed to payment method',
      };

    case 'APPROVED':
      return {
        canonicalCategory: 'APPROVED',
        rawStatus: raw || 'Approved',
        label: raw.toLowerCase().includes('payout') ? 'Ready for Payout' : 'Approved (Payout Pending)',
        iconName: 'verified',
        badgeClass: 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]',
        dotColor: 'bg-[#0284c7]',
        showsCompletionTick: false,
        accessibleDescription: 'Refund claim approved by auditor; payout disbursement in progress',
      };

    case 'UNDER_REVIEW':
      return {
        canonicalCategory: 'UNDER_REVIEW',
        rawStatus: raw || 'Under Human Review',
        label: raw || 'Under Review',
        iconName: 'policy',
        badgeClass: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',
        dotColor: 'bg-[#d97706]',
        showsCompletionTick: false,
        accessibleDescription: 'Claim under auditor arbitration or awaiting carrier evidence',
      };

    case 'PENDING':
      return {
        canonicalCategory: 'PENDING',
        rawStatus: raw || 'Submitted',
        label: 'Submitted (Pending)',
        iconName: 'hourglass_top',
        badgeClass: 'bg-[#e8f2f0] text-[#0d6b63] border-[#d0dfd3]',
        dotColor: 'bg-[#0d6b63]',
        showsCompletionTick: false,
        accessibleDescription: 'Claim submitted to intake system; preliminary policy check queued',
      };

    case 'REJECTED':
      return {
        canonicalCategory: 'REJECTED',
        rawStatus: raw || 'Rejected',
        label: raw.toLowerCase() === 'flagged' ? 'Flagged Anomaly' : 'Rejected',
        iconName: 'cancel',
        badgeClass: 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]',
        dotColor: 'bg-[#dc2626]',
        showsCompletionTick: false,
        accessibleDescription: 'Refund claim rejected under applicable tariff rules',
      };

    case 'UNAVAILABLE':
    default:
      return {
        canonicalCategory: 'UNAVAILABLE',
        rawStatus: raw,
        label: 'Status unavailable',
        iconName: 'help_outline',
        badgeClass: 'bg-[#f3f4f6] text-[#4b5563] border-[#e5e7eb]',
        dotColor: 'bg-[#9ca3af]',
        showsCompletionTick: false,
        accessibleDescription: 'Authoritative refund status could not be verified from provider records',
      };
  }
}

/**
 * Convenience helper: True ONLY if the refund is genuinely completed / disbursed.
 */
export function isRefundCompleted(status?: string | null): boolean {
  return normalizeRefundStatus(status) === 'COMPLETED';
}

/**
 * Convenience helper: True if approved (whether waiting for payout or disbursed).
 */
export function isRefundApproved(status?: string | null): boolean {
  const cat = normalizeRefundStatus(status);
  return cat === 'APPROVED' || cat === 'COMPLETED';
}

/**
 * Convenience helper: True if under review / investigation.
 */
export function isRefundUnderReview(status?: string | null): boolean {
  return normalizeRefundStatus(status) === 'UNDER_REVIEW';
}

/**
 * Convenience helper: True if submitted / pending.
 */
export function isRefundPending(status?: string | null): boolean {
  return normalizeRefundStatus(status) === 'PENDING';
}

/**
 * Convenience helper: True if rejected / flagged.
 */
export function isRefundRejected(status?: string | null): boolean {
  return normalizeRefundStatus(status) === 'REJECTED';
}

/**
 * Convenience helper: True if status is missing or unrecognized.
 */
export function isRefundStatusUnavailable(status?: string | null): boolean {
  return normalizeRefundStatus(status) === 'UNAVAILABLE';
}

/**
 * Checks whether the AI policy check has genuinely finished based on authoritative claim data.
 * Does NOT assume completion merely because an AI confidence score exists.
 */
export function isPolicyEvaluationComplete(claim?: any): boolean {
  if (!claim) return false;

  // 1. Explicit policy step status if present in investigation steps
  if (Array.isArray(claim.steps)) {
    const policyStep = claim.steps.find((s: any) =>
      s.codeName?.toLowerCase().includes('policy') ||
      s.title?.toLowerCase().includes('policy')
    );
    if (policyStep) {
      return policyStep.status === 'Complete';
    }
  }

  // 2. Explicit flag if set
  if (claim.policyEvaluationComplete === true) return true;
  if (claim.policyEvaluationComplete === false) return false;

  // 3. Checked via aiAnalysis policy rule confirmation
  if (claim.aiAnalysis?.policyRuleEvaluated) {
    const rule = String(claim.aiAnalysis.policyRuleEvaluated).trim().toLowerCase();
    if (rule && !rule.includes('pending') && !rule.includes('evaluating') && !rule.includes('queued')) {
      return true;
    }
  }

  // 4. Claim has advanced to an authoritative decision state
  const cat = normalizeRefundStatus(claim.decisionStatus || claim.status);
  if (cat === 'APPROVED' || cat === 'COMPLETED' || cat === 'REJECTED') {
    return true;
  }
  if (cat === 'UNDER_REVIEW') {
    // Under review means policy check has completed and routed to human review,
    // unless steps explicitly indicate policy check is in progress
    if (Array.isArray(claim.steps)) {
      const policyStep = claim.steps.find((s: any) =>
        s.codeName?.toLowerCase().includes('policy') ||
        s.title?.toLowerCase().includes('policy')
      );
      if (policyStep && policyStep.status !== 'Complete') {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Returns the human-readable policy evaluation result label to display separately.
 */
export function getPolicyEvaluationResult(claim?: any): string {
  if (!claim) return 'Policy check pending';

  // 1. Explicit policy step summary / title if present in investigation steps
  if (Array.isArray(claim.steps)) {
    const policyStep = claim.steps.find((s: any) =>
      s.codeName?.toLowerCase().includes('policy') ||
      s.title?.toLowerCase().includes('policy')
    );
    if (policyStep) {
      if (policyStep.status === 'Complete') {
        if (policyStep.summary?.includes('DGCA CAR')) return 'DGCA CAR Mandate';
        if (policyStep.summary?.toLowerCase().includes('full refund')) return 'Full Refund Verified';
        return policyStep.title || 'Policy Verified';
      } else if (policyStep.status === 'In Progress') {
        return 'Evaluating policy...';
      }
    }
  }

  // 2. aiAnalysis policy rule evaluation
  if (claim.aiAnalysis?.policyRuleEvaluated) {
    const raw = String(claim.aiAnalysis.policyRuleEvaluated);
    if (raw.includes('Rule 4.2')) return 'Rule 4.2 Entitlement';
    if (raw.length > 24) return raw.slice(0, 21) + '...';
    return raw;
  }

  // 3. Explicit eligibility status
  if (claim.eligibilityStatus) {
    return `Policy: ${claim.eligibilityStatus}`;
  }

  // 4. Completed check fallback
  if (isPolicyEvaluationComplete(claim)) {
    return 'Policy Verified';
  }

  const cat = normalizeRefundStatus(claim.decisionStatus || claim.status);
  if (cat === 'PENDING') {
    return 'Evaluating policy...';
  }

  return 'Policy pending';
}

export type StepVisualState = 'completed' | 'in_progress' | 'upcoming' | 'rejected';

export interface TimelineStepDetail {
  stepNumber: number;
  label: string;
  subLabel: string;
  visualState: StepVisualState;
  icon: string;
  pillClass: string;
  textColor: string;
  ariaLabel: string;
}

export interface TimelineStepStates {
  submitted: TimelineStepDetail;
  policy: TimelineStepDetail;
  decision: TimelineStepDetail;
  payout: TimelineStepDetail;
}

/**
 * Authoritatively calculates the visual state for all 4 timeline steps:
 * 1. Submitted: Completed (green) once claim exists.
 * 2. AI Policy: Completed (green) ONLY when evaluation finished; In-progress (orange) while evaluating; Upcoming (gray) if not reached.
 * 3. Decision: Completed (green) if approved; Current (orange) if In Review; Rejected (red) if rejected; Upcoming (gray) if waiting.
 * 4. Payout: Completed (green) ONLY when disbursed; Current (orange) if approved awaiting payout; Upcoming (gray) if waiting/blocked.
 */
export function getTimelineStepStates(claim?: any): TimelineStepStates {
  const isAvailable = Boolean(claim && (claim.id || claim.caseRef || claim.status));
  const cat = isAvailable ? normalizeRefundStatus(claim.decisionStatus || claim.status) : 'UNAVAILABLE';
  const isCompleted = isRefundCompleted(claim?.decisionStatus);
  const isApproved = isRefundApproved(claim?.decisionStatus);
  const isRejected = isRefundRejected(claim?.decisionStatus);
  const policyComplete = isPolicyEvaluationComplete(claim);

  // 1. Step 1: Submitted
  const isSubmittedComplete = isAvailable && cat !== 'UNAVAILABLE';
  const submittedStep: TimelineStepDetail = {
    stepNumber: 1,
    label: 'Submitted',
    subLabel: isSubmittedComplete ? (claim.journeyDate || 'Intake verified') : 'Pending intake',
    visualState: isSubmittedComplete ? 'completed' : 'upcoming',
    icon: isSubmittedComplete ? '✓' : '1',
    pillClass: isSubmittedComplete
      ? 'bg-[#166534] text-white border-[#166534]'
      : 'bg-[#f3eee5] text-[#889593] border-[#e3ded4]',
    textColor: isSubmittedComplete ? 'text-[#166534]' : 'text-[#889593]',
    ariaLabel: isSubmittedComplete ? 'Step 1: Submitted - Completed' : 'Step 1: Submitted - Pending',
  };

  // 2. Step 2: AI Policy
  let policyVisualState: StepVisualState = 'upcoming';
  let policyIcon = '2';
  let policyPill = 'bg-[#f3eee5] text-[#889593] border-[#e3ded4]';
  let policyText = 'text-[#889593]';
  let policySubLabel = 'Pending';

  if (!isSubmittedComplete) {
    policyVisualState = 'upcoming';
    policySubLabel = 'Pending intake';
  } else if (policyComplete) {
    policyVisualState = 'completed';
    policyIcon = '✓';
    policyPill = 'bg-[#166534] text-white border-[#166534]';
    policyText = 'text-[#166534]';
    policySubLabel = getPolicyEvaluationResult(claim);
  } else {
    // Submitted, but policy check in progress
    policyVisualState = 'in_progress';
    policyIcon = '2';
    policyPill = 'bg-[#ea580c] text-white border-[#ea580c] animate-pulse';
    policyText = 'text-[#ea580c]';
    policySubLabel = 'Evaluating policy...';
  }

  const policyStep: TimelineStepDetail = {
    stepNumber: 2,
    label: 'AI Policy',
    subLabel: policySubLabel,
    visualState: policyVisualState,
    icon: policyIcon,
    pillClass: policyPill,
    textColor: policyText,
    ariaLabel: `Step 2: AI Policy - ${policyVisualState === 'completed' ? 'Completed' : policyVisualState === 'in_progress' ? 'Evaluating' : 'Upcoming'}`,
  };

  // 3. Step 3: Decision
  let decisionVisualState: StepVisualState = 'upcoming';
  let decisionIcon = '3';
  let decisionPill = 'bg-[#f3eee5] text-[#889593] border-[#e3ded4]';
  let decisionText = 'text-[#889593]';
  let decisionSubLabel = 'Waiting';

  if (!policyComplete || !isSubmittedComplete) {
    decisionVisualState = 'upcoming';
    decisionSubLabel = 'Pending policy';
  } else if (isRejected) {
    decisionVisualState = 'rejected';
    decisionIcon = '✕';
    decisionPill = 'bg-[#dc2626] text-white border-[#dc2626]';
    decisionText = 'text-[#dc2626]';
    decisionSubLabel = 'Rejected';
  } else if (isApproved) {
    decisionVisualState = 'completed';
    decisionIcon = '✓';
    decisionPill = 'bg-[#166534] text-white border-[#166534]';
    decisionText = 'text-[#166534]';
    decisionSubLabel = 'Approved';
  } else {
    // Policy complete, decision is currently in review (Under Human Review / Pending Human Approval)
    decisionVisualState = 'in_progress';
    decisionIcon = '3';
    decisionPill = 'bg-[#ea580c] text-white border-[#ea580c] animate-pulse';
    decisionText = 'text-[#ea580c]';
    decisionSubLabel = 'In Review';
  }

  const decisionStep: TimelineStepDetail = {
    stepNumber: 3,
    label: 'Decision',
    subLabel: decisionSubLabel,
    visualState: decisionVisualState,
    icon: decisionIcon,
    pillClass: decisionPill,
    textColor: decisionText,
    ariaLabel: `Step 3: Decision - ${decisionSubLabel}`,
  };

  // 4. Step 4: Payout
  let payoutVisualState: StepVisualState = 'upcoming';
  let payoutIcon = '4';
  let payoutPill = 'bg-[#f3eee5] text-[#889593] border-[#e3ded4]';
  let payoutText = 'text-[#889593]';
  let payoutSubLabel = 'Waiting';

  if (isCompleted) {
    // Only genuinely completed disbursements get green tick
    payoutVisualState = 'completed';
    payoutIcon = '✓';
    payoutPill = 'bg-[#166534] text-white border-[#166534]';
    payoutText = 'text-[#166534]';
    payoutSubLabel = 'Disbursed ✓';
  } else if (isApproved) {
    // Approved but unpaid: Current in-progress orange state
    payoutVisualState = 'in_progress';
    payoutIcon = '4';
    payoutPill = 'bg-[#ea580c] text-white border-[#ea580c] animate-pulse';
    payoutText = 'text-[#ea580c]';
    payoutSubLabel = 'Awaiting Payout';
  } else if (isRejected) {
    payoutVisualState = 'upcoming';
    payoutIcon = '—';
    payoutPill = 'bg-[#f3eee5] text-[#889593] border-[#e3ded4]';
    payoutText = 'text-[#889593]';
    payoutSubLabel = 'No Payout';
  } else {
    // Still waiting for decision
    payoutVisualState = 'upcoming';
    payoutIcon = '4';
    payoutPill = 'bg-[#f3eee5] text-[#889593] border-[#e3ded4]';
    payoutText = 'text-[#889593]';
    payoutSubLabel = 'Waiting';
  }

  const payoutStep: TimelineStepDetail = {
    stepNumber: 4,
    label: 'Payout',
    subLabel: payoutSubLabel,
    visualState: payoutVisualState,
    icon: payoutIcon,
    pillClass: payoutPill,
    textColor: payoutText,
    ariaLabel: `Step 4: Payout - ${payoutSubLabel}`,
  };

  return {
    submitted: submittedStep,
    policy: policyStep,
    decision: decisionStep,
    payout: payoutStep,
  };
}

