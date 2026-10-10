export type RiskLevel = 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Insufficient Evidence';

export type InvestigationStatus = 
  | 'Ready for Payout'
  | 'Approved'
  | 'Disbursed'
  | 'Under Human Review'
  | 'Awaiting Carrier Evidence'
  | 'Audit In Progress'
  | 'Auto-Filed TDR'
  | 'Flagged'
  | 'Rejected'
  | 'Pending Human Approval';

export interface InvestigationStep {
  stepNumber: string;
  codeName: string;
  title: string;
  summary: string;
  status: 'Complete' | 'In Progress' | 'Pending';
  statusLabel?: string;
}

export interface EvidenceArtifact {
  id: string;
  title: string;
  icon: string;
  iconColor: string;
  verified: boolean;
  content: string;
  source: string;
  timestamp: string;
  isFullWidth?: boolean;
}

export interface AuditLogItem {
  id: string;
  time: string;
  title: string;
  description?: string;
  dotColor: string;
}

export interface InvestigationCase {
  id: string;
  caseRef: string;
  pnr: string;
  traveler: {
    name: string;
    initials: string;
    tier: string;
    color: string;
  };
  carrier: {
    name: string;
    code: string;
    type: 'flight' | 'train' | 'bus';
    route: string;
    seat?: string;
    fareClass?: string;
  };
  journeyDate: string;
  claimAmount: number;
  claimAmountFormatted: string;
  riskLevel: RiskLevel;
  riskScore: number;
  aiConfidence: number;
  evidenceStrength: string;
  evidenceCount: string;
  recommendedAction: string;
  recommendedActionLabel: string;
  finalDecision: string;
  decisionStatus: InvestigationStatus;
  reasonSummary: string;
  synthesis: string;
  isHighImpact?: boolean;
  humanReviewRequired: boolean;
  assignedAuditor: string;
  reviewerComment?: string;
  steps: InvestigationStep[];
  artifacts: EvidenceArtifact[];
  auditLog: AuditLogItem[];
}

export interface AnalyticsSummary {
  totalInvestigations: number;
  totalApprovedValueFormatted: string;
  approvalRateFormatted: string;
  highRiskCasesCount: number;
  avgTurnaround: string;
}

export interface SystemSettings {
  orgName: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  policies: {
    fullRefund: boolean;
    partialRefund: boolean;
    policyEvidenceRequired: boolean;
    customerHistoryCheck: boolean;
    cancellationEvidenceCheck: boolean;
  };
  riskRules: {
    highRiskThreshold: number;
    humanReviewRequired: boolean;
    highValueThreshold: number;
    insufficientEvidenceReview: boolean;
    paymentRiskReview: boolean;
  };
  notifications: {
    newHumanReview: boolean;
    highRiskDetected: boolean;
    investigationCompleted: boolean;
    refundDecisionUpdated: boolean;
  };
  aiPreferences: {
    aiInvestigation: boolean;
    aiRecommendations: boolean;
    evidenceBasedReasoning: boolean;
    humanApprovalSignificant: boolean;
  };
}

export interface BookingRecord {
  id: string;
  bookingRef: string;
  pnr: string;
  bookingDate: string;
  journeyDate: string;
  traveler: {
    name: string;
    initials: string;
    tier: string;
    color: string;
  };
  carrier: {
    name: string;
    code: string;
    type: 'flight' | 'train' | 'bus';
    route: string;
    seat: string;
    fareClass: string;
  };
  amount: number;
  amountFormatted: string;
  status:
    | 'Cancelled by Carrier'
    | 'Major Delay (>3h)'
    | 'Confirmed / On Time'
    | 'Runway Grounded'
    | 'Missed Connection'
    | 'Schedule Altered';
  refundStatus:
    | 'Full Refund Eligible'
    | 'Disbursed'
    | 'Under Investigation'
    | 'TDR Auto-Filed'
    | 'In Review'
    | 'Not Claimed';
  relatedInvestigationId?: string;
}
