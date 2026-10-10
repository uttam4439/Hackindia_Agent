import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvestigation } from '../context/InvestigationContext';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';

export const RefundInvestigationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { cases, selectCaseById, approveRefund } = useInvestigation();

  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'review' | 'awaiting' | 'flagged'>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const handleInspectCase = (id: string) => {
    selectCaseById(id);
    navigate(`/refund-investigations/${id}`);
  };

  const handleReviewHighImpact = (id: string) => {
    selectCaseById(id);
    navigate('/reviews');
  };

  const handleQuickApprove = (id: string) => {
    approveRefund(id);
    setActionSuccessMsg(`Case #${id} approved! Payout authorization emitted.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const filteredInvestigations = cases.filter((c) => {
    const matchesSearch =
      c.caseRef.toLowerCase().includes(tableSearch.toLowerCase()) ||
      c.pnr.toLowerCase().includes(tableSearch.toLowerCase()) ||
      c.traveler.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
      c.carrier.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
      c.carrier.route.toLowerCase().includes(tableSearch.toLowerCase());

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
    <div className="flex flex-col w-full gap-space-xl pb-16 text-left">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-primary-container text-on-primary-container font-semibold shadow-2xl flex items-center gap-3 animate-fade-in border border-primary">
          <span className="material-symbols-outlined text-[22px]">task_alt</span>
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Header & Breadcrumb Bar */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
              Autonomous Multi-Agent Audit Active
            </span>
            <span className="font-code-sm text-xs text-on-surface-variant/70">
              DGCA & EC 261 Compliance Engine
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight font-bold">
            Refund Investigations Ledger
          </h1>
          <p className="font-body-md text-sm sm:text-body-md text-on-surface-variant">
            Complete audit ledger of statutory travel claims, automated policy arbitration, and payout determinations.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-space-sm">
          <button
            onClick={() => alert('Exporting complete refund investigations audit trail...')}
            className="flex items-center gap-space-xs bg-surface-container-lowest text-on-surface font-label-md text-xs sm:text-sm px-space-md py-2.5 rounded-full shadow-sm hover:bg-surface-container-low transition-colors border border-surface-container cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">ios_share</span>
            <span>Export Audit Trail</span>
          </button>

          <button
            onClick={() => handleInspectCase('AT-9842')}
            className="flex items-center gap-space-xs bg-primary-container text-on-primary-container font-label-md text-xs sm:text-sm font-bold px-space-lg py-2.5 rounded-full shadow-sm hover:shadow-md hover:bg-primary-fixed-dim transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Investigation</span>
          </button>
        </div>
      </section>

      {/* 4-Metric Investigation Summary Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md text-left">
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">Active Queue</span>
            <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">policy</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">42</span>
            <span className="font-body-sm text-xs text-on-surface-variant mt-1">Claims currently under arbitration</span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Avg Processing Time</span>
            <span className="text-primary font-semibold">2.4 hrs</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">Approved & Disbursed</span>
            <div className="w-9 h-9 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary font-semibold">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">28</span>
            <span className="font-body-sm text-xs text-primary font-medium mt-1">₹42.5L statutory payouts cleared</span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Auto-Approval Rate</span>
            <span className="text-primary font-semibold">98.2%</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">Under Human Review</span>
            <div className="w-9 h-9 rounded-xl bg-error-container flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[20px]">assignment_late</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">6</span>
            <span className="font-body-sm text-xs text-error font-medium mt-1">High-impact / anomaly holds</span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Review SLA</span>
            <span className="text-error font-semibold">2 hrs remaining</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">Carrier Evidence Pending</span>
            <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">5</span>
            <span className="font-body-sm text-xs text-on-surface-variant mt-1">Awaiting airline ops logs</span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Carrier Inquiries</span>
            <span className="text-on-surface font-semibold">5 Dispatched</span>
          </div>
        </div>
      </section>

      {/* Main Ledger Table Card */}
      <section className="bg-surface-container-lowest rounded-3xl p-space-lg sm:p-space-xl shadow-sm border border-surface-container flex flex-col gap-space-lg text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div>
            <h3 className="font-headline-md text-xl sm:text-headline-md font-bold text-on-surface tracking-tight">
              All Investigation Cases
            </h3>
            <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant">
              Inspect AI evidence synthesis, policy entitlement, and decision authorization for every case
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            {/* Filter Input */}
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-2 rounded-full min-w-[240px] border border-surface-container">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
              <input
                className="bg-transparent font-body-sm text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none w-full"
                placeholder="Filter case ID, PNR, traveler..."
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>

            {/* Risk Dropdown */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-surface-container-low text-on-surface font-label-md text-xs sm:text-sm px-space-md py-2 rounded-full focus:outline-none border border-surface-container cursor-pointer"
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
            className={`px-space-md py-1.5 rounded-full font-label-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
            }`}
            type="button"
          >
            All (42)
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
            }`}
            type="button"
          >
            Approved & Disbursed (28)
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'review'
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
            }`}
            type="button"
          >
            Under Human Review (6)
          </button>
          <button
            onClick={() => setActiveTab('awaiting')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'awaiting'
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
            }`}
            type="button"
          >
            Awaiting Carrier Evidence (5)
          </button>
          <button
            onClick={() => setActiveTab('flagged')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'flagged'
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
            }`}
            type="button"
          >
            Flagged / Rejected (3)
          </button>
        </div>

        {/* Investigation Cases Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-xs sm:text-sm">
            <thead>
              <tr className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider bg-surface-container-low rounded-xl">
                <th className="py-space-md px-space-md rounded-l-xl">Investigation ID / PNR</th>
                <th className="py-space-md px-space-md">Traveler</th>
                <th className="py-space-md px-space-md">Carrier & Route</th>
                <th className="py-space-md px-space-md">Claim Amount</th>
                <th className="py-space-md px-space-md">Risk Level</th>
                <th className="py-space-md px-space-md">AI Confidence</th>
                <th className="py-space-md px-space-md">Status</th>
                <th className="py-space-md px-space-md rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {filteredInvestigations.map((item) => (
                <tr key={item.id} className="hover:bg-surface-container-low/60 transition-colors">
                  {/* Case Ref */}
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

                  {/* Traveler */}
                  <td className="py-space-md px-space-md">
                    <div className="flex items-center gap-space-sm">
                      <div
                        className={`w-8 h-8 rounded-full ${item.traveler.color} font-label-sm text-xs flex items-center justify-center font-bold`}
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

                  {/* Carrier & Route */}
                  <td className="py-space-md px-space-md">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-1 rounded-md bg-surface-container-high text-on-surface">
                        <span className="material-symbols-outlined text-[16px]">
                          {item.carrier.type === 'train'
                            ? 'train'
                            : item.carrier.type === 'bus'
                            ? 'directions_bus'
                            : 'flight'}
                        </span>
                      </span>
                      <span className="font-medium text-on-surface text-xs sm:text-sm">
                        {item.carrier.name} ({item.carrier.route})
                      </span>
                    </div>
                  </td>

                  {/* Claim Amount */}
                  <td className="py-space-md px-space-md">
                    <span className="font-semibold text-on-surface">{item.claimAmountFormatted}</span>
                  </td>

                  {/* Risk Level */}
                  <td className="py-space-md px-space-md">
                    <RiskBadge level={item.riskLevel} size="sm" />
                  </td>

                  {/* AI Confidence */}
                  <td className="py-space-md px-space-md">
                    <span className="font-code-sm text-xs text-primary font-bold">{item.aiConfidence}%</span>
                  </td>

                  {/* Status */}
                  <td className="py-space-md px-space-md">
                    <StatusBadge status={item.decisionStatus} size="sm" />
                  </td>

                  {/* Action Buttons */}
                  <td className="py-space-md px-space-md text-right">
                    <div className="flex items-center justify-end gap-2">
                      {item.isHighImpact && item.decisionStatus === 'Under Human Review' ? (
                        <button
                          onClick={() => handleReviewHighImpact(item.id)}
                          className="px-space-md py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-md text-xs font-bold hover:brightness-105 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                          type="button"
                        >
                          Review Case
                        </button>
                      ) : null}

                      {item.decisionStatus === 'Ready for Payout' && (
                        <button
                          onClick={() => handleQuickApprove(item.id)}
                          className="px-space-md py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-md text-xs font-bold hover:brightness-105 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                          type="button"
                        >
                          Approve Release
                        </button>
                      )}

                      <button
                        onClick={() => handleInspectCase(item.id)}
                        className="px-space-md py-1.5 rounded-full bg-surface-container hover:bg-primary-container hover:text-on-primary-container text-on-surface font-label-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                        type="button"
                      >
                        Inspect Dossier
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-xs border-t border-surface-container">
          <span className="font-body-sm text-xs text-on-surface-variant">
            Showing <strong className="text-on-surface font-semibold">1–{filteredInvestigations.length}</strong> of 42 active investigations
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
              className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-xs transition-colors cursor-pointer"
              type="button"
            >
              2
            </button>
            <button
              className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-xs transition-colors cursor-pointer"
              type="button"
            >
              3
            </button>
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
  );
};
