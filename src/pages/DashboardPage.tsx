import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvestigation } from '../context/InvestigationContext';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { ReviewerHeader } from '../components/layout/ReviewerHeader';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { cases, selectCaseById, timeframe, setTimeframe, approveRefund } = useInvestigation();

  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'review' | 'awaiting' | 'flagged'>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Timeframe cycle options
  const timeframeOptions = ['Last 7 Days', 'Last 30 Days', 'Current Quarter', 'Year to Date'];
  const handleCycleTimeframe = () => {
    const currentIndex = timeframeOptions.indexOf(timeframe);
    const nextIndex = (currentIndex + 1) % timeframeOptions.length;
    setTimeframe(timeframeOptions[nextIndex]);
  };

  const handleInspectCase = (id: string) => {
    selectCaseById(id);
    navigate(`/refund-investigations/${id}`);
  };

  const handleReviewHighImpact = (id: string) => {
    selectCaseById(id);
    navigate(`/reviews`);
  };

  const handleQuickApprove = (id: string) => {
    approveRefund(id);
    setActionSuccessMsg(`Case #${id} approved! Payout authorization emitted.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Dynamic Metrics computed directly from real database cases
  const activeCount = cases.filter(c =>
    ['Under Human Review', 'Pending Human Approval', 'Ready for Payout', 'Awaiting Carrier Evidence', 'Audit In Progress'].includes(c.decisionStatus)
  ).length;

  const pendingHumanReviewCount = cases.filter(c =>
    c.humanReviewRequired || c.decisionStatus === 'Under Human Review' || c.decisionStatus === 'Pending Human Approval'
  ).length;

  const highRiskCases = cases.filter(c => c.riskLevel === 'High Risk');
  const highRiskCount = highRiskCases.length;
  const highRiskExposure = highRiskCases.reduce((sum, c) => sum + (c.claimAmount || 0), 0);

  const approvedCases = cases.filter(c => c.decisionStatus === 'Approved' || c.decisionStatus === 'Disbursed');
  const recoveredApprovedAmount = approvedCases.reduce((sum, c) => sum + (c.claimAmount || 0), 0);
  const claimsDisbursedCount = approvedCases.length;

  const carrierEvidenceCount = cases.filter(c => c.decisionStatus === 'Awaiting Carrier Evidence').length;
  const flaggedRejectedCount = cases.filter(c => c.decisionStatus === 'Flagged' || c.decisionStatus === 'Rejected').length;

  const lowRiskCount = cases.filter(c => c.riskLevel === 'Low Risk').length;
  const mediumRiskCount = cases.filter(c => c.riskLevel === 'Medium Risk').length;
  const insufficientCount = cases.filter(c => c.riskLevel === 'Insufficient Evidence').length;

  const lowPct = cases.length > 0 ? Math.round((lowRiskCount / cases.length) * 100) : 0;
  const medPct = cases.length > 0 ? Math.round((mediumRiskCount / cases.length) * 100) : 0;
  const highPct = cases.length > 0 ? Math.round((highRiskCount / cases.length) * 100) : 0;
  const insuffPct = cases.length > 0 ? Math.max(0, 100 - lowPct - medPct - highPct) : 0;

  const humanReviewCases = cases.filter(
    (c) =>
      c.humanReviewRequired ||
      c.decisionStatus === 'Under Human Review' ||
      c.decisionStatus === 'Pending Human Approval' ||
      c.isHighImpact
  );

  const activeSpotlightCase = cases[0] || null;

  // Filter investigations
  const filteredInvestigations = cases.filter((c) => {
    const matchesSearch =
      c.caseRef.toLowerCase().includes(tableSearch.toLowerCase()) ||
      c.pnr.toLowerCase().includes(tableSearch.toLowerCase()) ||
      c.traveler.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
      c.carrier.name.toLowerCase().includes(tableSearch.toLowerCase());

    const matchesRisk =
      riskFilter === 'all' ||
      (riskFilter === 'low' && c.riskLevel === 'Low Risk') ||
      (riskFilter === 'medium' && c.riskLevel === 'Medium Risk') ||
      (riskFilter === 'high' && c.riskLevel === 'High Risk');

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'approved' && (c.decisionStatus === 'Approved' || c.decisionStatus === 'Disbursed')) ||
      (activeTab === 'review' && (c.decisionStatus === 'Under Human Review' || c.decisionStatus === 'Pending Human Approval')) ||
      (activeTab === 'awaiting' && c.decisionStatus === 'Awaiting Carrier Evidence') ||
      (activeTab === 'flagged' && (c.decisionStatus === 'Flagged' || c.decisionStatus === 'Rejected'));

    return matchesSearch && matchesRisk && matchesTab;
  });

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <ReviewerHeader />
      <div className="flex-1 w-full site-container py-6 flex flex-col gap-space-xl pb-16">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-primary-container text-on-primary-container font-semibold shadow-2xl flex items-center gap-3 animate-fade-in border border-primary">
          <span className="material-symbols-outlined text-[22px]">task_alt</span>
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Navigation & Dashboard Control Row */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md text-left">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#20B8B0]/15 text-[#006D77] border border-[#20B8B0]/30 font-label-sm text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#20B8B0] animate-pulse"></span>
              AI Risk Engine Active
            </span>
            <span className="font-code-sm text-xs text-gray-500 font-medium">
              Multi-Agent Arbitrator v2.4
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl text-[#0d283e] tracking-tight font-extrabold font-['Plus_Jakarta_Sans']">
            Refund Investigation & Risk Console
          </h1>
          <p className="font-body-md text-sm sm:text-body-md text-gray-600">
            Autonomous dispute verification, fraud & statutory risk management, and agent-led payout arbitration.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-space-sm">
          {/* Timeframe Dropdown */}
          <button
            onClick={handleCycleTimeframe}
            className="flex items-center gap-space-xs bg-white text-[#0d283e] font-label-md text-xs sm:text-sm font-semibold px-space-md py-2.5 rounded-full shadow-xs hover:bg-[#f0f5f7] transition-all border border-[#006D77]/20 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#006D77]">calendar_today</span>
            <span>{timeframe}</span>
            <span className="material-symbols-outlined text-[16px] text-gray-500">expand_more</span>
          </button>

          {/* Export Audit Log Button */}
          <button
            onClick={() => {
              alert('Exporting verified audit trail for active session...');
            }}
            className="flex items-center gap-space-xs bg-white text-[#0d283e] font-label-md text-xs sm:text-sm font-semibold px-space-md py-2.5 rounded-full shadow-xs hover:bg-[#f0f5f7] transition-all border border-[#006D77]/20 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-gray-600">ios_share</span>
            <span>Export Audit Log</span>
          </button>

          {/* New Investigation Button */}
          <button
            onClick={() => navigate('/reviewer')}
            className="flex items-center gap-space-xs bg-gradient-to-r from-[#006D77] to-[#20B8B0] hover:from-[#005a63] hover:to-[#1aa39b] text-white font-label-md text-xs sm:text-sm font-bold px-space-lg py-2.5 rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Investigation</span>
          </button>
        </div>
      </section>

      {/* 4-Metric Grid Architecture */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md text-left">
        {/* Metric 1 */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">Active Investigations</span>
            <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">policy</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">{activeCount}</span>
            <span className="font-body-sm text-xs text-on-surface-variant mt-1">{pendingHumanReviewCount} pending human review</span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Resolution Pace</span>
            <span className="text-primary font-semibold">2.4 hrs avg</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">High-Risk Cases</span>
            <div className="w-9 h-9 rounded-xl bg-error-container flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">{highRiskCount}</span>
            <span className="font-body-sm text-xs text-error font-medium mt-1">₹{highRiskExposure.toLocaleString('en-IN')} exposure under review</span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Risk Signals Detected</span>
            <span className="font-medium text-on-surface font-semibold">{highRiskCount} Active Hold{highRiskCount === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">Recovered / Approved</span>
            <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary font-semibold">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">₹{recoveredApprovedAmount.toLocaleString('en-IN')}</span>
            <span className="font-body-sm text-xs text-primary font-medium mt-1">
              {cases.length > 0 ? Math.round((approvedCases.length / cases.length) * 100) : 0}% automated resolution rate
            </span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Statutory Claims Disbursed</span>
            <span className="font-medium text-on-surface">{claimsDisbursedCount} claims</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">Total Evaluated</span>
            <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-[20px]">fact_check</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">{cases.length}</span>
            <span className="font-body-sm text-xs text-on-surface-variant mt-1">Claims audited across air, rail & bus</span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Audit Coverage</span>
            <span className="text-primary font-semibold">100% Monitored</span>
          </div>
        </div>
      </section>

      {/* Dual Engine Core: Spotlight Dossier & Radar Intelligence */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start text-left">
        {/* Left Column (8 cols): Deep-Dive AI Agent Pipeline */}
        <div className="xl:col-span-8 bg-surface-container-lowest rounded-3xl p-space-lg sm:p-space-xl shadow-sm border border-surface-container flex flex-col gap-space-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container shrink-0">
                <span className="material-symbols-outlined text-[22px]">psychology</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Deep-Dive AI Agent Investigation Pipeline
                  </h3>
                  {activeSpotlightCase && (
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed/40 text-on-primary-fixed-variant font-code-sm text-xs font-semibold">
                      Case #{activeSpotlightCase.caseRef.replace('#', '') || activeSpotlightCase.id}
                    </span>
                  )}
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                  8-step AI-assisted investigation of traveler disruption, policy entitlement, and payout clearance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-xs font-bold border border-surface-container">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                Auto-Evaluating
              </span>
            </div>
          </div>

          {!activeSpotlightCase ? (
            <div className="p-8 text-center text-on-surface-variant bg-surface-container-low rounded-2xl border border-surface-container space-y-2">
              <span className="material-symbols-outlined text-[36px] text-gray-400 block">assignment</span>
              <p className="font-semibold text-sm text-on-surface">No active refund investigations in pipeline</p>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                When refund claims are submitted by travelers, the 8-step AI dispute engine will analyze and display them here.
              </p>
            </div>
          ) : (
            <>
              {/* 8-Step Mini Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
                <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-1 border border-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-code-sm text-[11px] text-on-surface-variant font-semibold">01. Request</span>
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                  </div>
                  <span className="font-label-md text-xs font-semibold text-on-surface">Request Understanding</span>
                  <p className="text-[11px] text-on-surface-variant">{activeSpotlightCase.carrier.name} claim ingested</p>
                </div>

                <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-1 border border-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-code-sm text-[11px] text-on-surface-variant font-semibold">02. Payment</span>
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                  </div>
                  <span className="font-label-md text-xs font-semibold text-on-surface">Transaction Check</span>
                  <p className="text-[11px] text-on-surface-variant">{activeSpotlightCase.claimAmountFormatted} fare verified</p>
                </div>

                <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-1 border border-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-code-sm text-[11px] text-on-surface-variant font-semibold">03. Customer</span>
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                  </div>
                  <span className="font-label-md text-xs font-semibold text-on-surface">Customer Profile</span>
                  <p className="text-[11px] text-on-surface-variant">{activeSpotlightCase.traveler.name}</p>
                </div>

                <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-1 border border-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-code-sm text-[11px] text-on-surface-variant font-semibold">04. Booking</span>
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                  </div>
                  <span className="font-label-md text-xs font-semibold text-on-surface">Booking & Fare Rules</span>
                  <p className="text-[11px] text-on-surface-variant">PNR: {activeSpotlightCase.pnr}</p>
                </div>

                <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-1 border border-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-code-sm text-[11px] text-on-surface-variant font-semibold">05. Policy</span>
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                  </div>
                  <span className="font-label-md text-xs font-semibold text-on-surface">Policy Verification</span>
                  <p className="text-[11px] text-on-surface-variant">DGCA & Carrier Rules</p>
                </div>

                <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-1 border border-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-code-sm text-[11px] text-on-surface-variant font-semibold">06. Evidence</span>
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                  </div>
                  <span className="font-label-md text-xs font-semibold text-on-surface">Evidence Analysis</span>
                  <p className="text-[11px] text-on-surface-variant">{activeSpotlightCase.evidenceStrength || 'Telemetric audit'}</p>
                </div>

                <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-1 border border-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-code-sm text-[11px] text-on-surface-variant font-semibold">07. Risk</span>
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                  </div>
                  <span className="font-label-md text-xs font-semibold text-on-surface">Risk Assessment</span>
                  <p className="text-[11px] text-on-surface-variant">{activeSpotlightCase.riskLevel} ({activeSpotlightCase.aiConfidence}% Conf.)</p>
                </div>

                <div className="p-space-sm rounded-xl bg-primary-container/20 flex flex-col gap-1 border border-primary-container/40">
                  <div className="flex items-center justify-between">
                    <span className="font-code-sm text-[11px] text-primary font-bold">08. Action</span>
                    <span className="material-symbols-outlined text-[16px] text-primary animate-pulse">pending</span>
                  </div>
                  <span className="font-label-md text-xs font-bold text-on-surface">Action Recommendation</span>
                  <div className="flex flex-col">
                    <p className="text-[11px] text-primary font-semibold">{activeSpotlightCase.recommendedActionLabel || activeSpotlightCase.recommendedAction}</p>
                    <span className="text-[10px] text-on-surface-variant">{activeSpotlightCase.decisionStatus}</span>
                  </div>
                </div>
              </div>

              {/* Obsidian Footer Callout */}
              <div className="p-space-md rounded-2xl bg-inverse-surface text-inverse-on-surface flex flex-col sm:flex-row items-center justify-between gap-space-md border border-white/10">
                <div className="flex items-center gap-space-md">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold shrink-0">
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-label-md text-sm font-bold text-surface-container-lowest">
                        Case #{activeSpotlightCase.caseRef.replace('#', '') || activeSpotlightCase.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-code-sm text-[11px] font-semibold">
                        {activeSpotlightCase.riskLevel}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest/15 text-surface-container-lowest font-code-sm text-[11px]">
                        AI Confidence: {activeSpotlightCase.aiConfidence}%
                      </span>
                    </div>
                    <p className="text-xs text-tertiary-fixed-dim mt-0.5">
                      Recommendation: {activeSpotlightCase.recommendedAction} ({activeSpotlightCase.decisionStatus})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm w-full sm:w-auto">
                  <button
                    onClick={() => handleInspectCase(activeSpotlightCase.id)}
                    className="flex-1 sm:flex-none px-space-md py-2 rounded-full bg-surface-container-lowest/15 hover:bg-surface-container-lowest/25 text-surface-container-lowest font-label-md text-xs transition-colors whitespace-nowrap cursor-pointer"
                    type="button"
                  >
                    View Investigation
                  </button>
                  {activeSpotlightCase.decisionStatus === 'Ready for Payout' && (
                    <button
                      onClick={() => handleQuickApprove(activeSpotlightCase.id)}
                      className="flex-1 sm:flex-none px-space-md py-2 rounded-full bg-primary-container hover:bg-primary-fixed-dim text-on-primary-container font-label-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-sm"
                      type="button"
                    >
                      Approve Release
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column (4 cols): Risk Distribution */}
        <div className="xl:col-span-4 bg-surface-container-lowest rounded-3xl p-space-lg sm:p-space-xl shadow-sm border border-surface-container flex flex-col justify-between gap-space-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Risk Distribution</h3>
              <p className="font-label-sm text-xs text-on-surface-variant">{cases.length} investigations in evaluation queue</p>
            </div>
            <span className="font-label-sm text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant border border-surface-container">
              Active Batch
            </span>
          </div>

          {/* Stacked Risk Bar */}
          <div className="w-full flex h-3.5 rounded-full overflow-hidden gap-1 p-0.5 bg-surface-container-low">
            <div className="h-full bg-primary rounded-l-full" style={{ width: `${lowPct}%` }} title={`Low Risk: ${lowPct}%`}></div>
            <div className="h-full bg-secondary-container" style={{ width: `${medPct}%` }} title={`Medium Risk: ${medPct}%`}></div>
            <div className="h-full bg-error" style={{ width: `${highPct}%` }} title={`High Risk: ${highPct}%`}></div>
            <div className="h-full bg-surface-container-highest rounded-r-full" style={{ width: `${insuffPct}%` }} title={`Insufficient Evidence: ${insuffPct}%`}></div>
          </div>

          {/* Risk Detail Cards */}
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low border border-surface-container">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0"></span>
                <div>
                  <span className="font-label-md text-xs font-semibold text-on-surface">Low Risk</span>
                  <p className="text-[11px] text-on-surface-variant">Fast-track automatic approval</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-label-md text-xs font-bold text-on-surface">{lowPct}%</span>
                <p className="text-[11px] text-on-surface-variant">{lowRiskCount} cases</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low border border-surface-container">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-container shrink-0"></span>
                <div>
                  <span className="font-label-md text-xs font-semibold text-on-surface">Medium Risk</span>
                  <p className="text-[11px] text-on-surface-variant">Policy compliance check</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-label-md text-xs font-bold text-on-surface">{medPct}%</span>
                <p className="text-[11px] text-on-surface-variant">{mediumRiskCount} cases</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low border border-surface-container">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-error shrink-0"></span>
                <div>
                  <span className="font-label-md text-xs font-semibold text-on-surface">High Risk</span>
                  <p className="text-[11px] text-on-surface-variant">Discrepancy / carrier dispute</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-label-md text-xs font-bold text-on-surface">{highPct}%</span>
                <p className="text-[11px] text-on-surface-variant">{highRiskCount} cases</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low border border-surface-container">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-container-highest shrink-0"></span>
                <div>
                  <span className="font-label-md text-xs font-semibold text-on-surface">Insufficient Evidence</span>
                  <p className="text-[11px] text-on-surface-variant">Missing cancellation proof</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-label-md text-xs font-bold text-on-surface">{insuffPct}%</span>
                <p className="text-[11px] text-on-surface-variant">{insufficientCount} cases</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Requires Human Review Table (High-Impact) */}
      <section className="bg-surface-container-lowest rounded-3xl p-space-lg sm:p-space-xl shadow-sm border border-surface-container flex flex-col gap-space-md text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-xl bg-error-container flex items-center justify-center text-error font-bold">
              <span className="material-symbols-outlined text-[20px]">assignment_late</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Requires Human Review</h3>
                <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[11px] font-bold">
                  {humanReviewCases.length} Case{humanReviewCases.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                AI investigates and flags anomalies — human auditors authorize high-impact decisions.
              </p>
            </div>
          </div>
          <span className="font-label-sm text-xs text-on-surface-variant font-medium bg-surface-container-low px-3 py-1 rounded-full border border-surface-container">
            SLA: 2 hours remaining
          </span>
        </div>

        {/* Human Review Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-xs sm:text-sm">
            <thead>
              <tr className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider bg-surface-container-low rounded-xl">
                <th className="py-space-sm px-space-md rounded-l-xl">Case ID</th>
                <th className="py-space-sm px-space-md">Amount at Risk</th>
                <th className="py-space-sm px-space-md">Risk Level</th>
                <th className="py-space-sm px-space-md">AI Confidence</th>
                <th className="py-space-sm px-space-md">Reason / Evidence Summary</th>
                <th className="py-space-sm px-space-md rounded-r-xl text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {humanReviewCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[28px] text-gray-400 mb-1 block">
                      task_alt
                    </span>
                    <p className="font-semibold text-xs text-on-surface">No cases currently require human review</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      When an AI investigation flags anomalies or exceeds policy risk limits, it will appear here for auditor sign-off.
                    </p>
                  </td>
                </tr>
              ) : (
                humanReviewCases.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-space-md px-space-md">
                      <div className="flex flex-col">
                        <span className="font-semibold text-on-surface">#{c.caseRef.replace('#', '') || c.id}</span>
                        <span className="text-xs text-on-surface-variant">{c.traveler.tier || c.traveler.name}</span>
                      </div>
                    </td>
                    <td className="py-space-md px-space-md font-semibold text-on-surface">{c.claimAmountFormatted}</td>
                    <td className="py-space-md px-space-md">
                      <RiskBadge level={c.riskLevel} size="sm" />
                    </td>
                    <td className="py-space-md px-space-md font-code-sm text-xs text-on-surface-variant">
                      {c.aiConfidence}% Confidence
                    </td>
                    <td className="py-space-md px-space-md">
                      <span className="text-xs text-on-surface-variant line-clamp-2">
                        {c.reasonSummary || c.synthesis}
                      </span>
                    </td>
                    <td className="py-space-md px-space-md text-right">
                      <button
                        onClick={() => handleReviewHighImpact(c.id)}
                        className="px-space-md py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-md text-xs font-semibold hover:shadow transition-all cursor-pointer"
                        type="button"
                      >
                        Review Case
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: All Refund Investigations */}
      <section className="bg-surface-container-lowest rounded-3xl p-space-lg sm:p-space-xl shadow-sm border border-surface-container flex flex-col gap-space-lg text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div>
            <h3 className="font-headline-md text-xl sm:text-headline-md font-bold text-on-surface tracking-tight">
              All Refund Investigations
            </h3>
            <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant">
              Complete ledger of automated claims reconciliation, statutory payouts, and dispute findings
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            {/* Filter Input */}
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-2 rounded-full min-w-[220px] border border-surface-container">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
              <input
                className="bg-transparent font-body-sm text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none w-full"
                placeholder="Filter investigation ID or traveler..."
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>

            {/* Risk Dropdown Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-surface-container-low border border-surface-container px-space-md py-2 rounded-full font-body-sm text-xs text-on-surface focus:outline-none cursor-pointer"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk Only</option>
              <option value="medium">Medium Risk Only</option>
              <option value="high">High Risk Only</option>
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-space-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-[#006D77] to-[#20B8B0] text-white shadow-xs'
                : 'bg-[#f0f5f7] hover:bg-[#e7eff2] text-[#0d283e]'
            }`}
            type="button"
          >
            All ({cases.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-gradient-to-r from-[#006D77] to-[#20B8B0] text-white shadow-xs'
                : 'bg-[#f0f5f7] hover:bg-[#e7eff2] text-[#0d283e]'
            }`}
            type="button"
          >
            Approved & Disbursed ({claimsDisbursedCount})
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'review'
                ? 'bg-gradient-to-r from-[#006D77] to-[#20B8B0] text-white shadow-xs'
                : 'bg-[#f0f5f7] hover:bg-[#e7eff2] text-[#0d283e]'
            }`}
            type="button"
          >
            Under Human Review ({pendingHumanReviewCount})
          </button>
          <button
            onClick={() => setActiveTab('awaiting')}
            className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'awaiting'
                ? 'bg-gradient-to-r from-[#006D77] to-[#20B8B0] text-white shadow-xs'
                : 'bg-[#f0f5f7] hover:bg-[#e7eff2] text-[#0d283e]'
            }`}
            type="button"
          >
            Awaiting Carrier Evidence ({carrierEvidenceCount})
          </button>
          <button
            onClick={() => setActiveTab('flagged')}
            className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'flagged'
                ? 'bg-gradient-to-r from-[#006D77] to-[#20B8B0] text-white shadow-xs'
                : 'bg-[#f0f5f7] hover:bg-[#e7eff2] text-[#0d283e]'
            }`}
            type="button"
          >
            Flagged / Rejected ({flaggedRejectedCount})
          </button>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-xs sm:text-sm">
            <thead>
              <tr className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider bg-surface-container-low rounded-xl">
                <th className="py-space-md px-space-md rounded-l-xl">Investigation ID / PNR</th>
                <th className="py-space-md px-space-md">Traveler</th>
                <th className="py-space-md px-space-md">Carrier & Journey</th>
                <th className="py-space-md px-space-md">Claim Amount</th>
                <th className="py-space-md px-space-md">Risk Level</th>
                <th className="py-space-md px-space-md">AI Confidence</th>
                <th className="py-space-md px-space-md">Status</th>
                <th className="py-space-md px-space-md rounded-r-xl text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {filteredInvestigations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[36px] text-gray-400 mb-2 block">
                      inbox
                    </span>
                    <p className="font-semibold text-xs text-on-surface">No refund investigations found</p>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      Submitted refund cases will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvestigations.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-space-md px-space-md">
                      <button
                        onClick={() => handleInspectCase(item.id)}
                        className="flex flex-col text-left group cursor-pointer"
                      >
                        <span className="font-headline-sm text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                          {item.caseRef}
                        </span>
                        <span className="font-code-sm text-[11px] text-on-surface-variant">PNR: {item.pnr}</span>
                      </button>
                    </td>
                    <td className="py-space-md px-space-md">
                      <div className="flex items-center gap-space-sm">
                        <div
                          className={`w-8 h-8 rounded-full ${item.traveler.color || 'bg-primary-container text-on-primary-container'} font-label-sm text-xs flex items-center justify-center font-bold`}
                        >
                          {item.traveler.initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-md text-xs font-semibold text-on-surface">
                            {item.traveler.name}
                          </span>
                          <span className="font-label-sm text-[11px] text-on-surface-variant">
                            {item.traveler.tier}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-space-md px-space-md">
                      <div className="flex items-center gap-space-xs">
                        <span className="p-1 rounded-md bg-surface-container-high text-on-surface">
                          <span className="material-symbols-outlined text-[16px]">
                            {item.carrier.type === 'train' ? 'train' : 'flight'}
                          </span>
                        </span>
                        <span className="font-medium text-on-surface text-xs sm:text-sm">
                          {item.carrier.name} ({item.carrier.route})
                        </span>
                      </div>
                    </td>
                    <td className="py-space-md px-space-md">
                      <span className="font-semibold text-on-surface">{item.claimAmountFormatted}</span>
                    </td>
                    <td className="py-space-md px-space-md">
                      <RiskBadge level={item.riskLevel} size="sm" />
                    </td>
                    <td className="py-space-md px-space-md">
                      <span className="font-code-sm text-xs text-primary font-bold">{item.aiConfidence}%</span>
                    </td>
                    <td className="py-space-md px-space-md">
                      <StatusBadge status={item.decisionStatus} size="sm" />
                    </td>
                    <td className="py-space-md px-space-md text-right">
                      <button
                        onClick={() => handleInspectCase(item.id)}
                        className="px-space-md py-1.5 rounded-full bg-surface-container hover:bg-primary-container hover:text-on-primary-container text-on-surface font-label-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                        type="button"
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-xs border-t border-surface-container">
          <span className="font-body-sm text-xs text-on-surface-variant">
            Showing <strong className="text-on-surface font-semibold">1–{filteredInvestigations.length}</strong> of {cases.length} active investigations
          </span>
          <div className="flex items-center gap-space-xs">
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40"
              disabled
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-xs font-bold">
              1
            </span>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};
