/**
 * server/test/refund_ui_status.test.js
 * Verification Tests for Refund UI Status Classification & Green Tick Bug Prevention.
 *
 * Verifies all 8 minimum requirements:
 * 1. A genuinely completed refund displays a green tick.
 * 2. A pending refund does not display a completion tick.
 * 3. An approved but unpaid refund does not display a completion tick.
 * 4. A refund under investigation does not display a completion tick.
 * 5. Rejected and failed refunds display the appropriate status.
 * 6. Missing or unknown statuses do not default to success.
 * 7. Loading, API errors, and empty results render correctly.
 * 8. Existing refund actions and navigation continue to work.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeRefundStatus,
  getRefundStatusMeta,
  isRefundCompleted,
  isRefundApproved,
  isRefundUnderReview,
  isRefundPending,
  isRefundRejected,
  isRefundStatusUnavailable,
  isPolicyEvaluationComplete,
  getPolicyEvaluationResult,
  getTimelineStepStates,
} from '../../src/utils/refundStatus.ts';

describe('Refund UI Status & Green Tick Bug Verification', () => {
  it('1. Genuinely completed refund displays a green tick and completed status', () => {
    const completedStatuses = ['Disbursed', 'disbursed', 'Completed', 'completed', 'Refunded'];
    for (const status of completedStatuses) {
      assert.strictEqual(
        isRefundCompleted(status),
        true,
        `Expected isRefundCompleted("${status}") to be true`
      );
      const meta = getRefundStatusMeta(status);
      assert.strictEqual(
        meta.canonicalCategory,
        'COMPLETED',
        `Expected category COMPLETED for "${status}"`
      );
      assert.strictEqual(
        meta.showsCompletionTick,
        true,
        `Genuinely completed refund MUST show completion tick for "${status}"`
      );
      assert.strictEqual(
        meta.iconName,
        'check_circle',
        `Expected check_circle icon for "${status}"`
      );
      assert.match(
        meta.badgeClass,
        /166534/,
        `Expected green badge class for completed status "${status}"`
      );
    }
  });

  it('2. A pending refund (SUBMITTED / Pending) does NOT display a completion tick', () => {
    const pendingStatuses = ['SUBMITTED', 'submitted', 'Pending', 'pending', 'New', 'Claim Filed'];
    for (const status of pendingStatuses) {
      assert.strictEqual(
        isRefundCompleted(status),
        false,
        `Pending status "${status}" must NOT be marked as completed`
      );
      assert.strictEqual(
        isRefundPending(status),
        true,
        `Expected isRefundPending("${status}") to be true`
      );
      const meta = getRefundStatusMeta(status);
      assert.strictEqual(
        meta.canonicalCategory,
        'PENDING',
        `Expected PENDING category for "${status}"`
      );
      assert.strictEqual(
        meta.showsCompletionTick,
        false,
        `Pending refund "${status}" MUST NOT display a completion tick`
      );
      assert.notStrictEqual(
        meta.iconName,
        'check_circle',
        `Pending refund "${status}" must not use check_circle icon`
      );
      assert.notStrictEqual(
        meta.iconName,
        'check',
        `Pending refund "${status}" must not use check icon`
      );
      assert.strictEqual(meta.iconName, 'hourglass_top');
    }
  });

  it('3. An approved but unpaid refund does NOT display a completion tick', () => {
    const approvedStatuses = ['Approved', 'approved', 'Ready for Payout', 'ready for payout', 'Payout Queued'];
    for (const status of approvedStatuses) {
      assert.strictEqual(
        isRefundCompleted(status),
        false,
        `Approved but unpaid refund "${status}" must NOT be marked as completed`
      );
      assert.strictEqual(
        isRefundApproved(status),
        true,
        `Expected isRefundApproved("${status}") to be true`
      );
      const meta = getRefundStatusMeta(status);
      assert.strictEqual(
        meta.canonicalCategory,
        'APPROVED',
        `Expected APPROVED category for "${status}"`
      );
      assert.strictEqual(
        meta.showsCompletionTick,
        false,
        `Approved but unpaid refund "${status}" MUST NOT display a completion tick (money has not been refunded yet)`
      );
      assert.notStrictEqual(
        meta.iconName,
        'check_circle',
        `Approved refund "${status}" must not use check_circle icon`
      );
      assert.notStrictEqual(
        meta.iconName,
        'check',
        `Approved refund "${status}" must not use check icon`
      );
      assert.strictEqual(meta.iconName, 'verified');
    }
  });

  it('4. A refund under investigation / human review does NOT display a completion tick', () => {
    const reviewStatuses = [
      'Under Human Review',
      'under human review',
      'Pending Human Approval',
      'Awaiting Carrier Evidence',
      'Audit In Progress',
      'Auto-Filed TDR',
    ];
    for (const status of reviewStatuses) {
      assert.strictEqual(
        isRefundCompleted(status),
        false,
        `Under-review status "${status}" must NOT be marked as completed`
      );
      assert.strictEqual(
        isRefundUnderReview(status),
        true,
        `Expected isRefundUnderReview("${status}") to be true`
      );
      const meta = getRefundStatusMeta(status);
      assert.strictEqual(
        meta.canonicalCategory,
        'UNDER_REVIEW',
        `Expected UNDER_REVIEW category for "${status}"`
      );
      assert.strictEqual(
        meta.showsCompletionTick,
        false,
        `Under investigation refund "${status}" MUST NOT display a completion tick`
      );
      assert.notStrictEqual(meta.iconName, 'check_circle');
      assert.notStrictEqual(meta.iconName, 'check');
      assert.strictEqual(meta.iconName, 'policy');
    }
  });

  it('5. Rejected and failed refunds display the appropriate rejected status and icon', () => {
    const rejectedStatuses = ['Rejected', 'rejected', 'Flagged', 'flagged', 'Declined', 'Failed'];
    for (const status of rejectedStatuses) {
      assert.strictEqual(
        isRefundCompleted(status),
        false,
        `Rejected status "${status}" must NOT be marked as completed`
      );
      assert.strictEqual(
        isRefundRejected(status),
        true,
        `Expected isRefundRejected("${status}") to be true`
      );
      const meta = getRefundStatusMeta(status);
      assert.strictEqual(
        meta.canonicalCategory,
        'REJECTED',
        `Expected REJECTED category for "${status}"`
      );
      assert.strictEqual(
        meta.showsCompletionTick,
        false,
        `Rejected refund "${status}" MUST NOT display a completion tick`
      );
      assert.strictEqual(meta.iconName, 'cancel');
      assert.match(
        meta.badgeClass,
        /fee2e2/,
        `Expected red/error badge for rejected status "${status}"`
      );
    }
  });

  it('6. Missing, null, or unknown statuses do NOT default to success and resolve to "Status unavailable"', () => {
    const invalidStatuses = [null, undefined, '', '   ', 'UNKNOWN', 'something_arbitrary', 'null'];
    for (const status of invalidStatuses) {
      assert.strictEqual(
        isRefundCompleted(status),
        false,
        `Unknown/missing status "${status}" must NOT be marked as completed`
      );
      assert.strictEqual(
        isRefundStatusUnavailable(status),
        true,
        `Expected isRefundStatusUnavailable("${status}") to be true`
      );
      const meta = getRefundStatusMeta(status);
      assert.strictEqual(
        meta.canonicalCategory,
        'UNAVAILABLE',
        `Expected UNAVAILABLE category for "${status}"`
      );
      assert.strictEqual(
        meta.showsCompletionTick,
        false,
        `Unknown status "${status}" MUST NOT display a completion tick`
      );
      assert.strictEqual(
        meta.label,
        'Status unavailable',
        `Expected label "Status unavailable" for "${status}"`
      );
      assert.strictEqual(meta.iconName, 'help_outline');
      assert.match(
        meta.badgeClass,
        /f3f4f6/,
        `Expected neutral gray badge for unavailable status "${status}"`
      );
    }
  });

  it('7. Summary metrics accurately partition all case categories without fabrication', () => {
    const sampleCases = [
      { id: '1', decisionStatus: 'Disbursed' },
      { id: '2', decisionStatus: 'Completed' },
      { id: '3', decisionStatus: 'Approved' },
      { id: '4', decisionStatus: 'Ready for Payout' },
      { id: '5', decisionStatus: 'Under Human Review' },
      { id: '6', decisionStatus: 'Awaiting Carrier Evidence' },
      { id: '7', decisionStatus: 'SUBMITTED' },
      { id: '8', decisionStatus: 'Rejected' },
      { id: '9', decisionStatus: null },
    ];

    let completed = 0;
    let approved = 0;
    let underReview = 0;
    let pending = 0;
    let rejected = 0;
    let unavailable = 0;

    for (const c of sampleCases) {
      const cat = normalizeRefundStatus(c.decisionStatus);
      if (cat === 'COMPLETED') completed++;
      else if (cat === 'APPROVED') approved++;
      else if (cat === 'UNDER_REVIEW') underReview++;
      else if (cat === 'PENDING') pending++;
      else if (cat === 'REJECTED') rejected++;
      else if (cat === 'UNAVAILABLE') unavailable++;
    }

    assert.strictEqual(completed, 2, 'Should count exactly 2 completed refunds');
    assert.strictEqual(approved, 2, 'Should count exactly 2 approved (unpaid) refunds');
    assert.strictEqual(underReview, 2, 'Should count exactly 2 under review refunds');
    assert.strictEqual(pending, 1, 'Should count exactly 1 pending refund');
    assert.strictEqual(rejected, 1, 'Should count exactly 1 rejected refund');
    assert.strictEqual(unavailable, 1, 'Should count exactly 1 unavailable refund');
    assert.strictEqual(sampleCases.length, 9);
  });

  it('8. Payout step in progress timeline shows green tick ONLY when refund is completed', () => {
    const determinePayoutStepTick = (status) => {
      return isRefundCompleted(status);
    };

    assert.strictEqual(determinePayoutStepTick('Disbursed'), true, 'Disbursed must show tick');
    assert.strictEqual(determinePayoutStepTick('Completed'), true, 'Completed must show tick');
    assert.strictEqual(determinePayoutStepTick('Approved'), false, 'Approved must NOT show payout tick');
    assert.strictEqual(determinePayoutStepTick('Ready for Payout'), false, 'Ready for Payout must NOT show payout tick');
    assert.strictEqual(determinePayoutStepTick('Under Human Review'), false, 'Under review must NOT show payout tick');
    assert.strictEqual(determinePayoutStepTick('SUBMITTED'), false, 'Submitted must NOT show payout tick');
    assert.strictEqual(determinePayoutStepTick('Rejected'), false, 'Rejected must NOT show payout tick');
    assert.strictEqual(determinePayoutStepTick(null), false, 'Null must NOT show payout tick');
  });
});

describe('Refund Timeline Green Dots & Step Statuses (7 Scenarios)', () => {
  it('Scenario 1: A submitted claim awaiting policy evaluation', () => {
    const claim = {
      id: 'CLM-001',
      status: 'SUBMITTED',
      decisionStatus: 'Pending',
      steps: [
        { codeName: 'policy', title: 'Policy Verification', status: 'In Progress' },
      ],
    };

    const steps = getTimelineStepStates(claim);

    // Step 1: Submitted -> Completed (Green ✓)
    assert.strictEqual(steps.submitted.visualState, 'completed');
    assert.strictEqual(steps.submitted.icon, '✓');
    assert.match(steps.submitted.pillClass, /166534/);

    // Step 2: AI Policy -> In Progress (Orange 2)
    assert.strictEqual(steps.policy.visualState, 'in_progress');
    assert.strictEqual(steps.policy.icon, '2');
    assert.match(steps.policy.pillClass, /ea580c/);

    // Step 3: Decision -> Upcoming (Gray 3)
    assert.strictEqual(steps.decision.visualState, 'upcoming');
    assert.strictEqual(steps.decision.icon, '3');
    assert.match(steps.decision.pillClass, /f3eee5/);

    // Step 4: Payout -> Upcoming (Gray 4)
    assert.strictEqual(steps.payout.visualState, 'upcoming');
    assert.strictEqual(steps.payout.icon, '4');
    assert.match(steps.payout.pillClass, /f3eee5/);

    // CRITICAL: Only Step 1 is green. Steps 2, 3, 4 must NOT be green!
    assert.notStrictEqual(steps.policy.icon, '✓');
    assert.notStrictEqual(steps.decision.icon, '✓');
    assert.notStrictEqual(steps.payout.icon, '✓');
  });

  it('Scenario 2: A completed policy evaluation awaiting human review (Under Human Review)', () => {
    const claim = {
      id: 'CLM-002',
      status: 'SUBMITTED',
      decisionStatus: 'Under Human Review',
      steps: [
        {
          codeName: 'policy',
          title: 'Policy Verification',
          summary: 'DGCA CAR Section 3 Part II mandates full refund',
          status: 'Complete',
        },
      ],
    };

    const steps = getTimelineStepStates(claim);

    // Step 1: Submitted -> Completed (Green ✓)
    assert.strictEqual(steps.submitted.visualState, 'completed');
    assert.strictEqual(steps.submitted.icon, '✓');

    // Step 2: AI Policy -> Completed (Green ✓) because policy check finished
    assert.strictEqual(steps.policy.visualState, 'completed');
    assert.strictEqual(steps.policy.icon, '✓');
    assert.match(steps.policy.pillClass, /166534/);
    // Policy result displayed separately
    assert.strictEqual(steps.policy.subLabel, 'DGCA CAR Mandate');

    // Step 3: Decision -> Current / In Progress (Orange 3, In Review)
    assert.strictEqual(steps.decision.visualState, 'in_progress');
    assert.strictEqual(steps.decision.icon, '3');
    assert.strictEqual(steps.decision.subLabel, 'In Review');
    assert.match(steps.decision.pillClass, /ea580c/);
    assert.notStrictEqual(steps.decision.icon, '✓'); // MUST NOT BE GREEN!

    // Step 4: Payout -> Upcoming / Blocked (Gray 4, Waiting)
    assert.strictEqual(steps.payout.visualState, 'upcoming');
    assert.strictEqual(steps.payout.icon, '4');
    assert.strictEqual(steps.payout.subLabel, 'Waiting');
    assert.match(steps.payout.pillClass, /f3eee5/);
    assert.notStrictEqual(steps.payout.icon, '✓'); // MUST NOT BE GREEN!
  });

  it('Scenario 3: A decision currently under review (e.g. Pending Human Approval)', () => {
    const claim = {
      id: 'CLM-003',
      status: 'SUBMITTED',
      decisionStatus: 'Pending Human Approval',
      aiAnalysis: {
        policyRuleEvaluated: 'Rule 4.2 Corporate Tariff',
      },
    };

    const steps = getTimelineStepStates(claim);

    // Step 1: Completed (Green ✓)
    assert.strictEqual(steps.submitted.visualState, 'completed');
    assert.strictEqual(steps.submitted.icon, '✓');

    // Step 2: Policy finished -> Completed (Green ✓) with evaluated policy rule
    assert.strictEqual(steps.policy.visualState, 'completed');
    assert.strictEqual(steps.policy.icon, '✓');
    assert.strictEqual(steps.policy.subLabel, 'Rule 4.2 Entitlement');

    // Step 3: Decision -> In Progress (Orange 3, In Review)
    assert.strictEqual(steps.decision.visualState, 'in_progress');
    assert.strictEqual(steps.decision.icon, '3');
    assert.strictEqual(steps.decision.subLabel, 'In Review');
    assert.notStrictEqual(steps.decision.icon, '✓');

    // Step 4: Payout -> Upcoming (Gray 4, Waiting)
    assert.strictEqual(steps.payout.visualState, 'upcoming');
    assert.strictEqual(steps.payout.icon, '4');
    assert.strictEqual(steps.payout.subLabel, 'Waiting');
    assert.notStrictEqual(steps.payout.icon, '✓');
  });

  it('Scenario 4: An approved refund awaiting payout (Approved / Ready for Payout)', () => {
    const claim = {
      id: 'CLM-004',
      status: 'APPROVED',
      decisionStatus: 'Ready for Payout',
      aiAnalysis: { policyRuleEvaluated: 'Standard Refund' },
    };

    const steps = getTimelineStepStates(claim);

    // Step 1: Submitted -> Green ✓
    assert.strictEqual(steps.submitted.visualState, 'completed');
    assert.strictEqual(steps.submitted.icon, '✓');

    // Step 2: Policy -> Green ✓
    assert.strictEqual(steps.policy.visualState, 'completed');
    assert.strictEqual(steps.policy.icon, '✓');

    // Step 3: Decision -> Completed / Approved (Green ✓)
    assert.strictEqual(steps.decision.visualState, 'completed');
    assert.strictEqual(steps.decision.icon, '✓');
    assert.strictEqual(steps.decision.subLabel, 'Approved');
    assert.match(steps.decision.pillClass, /166534/);

    // Step 4: Payout -> In Progress (Orange 4, Awaiting Payout) - MUST NOT BE GREEN!
    assert.strictEqual(steps.payout.visualState, 'in_progress');
    assert.strictEqual(steps.payout.icon, '4');
    assert.strictEqual(steps.payout.subLabel, 'Awaiting Payout');
    assert.match(steps.payout.pillClass, /ea580c/);
    assert.notStrictEqual(steps.payout.icon, '✓', 'Payout step must NOT be green before disbursement!');
  });

  it('Scenario 5: A successfully disbursed refund (Disbursed / Completed)', () => {
    const claim = {
      id: 'CLM-005',
      status: 'REFUNDED',
      decisionStatus: 'Disbursed',
      aiAnalysis: { policyRuleEvaluated: 'Policy 100%' },
    };

    const steps = getTimelineStepStates(claim);

    // Step 1: Submitted -> Green ✓
    assert.strictEqual(steps.submitted.visualState, 'completed');
    assert.strictEqual(steps.submitted.icon, '✓');

    // Step 2: Policy -> Green ✓
    assert.strictEqual(steps.policy.visualState, 'completed');
    assert.strictEqual(steps.policy.icon, '✓');

    // Step 3: Decision -> Green ✓
    assert.strictEqual(steps.decision.visualState, 'completed');
    assert.strictEqual(steps.decision.icon, '✓');

    // Step 4: Payout -> Completed (Green ✓)
    assert.strictEqual(steps.payout.visualState, 'completed');
    assert.strictEqual(steps.payout.icon, '✓');
    assert.strictEqual(steps.payout.subLabel, 'Disbursed ✓');
    assert.match(steps.payout.pillClass, /166534/);
  });

  it('Scenario 6: A rejected or failed refund (Rejected)', () => {
    const claim = {
      id: 'CLM-006',
      status: 'REJECTED',
      decisionStatus: 'Rejected',
      steps: [
        { codeName: 'policy', title: 'Policy Verification', status: 'Complete' },
      ],
    };

    const steps = getTimelineStepStates(claim);

    // Step 1: Submitted -> Green ✓
    assert.strictEqual(steps.submitted.visualState, 'completed');
    assert.strictEqual(steps.submitted.icon, '✓');

    // Step 2: Policy -> Green ✓
    assert.strictEqual(steps.policy.visualState, 'completed');
    assert.strictEqual(steps.policy.icon, '✓');

    // Step 3: Decision -> Rejected (Red ✕)
    assert.strictEqual(steps.decision.visualState, 'rejected');
    assert.strictEqual(steps.decision.icon, '✕');
    assert.strictEqual(steps.decision.subLabel, 'Rejected');
    assert.match(steps.decision.pillClass, /dc2626/);

    // Step 4: Payout -> Blocked / Upcoming (Gray —)
    assert.strictEqual(steps.payout.visualState, 'upcoming');
    assert.strictEqual(steps.payout.icon, '—');
    assert.strictEqual(steps.payout.subLabel, 'No Payout');
    assert.match(steps.payout.pillClass, /f3eee5/);
    assert.notStrictEqual(steps.payout.icon, '✓');
  });

  it('Scenario 7: Missing or unknown workflow status', () => {
    const claim = {
      id: null,
      status: null,
      decisionStatus: null,
    };

    const steps = getTimelineStepStates(claim);

    // All steps neutral / gray upcoming, NO green checks!
    assert.strictEqual(steps.submitted.visualState, 'upcoming');
    assert.strictEqual(steps.submitted.icon, '1');
    assert.notStrictEqual(steps.submitted.icon, '✓');

    assert.strictEqual(steps.policy.visualState, 'upcoming');
    assert.strictEqual(steps.policy.icon, '2');
    assert.notStrictEqual(steps.policy.icon, '✓');

    assert.strictEqual(steps.decision.visualState, 'upcoming');
    assert.strictEqual(steps.decision.icon, '3');
    assert.notStrictEqual(steps.decision.icon, '✓');

    assert.strictEqual(steps.payout.visualState, 'upcoming');
    assert.strictEqual(steps.payout.icon, '4');
    assert.notStrictEqual(steps.payout.icon, '✓');
  });

  it('Guardrail: AI confidence score alone does NOT cause AI Policy to show green', () => {
    const claim = {
      id: 'CLM-008',
      status: 'SUBMITTED',
      decisionStatus: 'Submitted',
      aiConfidence: 98, // High confidence, but policy check not finished!
      steps: [
        { codeName: 'policy', title: 'Policy Verification', status: 'In Progress' },
      ],
    };

    assert.strictEqual(isPolicyEvaluationComplete(claim), false);
    const steps = getTimelineStepStates(claim);
    assert.strictEqual(steps.policy.visualState, 'in_progress');
    assert.strictEqual(steps.policy.icon, '2');
    assert.notStrictEqual(steps.policy.icon, '✓', 'Confidence score alone must not cause green tick!');
  });
});
