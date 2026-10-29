import { InvestigationCase, SystemSettings } from '../types';

export const highRiskCasesList: InvestigationCase[] = [];

export const allMockInvestigations: InvestigationCase[] = [];

export const defaultSettings: SystemSettings = {
  orgName: 'Agent Travel',
  currency: 'INR (₹) - Indian Rupee',
  timezone: 'Asia/Kolkata (IST, UTC+05:30)',
  dateFormat: 'DD MMM YYYY (e.g., 24 Oct 2026)',
  policies: {
    fullRefund: true,
    partialRefund: true,
    policyEvidenceRequired: true,
    customerHistoryCheck: true,
    cancellationEvidenceCheck: true,
  },
  riskRules: {
    highRiskThreshold: 70,
    humanReviewRequired: true,
    highValueThreshold: 25000,
    insufficientEvidenceReview: true,
    paymentRiskReview: true,
  },
  notifications: {
    newHumanReview: true,
    highRiskDetected: true,
    investigationCompleted: true,
    refundDecisionUpdated: true,
  },
  aiPreferences: {
    aiInvestigation: true,
    aiRecommendations: true,
    evidenceBasedReasoning: true,
    humanApprovalSignificant: true,
  },
};
