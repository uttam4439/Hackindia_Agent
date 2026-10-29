import React, { createContext, useContext, useState, useEffect } from 'react';
import { InvestigationCase, SystemSettings } from '../types';
import { allMockInvestigations, defaultSettings, primaryCaseAT9842 } from '../data/mockData';

interface InvestigationContextType {
  cases: InvestigationCase[];
  selectedCase: InvestigationCase;
  settings: SystemSettings;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectCaseById: (id: string) => void;
  approveRefund: (id: string, comment?: string, adjustedAmount?: number) => Promise<{ success: boolean; error?: string }>;
  requestManualReview: (id: string, comment?: string, isEscalation?: boolean) => Promise<{ success: boolean; error?: string }>;
  rejectRecommendation: (id: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  saveReviewerDraft: (id: string, note: string, draftDecision?: string) => Promise<{ success: boolean; error?: string }>;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  timeframe: string;
  setTimeframe: (tf: string) => void;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export const InvestigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<InvestigationCase[]>(allMockInvestigations);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('AT-9842');
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<string>('Last 30 Days');


  // Load persistent backend refunds on mount and merge with mock data
  useEffect(() => {
    const fetchBackendRefunds = async () => {
      const endpoints = ['/api/refunds', 'http://localhost:5001/api/refunds'];
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.refunds) && data.refunds.length > 0) {
              setCases((prev) => {
                const incomingMap = new Map<string, any>(
                  data.refunds.map((r: any) => [String(r.id || '').toLowerCase(), r])
                );

                const updated = prev.map((c) => {
                  const incoming =
                    incomingMap.get(c.id.toLowerCase()) ||
                    incomingMap.get(c.caseRef.toLowerCase().replace('#', ''));
                  if (incoming) {
                    return {
                      ...c,
                      ...incoming,
                      decisionStatus: incoming.decisionStatus || c.decisionStatus,
                      claimAmount: incoming.claimAmount ?? c.claimAmount,
                      claimAmountFormatted: incoming.claimAmountFormatted || c.claimAmountFormatted,
                      reviewerDraftNote: incoming.reviewerDraftNote,
                      reviewerDraftDecision: incoming.reviewerDraftDecision,
                      reviewerComment: incoming.reviewerComment || c.reviewerComment,
                      auditLog: incoming.auditLog || c.auditLog,
                    };
                  }
                  return c;
                });

                const existingIds = new Set(prev.map((c) => c.id.toLowerCase()));
                const brandNew = data.refunds.filter(
                  (r: any) =>
                    r.id &&
                    !existingIds.has(String(r.id).toLowerCase()) &&
                    !existingIds.has(String(r.caseRef || '').toLowerCase().replace('#', ''))
                );

                return [...brandNew, ...updated];
              });
              break;
            }
          }
        } catch {
          // Continue to next endpoint or remain with mock cases
        }
      }
    };

    fetchBackendRefunds();
  }, []);

  const selectedCase =
    cases.find(
      (c) =>
        c.id.toLowerCase() === selectedCaseId.toLowerCase() ||
        c.caseRef.toLowerCase().replace('#', '') === selectedCaseId.toLowerCase().replace('#', '') ||
        c.pnr.toLowerCase() === selectedCaseId.toLowerCase() ||
        (Boolean((c as any).bookingId) && String((c as any).bookingId).toLowerCase() === selectedCaseId.toLowerCase())
    ) ||
    cases[0] ||
    primaryCaseAT9842;

  const selectCaseById = (id: string) => {
    setSelectedCaseId(id);
  };


  const sendDecisionToBackend = async (
    id: string,
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'ESCALATE',
    comment: string,
    approvedAmount?: number
  ): Promise<{ success: boolean; error?: string; refund?: any }> => {
    const cleanId = id.replace('#', '').trim();
    const payload: any = {
      decision,
      reviewerComment: comment.trim() || 'Decision recorded by Lead Auditor',
      reviewerId: 'Julian Hayes (Lead Auditor)',
    };
    if (approvedAmount !== undefined && approvedAmount > 0) {
      payload.approvedAmount = approvedAmount;
    }

    const endpoints = [`/api/refunds/${cleanId}/decision`, `http://localhost:5001/api/refunds/${cleanId}/decision`];

    let lastError = 'Unable to reach backend service';
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          return { success: true, refund: data.refund };
        } else if (data?.error) {
          return { success: false, error: data.error };
        } else if (!res.ok) {
          return { success: false, error: `Backend returned HTTP ${res.status}` };
        }
      } catch (err: any) {
        lastError = err?.message || 'Network error connecting to refund service';
      }
    }
    return { success: false, error: lastError };
  };

  const mapDraftDecisionToBackend = (d?: string): string | null => {
    if (!d) return null;
    const norm = d.trim().toLowerCase();
    if (norm === 'docs' || norm === 'more_docs' || norm === 'request_info') {
      return 'more_docs';
    }
    if (norm === 'eligible' || norm === 'approve') {
      return 'eligible';
    }
    if (norm === 'not_eligible' || norm === 'reject') {
      return 'not_eligible';
    }
    if (norm === 'adjusted') {
      return 'adjusted';
    }
    return d;
  };

  const saveReviewerDraft = async (
    id: string,
    note: string,
    draftDecision?: string
  ): Promise<{ success: boolean; error?: string; refund?: any }> => {
    const cleanId = id.replace('#', '').trim();
    const mappedDecision = mapDraftDecisionToBackend(draftDecision);
    const payload = {
      reviewerNote: note.trim(),
      draftDecision: mappedDecision,
      reviewerId: 'Julian Hayes (Lead Auditor)',
    };

    const endpoints = [`/api/refunds/${cleanId}/draft`, `http://localhost:5001/api/refunds/${cleanId}/draft`];

    let lastError = 'Unable to reach backend service';
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          // Reflect draft note directly in state
          setCases((prev) =>
            prev.map((c) => {
              if (
                c.id.toLowerCase() === id.toLowerCase() ||
                c.caseRef.toLowerCase().replace('#', '') === cleanId.toLowerCase()
              ) {
                const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return {
                  ...c,
                  reviewerDraftNote: note.trim(),
                  reviewerDraftDecision: mappedDecision,
                  reviewerDraftSavedAt: new Date().toISOString(),
                  auditLog: data.refund?.auditLog || [
                    {
                      id: `log-${Date.now()}`,
                      time: nowTime,
                      title: 'Reviewer Draft Note Saved',
                      description: `Draft saved by Julian Hayes. Pending decision: ${mappedDecision || 'not selected'}. Note: ${note.trim()}`,
                      dotColor: 'bg-secondary',
                    },
                    ...c.auditLog,
                  ],
                } as any;
              }
              return c;
            })
          );
          return { success: true, refund: data.refund };
        } else if (data?.error) {
          return { success: false, error: data.error };
        } else if (!res.ok) {
          return { success: false, error: `Backend returned HTTP ${res.status}` };
        }
      } catch (err: any) {
        lastError = err?.message || 'Network error connecting to refund service';
      }
    }
    return { success: false, error: lastError };
  };

  const approveRefund = async (
    id: string,
    comment?: string,
    adjustedAmount?: number
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanComment = comment || 'Refund authorized following full evidence verification.';
    const res = await sendDecisionToBackend(id, 'APPROVE', cleanComment, adjustedAmount);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    setCases((prev) =>
      prev.map((c) => {
        if (c.id === id || c.caseRef.replace('#', '') === id.replace('#', '')) {
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const finalAmount = adjustedAmount != null && adjustedAmount > 0 ? adjustedAmount : c.claimAmount;
          const finalFormatted =
            adjustedAmount != null && adjustedAmount > 0
              ? `₹${adjustedAmount.toLocaleString('en-IN')}`
              : c.claimAmountFormatted;
          const isAdjusted = adjustedAmount != null && adjustedAmount > 0 && adjustedAmount !== c.claimAmount;

          return {
            ...c,
            claimAmount: finalAmount,
            claimAmountFormatted: finalFormatted,
            decisionStatus: 'Approved' as const,
            finalDecision: isAdjusted
              ? `Approved with Adjusted Amount (${finalFormatted}) by Lead Auditor Julian Hayes`
              : 'Approved by Lead Auditor Julian Hayes',
            reviewerComment: cleanComment,
            reviewerDraftNote: undefined,
            reviewerDraftDecision: undefined,
            auditLog: res.refund?.auditLog || [
              {
                id: `log-${Date.now()}`,
                time: now,
                title: isAdjusted ? `Refund Authorized (Adjusted): ${finalFormatted}` : `Refund Authorized: ${finalFormatted}`,
                description: isAdjusted
                  ? `Signed off by Julian Hayes. Adjusted from original ${c.claimAmountFormatted} to ${finalFormatted}. Ledger record #REF-APPROVED-${id} emitted.`
                  : `Signed off by Julian Hayes. Ledger record #REF-APPROVED-${id} emitted.`,
                dotColor: 'bg-primary-container',
              },
              ...c.auditLog,
            ],
          } as any;
        }
        return c;
      })
    );
    return { success: true };
  };

  const requestManualReview = async (
    id: string,
    comment?: string,
    isEscalation = false
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanComment = comment || (isEscalation ? 'Escalated to Senior Audit Review Desk' : 'Dispatched for manual airline carrier liaison verification.');
    const decisionCode = isEscalation ? 'ESCALATE' : 'REQUEST_INFO';
    const res = await sendDecisionToBackend(id, decisionCode, cleanComment);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    setCases((prev) =>
      prev.map((c) => {
        if (c.id === id || c.caseRef.replace('#', '') === id.replace('#', '')) {
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newStatus = isEscalation ? ('Under Human Review' as const) : ('Awaiting Carrier Evidence' as const);
          return {
            ...c,
            decisionStatus: newStatus,
            finalDecision: isEscalation ? 'Escalated to Senior Review Desk' : 'Awaiting Carrier Evidence Verification',
            reviewerComment: cleanComment,
            reviewerDraftNote: undefined,
            reviewerDraftDecision: undefined,
            auditLog: res.refund?.auditLog || [
              {
                id: `log-${Date.now()}`,
                time: now,
                title: isEscalation ? 'Case Escalated to Senior Review Desk' : 'Case Marked for Additional Evidence',
                description: cleanComment,
                dotColor: 'bg-secondary',
              },
              ...c.auditLog,
            ],
          } as any;
        }
        return c;
      })
    );
    return { success: true };
  };

  const rejectRecommendation = async (
    id: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanReason = reason.trim() || 'Claim rejected following human auditor review.';
    const res = await sendDecisionToBackend(id, 'REJECT', cleanReason);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    setCases((prev) =>
      prev.map((c) => {
        if (c.id === id || c.caseRef.replace('#', '') === id.replace('#', '')) {
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            ...c,
            decisionStatus: 'Rejected' as const,
            finalDecision: 'Recommendation Rejected by Auditor',
            reviewerComment: cleanReason,
            reviewerDraftNote: undefined,
            reviewerDraftDecision: undefined,
            auditLog: res.refund?.auditLog || [
              {
                id: `log-${Date.now()}`,
                time: now,
                title: 'AI Recommendation Overridden / Rejected',
                description: `Reason: ${cleanReason}`,
                dotColor: 'bg-error',
              },
              ...c.auditLog,
            ],
          } as any;
        }
        return c;
      })
    );
    return { success: true };
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
  };

  return (
    <InvestigationContext.Provider
      value={{
        cases,
        selectedCase,
        settings,
        searchQuery,
        setSearchQuery,
        selectCaseById,
        approveRefund,
        requestManualReview,
        rejectRecommendation,
        saveReviewerDraft,
        updateSettings,
        isSearchModalOpen,
        setIsSearchModalOpen,
        timeframe,
        setTimeframe,
      }}
    >
      {children}
    </InvestigationContext.Provider>
  );
};

export const useInvestigation = () => {
  const context = useContext(InvestigationContext);
  if (!context) {
    throw new Error('useInvestigation must be used within an InvestigationProvider');
  }
  return context;
};
