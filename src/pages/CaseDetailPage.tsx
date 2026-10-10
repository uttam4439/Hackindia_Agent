import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInvestigation } from '../context/InvestigationContext';

export const CaseDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { cases, selectedCase, approveRefund } = useInvestigation();

  const cleanId = (id || selectedCase.id).replace('#', '').toLowerCase();
  const currentCase =
    cases.find(
      (c) =>
        c.id.toLowerCase() === cleanId ||
        c.caseRef.replace('#', '').toLowerCase() === cleanId
    ) || selectedCase;

  const [isReevaluating, setIsReevaluating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleReevaluate = () => {
    setIsReevaluating(true);
    setTimeout(() => {
      setIsReevaluating(false);
      setSuccessToast('Case re-evaluation complete: 5/5 evidence sources re-verified. 94% confidence maintained.');
      setTimeout(() => setSuccessToast(null), 4000);
    }, 1200);
  };

  const handleApprove = () => {
    approveRefund(currentCase.id);
    setSuccessToast(`Refund of ${currentCase.claimAmountFormatted} authorized and logged to immutable audit trail!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="flex flex-col w-full gap-space-lg text-left pb-16">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-primary-container text-on-primary-container font-semibold shadow-2xl flex items-center gap-3 animate-fade-in border border-primary">
          <span className="material-symbols-outlined text-[22px]">task_alt</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* TOP BREADCRUMB & METADATA BAR */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <nav className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-xs sm:text-sm">
            <button
              onClick={() => navigate('/refund-investigations')}
              className="flex items-center gap-1 hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Refund Investigations</span>
            </button>
            <span className="text-outline-variant">/</span>
            <span className="font-code-sm text-xs sm:text-sm text-on-surface font-semibold">
              {currentCase.caseRef}
            </span>
          </nav>

          <div className="flex items-center flex-wrap gap-space-xs">
            <button
              onClick={() => alert(`Exporting complete evidence dossier for ${currentCase.caseRef}...`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs transition-all shadow-sm border border-surface-container cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">download</span>
              <span>Export Case Dossier</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs transition-all shadow-sm border border-surface-container cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">print</span>
              <span>Print Summary</span>
            </button>
            <button
              onClick={handleReevaluate}
              disabled={isReevaluating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-label-md text-xs transition-all cursor-pointer disabled:opacity-50"
              type="button"
            >
              <span className={`material-symbols-outlined text-[16px] text-primary ${isReevaluating ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{isReevaluating ? 'Re-evaluating...' : 'Re-evaluate Case'}</span>
            </button>
          </div>
        </div>

        {/* MAIN HEADER ROW */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg sm:p-space-xl shadow-sm border border-surface-container flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="font-headline-lg text-2xl sm:text-headline-lg font-bold text-on-surface tracking-tight">
                Refund Investigation
              </h1>
              <span className="font-code-sm text-xs text-on-surface-variant px-2.5 py-0.5 rounded-md bg-surface-container">
                {currentCase.caseRef}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary-fixed text-on-primary-container font-label-sm text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Investigation Complete
              </span>
            </div>
            <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">
              Automated policy arbitration and carrier telemetry reconciliation initiated for domestic scheduled trip interruption.
            </p>
          </div>

          {/* KEY METRICS BANNER STRIP */}
          <div className="flex items-center gap-space-md lg:gap-space-lg flex-wrap xl:flex-nowrap bg-surface-container-low p-space-md rounded-xl border border-surface-container">
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">Status</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded-full bg-primary-fixed text-on-primary-container font-label-sm text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Complete
              </span>
            </div>
            <div className="h-8 w-px bg-surface-container-highest hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">Risk Level</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-container font-label-sm text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {currentCase.riskLevel}
                </span>
              </div>
            </div>
            <div className="h-8 w-px bg-surface-container-highest hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">AI Confidence</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {currentCase.aiConfidence}%
                </span>
                <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              </div>
            </div>
            <div className="h-8 w-px bg-surface-container-highest hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">Evidence Strength</span>
              <span className="font-label-md text-xs sm:text-sm font-semibold text-primary mt-0.5">
                {currentCase.evidenceStrength}
              </span>
            </div>
            <div className="h-8 w-px bg-surface-container-highest hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">Recommended Action</span>
              <span className="font-headline-md text-sm sm:text-base font-bold text-on-surface">
                {currentCase.recommendedAction}
              </span>
            </div>
            <div className="h-8 w-px bg-surface-container-highest hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">Final Decision</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                {currentCase.decisionStatus === 'Approved' ? 'Approved' : 'Pending Human Approval'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WORKSPACE GRID: 65% MAIN / 35% SIDEBAR */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: MAIN INVESTIGATION WORKSPACE (Cols 1-8) */}
        <div className="xl:col-span-8 flex flex-col gap-space-lg">
          {/* SECTION 1: AI INVESTIGATION PIPELINE */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg sm:p-space-xl shadow-sm border border-surface-container flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">account_tree</span>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    AI Investigation Pipeline
                  </h2>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                  8 of 8 investigation steps completed
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-container font-code-sm text-xs font-semibold">
                Investigation Complete
              </span>
            </div>

            {/* PIPELINE STEPS TIMELINE */}
            <div className="relative flex flex-col gap-space-md pt-space-xs">
              {/* Continuous Track Line */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-surface-container"></div>

              {currentCase.steps.map((step, idx) => {
                const isFinal = idx === currentCase.steps.length - 1;
                return (
                  <div key={step.stepNumber} className="relative flex items-start gap-space-md">
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-body-sm shadow-sm shrink-0 ${
                        isFinal
                          ? 'bg-primary text-on-primary shadow-md'
                          : 'bg-primary-container text-on-primary-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isFinal ? 'stars' : 'check'}
                      </span>
                    </div>

                    <div
                      className={`flex-1 p-space-md rounded-xl flex flex-col gap-1 border ${
                        isFinal
                          ? 'bg-primary-fixed/20 border-primary-container/40 shadow-sm'
                          : 'bg-surface-container-low border-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider">
                            Step {step.stepNumber}
                          </span>
                          <span className="font-headline-sm text-sm sm:text-[15px] font-semibold text-on-surface">
                            {step.title}
                          </span>
                        </div>
                        <span className="font-code-sm text-[11px] text-on-surface-variant font-medium">
                          {step.statusLabel || 'Investigation Complete'}
                        </span>
                      </div>
                      <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">
                        {step.summary}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: VERIFIED EVIDENCE DOSSIER */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg sm:p-space-xl shadow-sm border border-surface-container flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">inventory_2</span>
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Verified Evidence & Source Artifacts
                  </h2>
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    Structured evidence corpus parsed from GDS, payment rail, and airline operational records
                  </p>
                </div>
              </div>
              <span className="font-label-sm text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-md">
                5 Core Artifacts
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {currentCase.artifacts.map((art) => (
                <div
                  key={art.id}
                  className={`bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between gap-space-sm hover:shadow-md transition-shadow border border-surface-container ${
                    art.isFullWidth ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-xs uppercase font-semibold text-on-surface-variant flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-[16px] ${art.iconColor}`}>
                        {art.icon}
                      </span>
                      {art.title}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-container font-label-sm text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span> Verified
                    </span>
                  </div>
                  <div className="font-body-sm text-xs sm:text-sm text-on-surface">{art.content}</div>
                  <div className="flex items-center justify-between pt-space-xs text-on-surface-variant font-code-sm text-[11px] border-t border-surface-container-high/60">
                    <span>{art.source}</span>
                    <span>{art.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR DECISION & SUMMARY (Cols 9-12) */}
        <div className="xl:col-span-4 flex flex-col gap-space-lg">
          {/* CARD 1: INVESTIGATION SUMMARY */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Investigation Summary</h2>
              <span className="w-3 h-3 rounded-full bg-primary-container animate-pulse"></span>
            </div>

            {/* METRIC DATA TABLE */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between py-1.5 bg-surface-container-low px-space-sm rounded-lg border border-surface-container">
                <span className="font-body-sm text-xs text-on-surface-variant font-medium">Risk Level</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-container font-label-sm text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {currentCase.riskLevel}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 bg-surface-container-low px-space-sm rounded-lg border border-surface-container">
                <span className="font-body-sm text-xs text-on-surface-variant font-medium">AI Assessment Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-surface-container h-2 rounded-full overflow-hidden">
                    <div className="bg-primary-container h-full rounded-full" style={{ width: `${currentCase.aiConfidence}%` }}></div>
                  </div>
                  <span className="font-code-sm text-xs font-bold text-on-surface">{currentCase.aiConfidence}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5 bg-surface-container-low px-space-sm rounded-lg border border-surface-container">
                <span className="font-body-sm text-xs text-on-surface-variant font-medium">Evidence Strength</span>
                <span className="font-label-md text-xs font-semibold text-primary">{currentCase.evidenceStrength}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 bg-surface-container-low px-space-sm rounded-lg border border-surface-container">
                <span className="font-body-sm text-xs text-on-surface-variant font-medium">Recommended Action</span>
                <span className="font-label-md text-xs font-bold text-on-surface">{currentCase.recommendedAction}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 bg-surface-container-low px-space-sm rounded-lg border border-surface-container">
                <span className="font-body-sm text-xs text-on-surface-variant font-medium">Final Decision</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  {currentCase.decisionStatus === 'Approved' ? 'Approved' : 'Pending Human Approval'}
                </span>
              </div>
            </div>

            {/* VERIFIED EVIDENCE CHECKLIST */}
            <div className="flex flex-col gap-space-xs pt-1">
              <span className="font-label-sm text-[11px] uppercase font-semibold text-on-surface-variant tracking-wider">
                Verified Evidence vs. AI Recommendation
              </span>
              <ul className="flex flex-col gap-2 mt-1">
                <li className="flex items-start gap-2 text-xs font-body-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px] shrink-0">check_circle</span>
                  <span>5 of 5 Core Artifacts Verified with Carrier & GDS</span>
                </li>
                <li className="flex items-start gap-2 text-xs font-body-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px] shrink-0">check_circle</span>
                  <span>Zero Discrepancies or Prior Dispute Signals</span>
                </li>
                <li className="flex items-start gap-2 text-xs font-body-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px] shrink-0">check_circle</span>
                  <span>Policy supports full refund</span>
                </li>
              </ul>
            </div>

            <div className="bg-surface-container-low p-space-sm rounded-lg border border-surface-container">
              <p className="font-body-sm text-xs text-on-surface-variant italic flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-tertiary shrink-0 mt-0.5">info</span>
                <span>AI recommendations are based on available evidence and require human authorization.</span>
              </p>
            </div>
          </div>

          {/* CARD 2: AI REASONING PANEL */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
                <h2 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface">AI Reasoning</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] font-medium">
                Agent Synthesis
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-label-sm text-[11px] uppercase font-semibold text-on-surface-variant tracking-wider">
                Agent interpretation of verified evidence
              </span>
              <p className="font-body-sm text-xs sm:text-sm text-on-surface leading-relaxed bg-surface-container-low p-space-sm rounded-xl border border-surface-container">
                {currentCase.synthesis}
              </p>
            </div>
          </div>

          {/* CARD 3: HUMAN REVIEW & DECISION */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-md">
            <div className="flex items-center gap-2 pb-space-xs border-b border-surface-container">
              <span className="material-symbols-outlined text-secondary text-[22px]">verified_user</span>
              <h2 className="font-headline-sm text-base font-bold text-on-surface">Human Review & Decision</h2>
            </div>

            <div className="flex flex-col gap-space-xs bg-surface-container-low p-space-sm rounded-xl border border-surface-container">
              <div className="flex items-center justify-between py-1 text-xs">
                <span className="text-on-surface-variant font-medium">Recommended Action:</span>
                <span className="font-bold text-on-surface">{currentCase.recommendedAction}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-xs">
                <span className="text-on-surface-variant font-medium">Decision Status:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-container font-label-sm text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {currentCase.decisionStatus === 'Approved' ? 'Approved by Auditor' : 'Agent Recommendation Ready'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 text-xs">
                <span className="text-on-surface-variant font-medium">Human Review Required:</span>
                <span className="font-label-sm text-xs font-semibold text-secondary px-2 py-0.5 rounded bg-surface-container">
                  Yes
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs pt-space-xs">
              <button
                onClick={handleApprove}
                className="w-full py-2.5 px-4 rounded-full bg-primary-container text-on-primary-container hover:bg-primary-fixed-dim font-headline-sm text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>Approve Refund • {currentCase.claimAmountFormatted}</span>
              </button>
              <button
                onClick={() => navigate('/reviews')}
                className="w-full py-2.5 px-4 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 border border-surface-container cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person_search</span>
                <span>Open Full Review & Approval Console</span>
              </button>
            </div>

            <div className="bg-surface-container-low p-space-sm rounded-lg border border-surface-container">
              <p className="font-body-sm text-xs text-on-surface-variant">
                <strong className="text-on-surface font-semibold">Authorization Notice:</strong> The AI investigates evidence and recommends an action, but does not independently release funds; financial authorization rests with the human reviewer.
              </p>
            </div>

            <div className="pt-space-xs flex flex-col gap-1 border-t border-surface-container text-xs">
              <span className="font-code-sm text-[11px] text-on-surface-variant">
                Assigned Auditor: <strong className="text-on-surface font-semibold">Julian Hayes</strong> (Lead Auditor)
              </span>
              <span className="font-code-sm text-[11px] text-outline">Action will be logged to immutable audit trail.</span>
            </div>
          </div>

          {/* CARD 4: CASE ACTIVITY & AUDIT LOG */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface">Case Activity & Audit Log</h3>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">history</span>
            </div>
            <div className="flex flex-col gap-space-sm text-body-sm">
              {currentCase.auditLog.map((log) => (
                <div key={log.id} className="flex items-start gap-space-sm pb-space-xs">
                  <span className={`w-2 h-2 rounded-full ${log.dotColor} mt-1.5 shrink-0`}></span>
                  <div className="flex flex-col text-xs">
                    <span className="font-code-sm text-[11px] text-on-surface-variant font-medium">{log.time}</span>
                    <span className="font-body-sm text-on-surface font-medium">{log.title}</span>
                    {log.description && (
                      <span className="text-[11px] text-on-surface-variant mt-0.5">{log.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
