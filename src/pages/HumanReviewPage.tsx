import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvestigation } from '../context/InvestigationContext';

export const HumanReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { cases, selectedCase, selectCaseById, approveRefund, requestManualReview, rejectRecommendation } = useInvestigation();

  const [decisionReason, setDecisionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [decisionOutcome, setDecisionOutcome] = useState<'pending' | 'approved' | 'manual_review' | 'rejected'>('pending');
  const [showToast, setShowToast] = useState(false);

  const handleApprove = () => {
    setIsProcessing(true);
    setTimeout(() => {
      approveRefund(selectedCase.id, decisionReason || 'Authorized by Lead Auditor Julian Hayes.');
      setIsProcessing(false);
      setDecisionOutcome('approved');
      setShowToast(true);
    }, 900);
  };

  const handleManualReview = () => {
    requestManualReview(selectedCase.id, decisionReason || 'Dispatched for 2nd-level carrier liaison review.');
    setDecisionOutcome('manual_review');
    setShowToast(true);
  };

  const handleReject = () => {
    if (!decisionReason.trim()) {
      alert('Please enter an auditor justification / reason in the comment box before rejecting.');
      return;
    }
    rejectRecommendation(selectedCase.id, decisionReason);
    setDecisionOutcome('rejected');
    setShowToast(true);
  };

  return (
    <div className="flex flex-col w-full pb-16 text-left">
      {/* Top Navigation & Breadcrumbs Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md py-space-sm mb-2">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs text-outline font-label-md text-xs sm:text-sm">
            <button
              onClick={() => navigate('/refund-investigations')}
              className="hover:text-on-surface transition-colors cursor-pointer"
            >
              Refund Investigations
            </button>
            <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
            <span className="font-code-sm text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-semibold">
              {selectedCase.caseRef}
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight font-bold">
            Human Review & Approval
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-tertiary">
            Review the AI investigation, supporting evidence, risk assessment, and recommendation before making the final refund decision.
          </p>
        </div>

        <div className="flex items-center gap-space-sm self-start md:self-center">
          <button
            onClick={() => navigate(`/refund-investigations/${selectedCase.id}`)}
            className="inline-flex items-center gap-space-xs px-space-md py-2.5 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-xs sm:text-sm hover:bg-surface-container transition-all shadow-xs border border-surface-container cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            <span>View Case Dossier</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container transition-colors shadow-xs border border-surface-container cursor-pointer"
            title="Print Case Dossier"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
          </button>
        </div>
      </div>

      {/* Case Switcher Strip */}
      <div className="flex items-center gap-space-xs overflow-x-auto pb-space-xs mb-space-md bg-surface-container-lowest p-2 rounded-2xl border border-surface-container">
        <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline whitespace-nowrap pl-2 pr-1 font-semibold">
          Pending Auditor Review:
        </span>
        {cases
          .filter((c) => c.humanReviewRequired || c.isHighImpact || c.riskLevel === 'High Risk')
          .map((c) => {
            const isSelected = selectedCase.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  selectCaseById(c.id);
                  setDecisionOutcome('pending');
                  setDecisionReason('');
                }}
                className={`flex items-center gap-2 px-space-md py-1.5 rounded-full font-label-md text-xs whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-primary-container text-on-primary-container border-primary font-bold shadow-xs'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant border-surface-container font-medium'
                }`}
              >
                <span>{c.caseRef}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    c.riskLevel === 'High Risk'
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-secondary-fixed text-on-secondary-fixed'
                  }`}
                >
                  {c.riskLevel}
                </span>
                <span className="font-semibold">{c.claimAmountFormatted}</span>
              </button>
            );
          })}
      </div>

      {/* Enterprise Summary Strip Banner */}
      <section className="mb-space-xl p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-space-md items-center text-left">
          {/* Case Meta */}
          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Case Reference</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-headline-sm text-sm sm:text-base font-bold text-on-surface">
                {selectedCase.caseRef}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  decisionOutcome === 'approved'
                    ? 'bg-primary'
                    : decisionOutcome === 'rejected'
                    ? 'bg-error'
                    : 'bg-primary-container animate-pulse'
                }`}
              ></span>
              <span className="font-label-sm text-xs text-primary font-semibold">
                {decisionOutcome === 'approved'
                  ? 'Authorized'
                  : decisionOutcome === 'rejected'
                  ? 'Rejected'
                  : 'Ready for Review'}
              </span>
            </div>
          </div>

          {/* Customer */}
          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Passenger</span>
            <span className="font-label-md text-xs sm:text-sm text-on-surface font-semibold mt-0.5 truncate">
              {selectedCase.traveler.name}
            </span>
            <span className="font-body-sm text-xs text-tertiary">{selectedCase.traveler.tier}</span>
          </div>

          {/* Itinerary */}
          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Trip Sector</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-label-md text-xs sm:text-sm text-on-surface font-bold">DEL</span>
              <span className="material-symbols-outlined text-[14px] text-outline">flight_takeoff</span>
              <span className="font-label-md text-xs sm:text-sm text-on-surface font-bold">BOM</span>
            </div>
            <span className="font-code-sm text-[11px] text-secondary font-medium truncate">
              {selectedCase.carrier.code} • Economy (M)
            </span>
          </div>

          {/* Journey Date */}
          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Flight Date</span>
            <span className="font-label-md text-xs sm:text-sm text-on-surface font-semibold mt-0.5">
              {selectedCase.journeyDate}
            </span>
            <span className="font-body-sm text-xs text-tertiary">Scheduled 07:15 IST</span>
          </div>

          {/* Amount */}
          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Refund Requested</span>
            <span className="font-headline-md text-base sm:text-headline-md text-on-surface font-bold mt-0.5 tracking-tight text-on-primary-container">
              {selectedCase.claimAmountFormatted}
            </span>
            <span className="font-label-sm text-[11px] text-outline">Full Fare Value</span>
          </div>

          {/* Risk Tier */}
          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Risk Classification</span>
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-container/20 text-on-primary-container font-label-sm text-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">verified_user</span>
                <span>{selectedCase.riskLevel}</span>
              </span>
            </div>
            <span className="font-body-sm text-xs text-tertiary mt-0.5">Score: {selectedCase.riskScore} Anomaly</span>
          </div>

          {/* AI Confidence */}
          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Confidence</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-metric-display text-xl sm:text-2xl leading-none text-on-surface font-extrabold">
                {selectedCase.aiConfidence}%
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-primary-container h-full rounded-full"
                style={{ width: `${selectedCase.aiConfidence}%` }}
              ></div>
            </div>
          </div>

          {/* Evidence Status */}
          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Evidence Pack</span>
            <span className="font-label-md text-xs sm:text-sm text-on-surface font-semibold mt-0.5">5/5 Verified</span>
            <span className="font-label-sm text-xs text-primary font-semibold flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[14px]">done_all</span>
              <span>Strong Baseline</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2-Column Split: Main Content (65%) & Decision Cockpit (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        {/* LEFT / MAIN WORKSPACE (~65%) */}
        <div className="lg:col-span-8 flex flex-col gap-space-xl">
          {/* 1. AI Recommendation Engine Card */}
          <section className="rounded-2xl p-space-lg sm:p-space-xl bg-surface-container-lowest shadow-sm border border-surface-container relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between gap-space-sm mb-space-md border-b border-surface-container pb-3">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-xl bg-primary-container/20 flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                </div>
                <div>
                  <p className="font-label-sm text-[11px] uppercase tracking-widest text-outline">AI RECOMMENDATION</p>
                  <h2 className="font-headline-sm text-base sm:text-headline-sm font-bold text-on-surface">
                    AI Recommendation Engine
                  </h2>
                </div>
              </div>
            </div>

            {/* Hero Synthesis Result */}
            <div className="p-space-lg rounded-xl bg-surface-container-low mb-space-md border border-surface-container">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pb-space-md border-b border-surface-container">
                <div>
                  <span className="font-label-sm text-xs uppercase tracking-wider text-tertiary">Recommended Action</span>
                  <div className="flex items-center gap-space-sm mt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-label-md text-xs font-bold shadow-xs">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Full Refund</span>
                    </span>
                    <span className="font-headline-lg text-xl sm:text-headline-lg font-bold text-on-surface">
                      {selectedCase.claimAmountFormatted}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-2 rounded-xl border border-surface-container">
                  <span className="material-symbols-outlined text-secondary text-[20px]">policy</span>
                  <div>
                    <p className="font-label-sm text-[10px] text-tertiary leading-none">Policy Basis</p>
                    <p className="font-label-md text-xs text-on-surface font-semibold leading-tight mt-0.5">
                      Refund policy supports full refund
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-space-md">
                <p className="font-label-sm text-[11px] uppercase tracking-wider text-outline mb-1">
                  Investigation Synthesis
                </p>
                <p className="font-body-lg text-xs sm:text-sm text-on-surface font-medium leading-relaxed italic">
                  “{selectedCase.synthesis}”
                </p>
              </div>
            </div>

            {/* Metrics Strip inside AI Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm mb-space-md">
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col justify-between">
                <span className="font-label-sm text-[11px] text-tertiary">Model Confidence</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-headline-sm text-base font-bold text-on-surface">94.2%</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
                </div>
                <span className="font-body-sm text-[11px] text-outline mt-0.5">Statistical deviation &lt;0.02</span>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col justify-between">
                <span className="font-label-sm text-[11px] text-tertiary">Risk Assessment</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-headline-sm text-base font-bold text-primary">Low Risk</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">security</span>
                </div>
                <span className="font-body-sm text-[11px] text-outline mt-0.5">Safe to execute</span>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col justify-between">
                <span className="font-label-sm text-[11px] text-tertiary">Disbursement Route</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-headline-sm text-base font-bold text-on-surface">Auto-Credit</span>
                  <span className="material-symbols-outlined text-secondary text-[20px]">credit_card</span>
                </div>
                <span className="font-body-sm text-[11px] text-outline mt-0.5">To primary card ending ••4012</span>
              </div>
            </div>

            {/* Compliance Governance Notice */}
            <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">gavel</span>
              <div className="text-on-surface">
                <p className="font-label-md text-xs sm:text-sm font-semibold">Human Authorization Required</p>
                <p className="font-body-sm text-xs text-tertiary mt-0.5">
                  This recommendation requires human review and authorization before the refund is released.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Corroborated Evidence Review (5 Verified Items) */}
          <section className="rounded-2xl p-space-lg sm:p-space-xl bg-surface-container-lowest shadow-sm border border-surface-container">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-lg pb-3 border-b border-surface-container">
              <div>
                <div className="flex items-center gap-space-xs">
                  <h2 className="font-headline-sm text-base sm:text-headline-sm font-bold text-on-surface">
                    Corroborated Evidence Review
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-container/20 text-on-primary-container font-label-sm text-xs font-semibold">
                    5 of 5 Verified Records
                  </span>
                </div>
                <p className="font-body-sm text-xs text-tertiary mt-0.5">
                  Multi-source cross-verification through airline GDS, card networks, and civil aviation feeds.
                </p>
              </div>
              <button
                onClick={() => alert('All audit proofs cryptographically verified.')}
                className="text-secondary font-label-md text-xs font-semibold hover:underline inline-flex items-center gap-1 self-start sm:self-center cursor-pointer"
                type="button"
              >
                <span>Audit Proofs</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </button>
            </div>

            {/* Evidence Cards Stack */}
            <div className="flex flex-col gap-space-md">
              {/* Evidence 1 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container hover:bg-surface-container transition-colors">
                <div className="flex items-start justify-between gap-space-md">
                  <div className="flex items-start gap-space-md">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-secondary shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">confirmation_number</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-label-md text-xs sm:text-sm font-bold text-on-surface">
                          Booking Record (GDS Amadeus)
                        </h3>
                        <span className="font-code-sm text-[11px] bg-surface-container-high px-2 py-0.5 rounded text-on-surface font-semibold">
                          PNR: 482910
                        </span>
                      </div>
                      <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
                        Confirmed electronic ticket issued under corporate travel itinerary. Fare class: M (Economy Flex • Refundable).
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-outline font-body-sm text-[11px]">
                        <span>E-Ticket: #098-2948102941</span>
                        <span>•</span>
                        <span>Synced: Today, 10:14 IST</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-[14px]">check</span>Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence 2 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container hover:bg-surface-container transition-colors">
                <div className="flex items-start justify-between gap-space-md">
                  <div className="flex items-start gap-space-md">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-label-md text-xs sm:text-sm font-bold text-on-surface">
                          Settlement & Payment Ledger
                        </h3>
                        <span className="font-code-sm text-[11px] bg-surface-container-high px-2 py-0.5 rounded text-on-surface font-semibold">
                          REF: TXN-98420-IN
                        </span>
                      </div>
                      <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
                        Payment settled on corporate card ending ••4012. Breakdown: Net Base Fare ₹7,200 + Taxes ₹2,250 = ₹9,450.
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-outline font-body-sm text-[11px]">
                        <span>Status: Settled</span>
                        <span>•</span>
                        <span>Route: Original Payment Method</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-[14px]">check</span>Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence 3 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container hover:bg-surface-container transition-colors">
                <div className="flex items-start justify-between gap-space-md">
                  <div className="flex items-start gap-space-md">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-secondary shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">badge</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-label-md text-xs sm:text-sm font-bold text-on-surface">
                          Corporate Passenger History
                        </h3>
                        <span className="font-label-sm text-[11px] bg-surface-container-high px-2 py-0.5 rounded text-tertiary">
                          Verified Identity
                        </span>
                      </div>
                      <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
                        Rahul Sharma has 14 past bookings with Acme Travel Corp. Clean record with zero prior disputes or rejected claims.
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-outline font-body-sm text-[11px]">
                        <span>Account Standing: Good</span>
                        <span>•</span>
                        <span>14 Completed Trips</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container/20 text-on-primary-container font-label-sm text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-[14px]">verified</span>No previous disputes
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence 4 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container hover:bg-surface-container transition-colors">
                <div className="flex items-start justify-between gap-space-md">
                  <div className="flex items-start gap-space-md">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-error shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">event_busy</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-label-md text-xs sm:text-sm font-bold text-on-surface">
                          Carrier Cancellation Notice
                        </h3>
                        <span className="font-code-sm text-[11px] bg-surface-container-high px-2 py-0.5 rounded text-on-surface font-semibold">
                          Flight AI-805
                        </span>
                      </div>
                      <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
                        Flight AI-805 cancellation verified via carrier operations feed. Notification dispatched prior to scheduled departure.
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-outline font-body-sm text-[11px]">
                        <span>Status: Cancelled by Carrier</span>
                        <span>•</span>
                        <span>Eligible for Full Refund</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container/20 text-on-primary-container font-label-sm text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-[14px]">check</span>Carrier cancellation confirmed
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence 5 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container hover:bg-surface-container transition-colors">
                <div className="flex items-start justify-between gap-space-md">
                  <div className="flex items-start gap-space-md">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary-container shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">balance</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-label-md text-xs sm:text-sm font-bold text-on-surface">
                          Refund Policy
                        </h3>
                        <span className="font-code-sm text-[11px] bg-surface-container-high px-2 py-0.5 rounded text-on-surface font-semibold">
                          Standard Disruption Policy
                        </span>
                      </div>
                      <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
                        Applicable airline and travel refund policy supports 100% refund for carrier-initiated cancellation.
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-outline font-body-sm text-[11px]">
                        <span>Entitlement: 100% Full Refund</span>
                        <span>•</span>
                        <span>Deductions: ₹0</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container/20 text-on-primary-container font-label-sm text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-[14px]">verified</span>Full refund supported
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Risk Assessment Panel */}
          <section className="rounded-2xl p-space-lg sm:p-space-xl bg-surface-container-lowest shadow-sm border border-surface-container">
            <div className="flex items-center justify-between gap-space-sm mb-space-md pb-3 border-b border-surface-container">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface">
                  <span className="material-symbols-outlined text-[18px]">analytics</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-base sm:text-headline-sm font-bold text-on-surface">
                    Telemetry & Anomaly Assessment
                  </h2>
                  <p className="font-body-sm text-xs text-tertiary">Real-time risk scoring matrix computed across 8 validation steps.</p>
                </div>
              </div>
              <span className="font-label-sm text-xs text-primary font-bold bg-primary-container/10 px-3 py-1 rounded-full border border-primary-container/20">
                Pass: All 8 Audits
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md mb-space-md">
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container">
                <p className="font-label-sm text-[11px] text-tertiary uppercase">Overall Anomaly Score</p>
                <p className="font-metric-display text-xl sm:text-2xl text-primary font-bold mt-1">
                  0.04 <span className="font-body-sm text-xs text-tertiary font-normal">/ 1.0</span>
                </p>
                <p className="font-label-sm text-[11px] text-outline mt-0.5">Threshold benchmark: 0.35</p>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container">
                <p className="font-label-sm text-[11px] text-tertiary uppercase">Risk Signals Detected</p>
                <p className="font-headline-sm text-base sm:text-lg text-on-surface font-bold mt-1">0 Flagged</p>
                <p className="font-label-sm text-[11px] text-primary font-semibold mt-0.5">Zero anomalies found</p>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container">
                <p className="font-label-sm text-[11px] text-tertiary uppercase">Corroboration Score</p>
                <p className="font-headline-sm text-base sm:text-lg text-on-surface font-bold mt-1">Strong (5/5)</p>
                <p className="font-label-sm text-[11px] text-outline mt-0.5">Cross-verified datasets</p>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container">
                <p className="font-label-sm text-[11px] text-tertiary uppercase">Investigation Cycle</p>
                <p className="font-headline-sm text-base sm:text-lg text-on-surface font-bold mt-1">8 of 8 Done</p>
                <p className="font-label-sm text-[11px] text-outline mt-0.5">Latency: 1.84 seconds</p>
              </div>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-center gap-space-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0">check_circle</span>
              <p className="font-body-md text-xs sm:text-sm text-tertiary leading-relaxed">
                <span className="font-semibold text-on-surface">Conclusion:</span> No significant risk indicators were detected during the automated investigation. Identity match verified, payment trajectory reconciles accurately, and telemetry directly aligns with official civil aviation records.
              </p>
            </div>
          </section>
        </div>

        {/* RIGHT SIDEBAR / DECISION COCKPIT (~35%) */}
        <div className="lg:col-span-4 flex flex-col gap-space-lg lg:sticky lg:top-20">
          {/* Final Decision Card */}
          <div className="rounded-2xl p-space-lg bg-surface-container-lowest shadow-sm border border-surface-container">
            {/* Header with Status */}
            <div className="flex items-center justify-between pb-space-md border-b border-surface-container mb-space-md">
              <div>
                <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Authorizer Cockpit</span>
                <h2 className="font-headline-sm text-base sm:text-headline-sm font-bold text-on-surface">Final Decision</h2>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-xs font-semibold ${
                  decisionOutcome === 'approved'
                    ? 'bg-primary-container text-on-primary-container'
                    : decisionOutcome === 'rejected'
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-secondary-fixed text-on-secondary-fixed animate-pulse'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span>
                  {decisionOutcome === 'approved'
                    ? 'Approved'
                    : decisionOutcome === 'rejected'
                    ? 'Rejected'
                    : 'Pending Human Approval'}
                </span>
              </span>
            </div>

            {/* Reviewer Metadata Block */}
            <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container mb-space-md flex flex-col gap-space-xs text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-tertiary">Designated Auditor</span>
                <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">Julian Hayes (Lead)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-tertiary">Audit Role</span>
                <span className="text-on-surface font-medium">Enterprise Restitution Lead</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-tertiary">Resolution Status</span>
                <span className={decisionOutcome === 'approved' ? 'text-primary font-semibold' : 'text-error font-medium'}>
                  {decisionOutcome === 'approved' ? 'Authorized' : 'Awaiting Execution'}
                </span>
              </div>
            </div>

            {/* Decision Reason Textarea */}
            <div className="mb-space-md">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-label-md text-xs sm:text-sm font-semibold text-on-surface" htmlFor="decisionReason">
                  Decision Reason / Reviewer Comment
                </label>
                <span className="font-label-sm text-[11px] text-outline">Optional audit note</span>
              </div>
              <textarea
                className="w-full p-3 rounded-xl bg-surface-container-low border border-surface-variant font-body-md text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                id="decisionReason"
                placeholder="Enter auditor justification or override rationale for banking record..."
                rows={2}
                maxLength={300}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
              />
              <div className="flex items-center justify-between mt-1 text-tertiary font-body-sm text-[11px]">
                <span>Logged to internal immutable audit trail</span>
                <span>{decisionReason.length}/300</span>
              </div>
            </div>

            {/* Warning / Security Callout */}
            <div className="p-space-md rounded-xl bg-error-container/20 border border-error-container/40 mb-space-lg flex items-start gap-space-sm text-xs">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">shield</span>
              <p className="text-on-error-container leading-relaxed">
                Approving this action will authorize the recommended refund of{' '}
                <span className="font-bold">{selectedCase.claimAmountFormatted}</span> to the customer's original payment method.
              </p>
            </div>

            {/* Action Button Stack */}
            <div className="flex flex-col gap-space-sm">
              <button
                onClick={handleApprove}
                disabled={isProcessing || decisionOutcome === 'approved'}
                className="w-full py-3.5 px-space-lg rounded-full bg-primary-container text-on-primary-container font-headline-sm text-xs sm:text-sm font-bold shadow-md hover:bg-primary-container/90 active:scale-[0.98] transition-all flex items-center justify-center gap-space-xs cursor-pointer disabled:opacity-60"
                type="button"
              >
                {isProcessing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                    <span>Processing Authorization...</span>
                  </>
                ) : decisionOutcome === 'approved' ? (
                  <>
                    <span className="material-symbols-outlined text-[20px]">done</span>
                    <span>Refund Authorized</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[22px]">check_circle</span>
                    <span>Approve Refund • {selectedCase.claimAmountFormatted}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleManualReview}
                className="w-full py-2.5 px-space-md rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-space-xs cursor-pointer border border-surface-container"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">manage_search</span>
                <span>Request Manual Review</span>
              </button>

              <button
                onClick={handleReject}
                className="w-full py-2.5 px-space-md rounded-full bg-transparent hover:bg-error-container/20 text-error font-label-md text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-space-xs cursor-pointer border border-error/30"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">block</span>
                <span>Reject Recommendation</span>
              </button>
            </div>

            {/* Success Toast */}
            {showToast && (
              <div className="p-space-md rounded-xl bg-primary-container text-on-primary-container mt-space-md animate-fade-in border border-primary">
                <div className="flex items-center gap-2 font-bold font-label-md text-xs">
                  <span className="material-symbols-outlined text-[20px]">task_alt</span>
                  <span>
                    {decisionOutcome === 'approved'
                      ? 'Refund Transmitted Successfully'
                      : decisionOutcome === 'rejected'
                      ? 'Recommendation Rejected'
                      : 'Dispatched for Manual Review'}
                  </span>
                </div>
                <p className="font-body-sm text-xs mt-1">
                  Transaction ledger updated. Confirmation reference #REF-APPROVED-9842 logged to immutable audit trail.
                </p>
              </div>
            )}
          </div>

          {/* Chronological Audit Trail & Activity Timeline */}
          <div className="rounded-2xl p-space-lg bg-surface-container-lowest shadow-sm border border-surface-container">
            <div className="flex items-center justify-between mb-space-md pb-2 border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">history_toggle_off</span>
                <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface">Review Activity</h3>
              </div>
              <span className="font-label-sm text-[11px] text-outline">Automated Pipeline</span>
            </div>

            {/* Timeline Steps */}
            <div className="relative pl-6 flex flex-col gap-space-md">
              <div className="absolute left-2.5 top-2 bottom-3 w-0.5 bg-surface-container-high"></div>

              {/* Step 1 */}
              <div className="relative flex items-start gap-space-sm text-xs">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center ring-4 ring-surface-container-lowest shadow-xs">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                </div>
                <div>
                  <p className="font-label-md font-semibold text-on-surface">AI Investigation Completed</p>
                  <p className="font-body-sm text-tertiary">Claim ingested, itinerary & PNR parsed</p>
                  <span className="font-code-sm text-outline mt-0.5 block text-[10px]">10:14 AM IST</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex items-start gap-space-sm text-xs">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center ring-4 ring-surface-container-lowest shadow-xs">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                </div>
                <div>
                  <p className="font-label-md font-semibold text-on-surface">Evidence Verified</p>
                  <p className="font-body-sm text-tertiary">5 of 5 multi-tier data feeds reconciled</p>
                  <span className="font-code-sm text-outline mt-0.5 block text-[10px]">10:15 AM IST</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex items-start gap-space-sm text-xs">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center ring-4 ring-surface-container-lowest shadow-xs">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                </div>
                <div>
                  <p className="font-label-md font-semibold text-on-surface">Risk Assessment Completed</p>
                  <p className="font-body-sm text-tertiary">Scored as Low Risk • 94% confidence</p>
                  <span className="font-code-sm text-outline mt-0.5 block text-[10px]">10:16 AM IST</span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative flex items-start gap-space-sm text-xs">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center ring-4 ring-surface-container-lowest shadow-xs">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                </div>
                <div>
                  <p className="font-label-md font-semibold text-on-surface">Recommendation Formulated</p>
                  <p className="font-body-sm text-tertiary">Full Refund ₹9,450 proposed via DGCA rule</p>
                  <span className="font-code-sm text-outline mt-0.5 block text-[10px]">10:16 AM IST</span>
                </div>
              </div>

              {/* Step 5 */}
              <div className="relative flex items-start gap-space-sm text-xs">
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-surface-container-lowest ${
                    decisionOutcome === 'approved'
                      ? 'bg-primary text-on-primary'
                      : decisionOutcome === 'rejected'
                      ? 'bg-error text-white'
                      : 'bg-secondary text-on-secondary animate-pulse'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {decisionOutcome === 'approved' ? 'check' : decisionOutcome === 'rejected' ? 'close' : 'pending'}
                  </span>
                </div>
                <div>
                  <p
                    className={`font-label-md font-bold ${
                      decisionOutcome === 'approved'
                        ? 'text-primary'
                        : decisionOutcome === 'rejected'
                        ? 'text-error'
                        : 'text-secondary'
                    }`}
                  >
                    {decisionOutcome === 'approved'
                      ? 'Decision Executed: Approved'
                      : decisionOutcome === 'rejected'
                      ? 'Decision Executed: Rejected'
                      : 'Awaiting Human Decision'}
                  </p>
                  <p className="font-body-sm text-tertiary">Assigned to Lead Auditor Julian Hayes</p>
                  <span className="font-code-sm text-secondary font-semibold mt-0.5 block text-[10px]">
                    {decisionOutcome === 'approved' ? 'Complete' : 'In Progress (Active)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
