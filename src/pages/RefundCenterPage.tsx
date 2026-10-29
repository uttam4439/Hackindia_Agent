import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { StatusBadge } from '../components/common/StatusBadge';
import { useInvestigation } from '../context/InvestigationContext';
import { useTravelBooking } from '../context/TravelBookingContext';
import { InvestigationCase } from '../types';
import {
  normalizeRefundStatus,
  isRefundApproved,
  getTimelineStepStates,
  RefundCanonicalCategory,
} from '../utils/refundStatus';

type ModeType = 'Flight' | 'Hotel' | 'Train' | 'Bus' | 'Cab';
type StatusFilterType = 'ALL' | RefundCanonicalCategory;

export const RefundCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { cases } = useInvestigation();
  const { userBookings } = useTravelBooking();

  // Navigation & view states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'eligibility' | 'track'>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('ALL');

  // Form states
  const [bookingType, setBookingType] = useState<ModeType>('Flight');
  const [pnr, setPnr] = useState('ABC123');
  const [contact, setContact] = useState('aarav.sharma@example.com');
  const [disruptionReason, setDisruptionReason] = useState('Cancelled by airline / operator (Flight AI-805)');
  const [trackCaseId, setTrackCaseId] = useState('RF12345');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live API data & error states
  const [liveRefunds, setLiveRefunds] = useState<InvestigationCase[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch live backend refund cases
  const fetchLiveRefunds = async () => {
    setIsLoadingLive(true);
    setApiError(null);
    try {
      const endpoints = ['/api/refunds', 'http://localhost:5001/api/refunds'];
      let fetched = false;
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.refunds)) {
              setLiveRefunds(data.refunds);
              fetched = true;
              break;
            }
          }
        } catch {
          // Try next endpoint
        }
      }
      if (!fetched && cases.length === 0) {
        setApiError('Unable to connect to live refund tracking service.');
      }
    } catch (err: any) {
      setApiError(err?.message || 'Error loading live refund status');
    } finally {
      setIsLoadingLive(false);
    }
  };

  useEffect(() => {
    fetchLiveRefunds();
  }, []);

  // Merge backend refunds with context cases
  const allCases = useMemo(() => {
    const map = new Map<string, InvestigationCase>();
    // Context cases first
    cases.forEach((c) => {
      map.set(c.id.toLowerCase(), c);
      if (c.caseRef) map.set(c.caseRef.replace('#', '').toLowerCase(), c);
    });
    // Live backend cases take precedence if present
    liveRefunds.forEach((r) => {
      if (r.id) map.set(r.id.toLowerCase(), r);
      if (r.caseRef) map.set(r.caseRef.replace('#', '').toLowerCase(), r);
    });
    return Array.from(new Set(map.values()));
  }, [cases, liveRefunds]);

  // Set default selected case when cases arrive
  useEffect(() => {
    if (!selectedCaseId && allCases.length > 0) {
      setSelectedCaseId(allCases[0].id);
    }
  }, [allCases, selectedCaseId]);

  // Dynamic summary metrics calculated strictly from real case data
  const summaryMetrics = useMemo(() => {
    let pending = 0;
    let underReview = 0;
    let approved = 0;
    let completed = 0;
    let rejected = 0;

    allCases.forEach((c) => {
      const cat = normalizeRefundStatus(c.decisionStatus);
      if (cat === 'PENDING') pending++;
      else if (cat === 'UNDER_REVIEW') underReview++;
      else if (cat === 'APPROVED') approved++;
      else if (cat === 'COMPLETED') completed++;
      else if (cat === 'REJECTED') rejected++;
    });

    return {
      total: allCases.length,
      pending,
      underReview,
      approved,
      completed,
      rejected,
    };
  }, [allCases]);

  // Filtered cases for dashboard list
  const filteredCases = useMemo(() => {
    return allCases.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.caseRef?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.pnr?.toLowerCase().includes(q) ||
        c.bookingId?.toLowerCase().includes(q) ||
        c.traveler?.name?.toLowerCase().includes(q) ||
        c.carrier?.name?.toLowerCase().includes(q) ||
        c.carrier?.route?.toLowerCase().includes(q);

      const cat = normalizeRefundStatus(c.decisionStatus);
      const matchesStatus = statusFilter === 'ALL' || cat === statusFilter;

      const carrierType = c.carrier?.type?.toLowerCase() || '';
      const matchesService =
        serviceTypeFilter === 'ALL' ||
        carrierType.includes(serviceTypeFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesService;
    });
  }, [allCases, searchQuery, statusFilter, serviceTypeFilter]);

  // Current selected case for the live timeline & details panel
  const selectedCase = useMemo(() => {
    return (
      allCases.find(
        (c) =>
          c.id.toLowerCase() === selectedCaseId.toLowerCase() ||
          c.caseRef?.replace('#', '').toLowerCase() === selectedCaseId.toLowerCase()
      ) ||
      filteredCases[0] ||
      allCases[0] ||
      null
    );
  }, [allCases, filteredCases, selectedCaseId]);

  const handleSubmitEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setSubmitError(null);

    const cleanPnr = pnr.trim();

    try {
      let submitRes: Response | null = null;
      try {
        submitRes = await fetch('/api/refunds/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: cleanPnr,
            contact: contact.trim(),
            reason: disruptionReason,
            currency: 'INR',
          }),
        });
      } catch {
        try {
          submitRes = await fetch('http://localhost:5001/api/refunds/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId: cleanPnr,
              contact: contact.trim(),
              reason: disruptionReason,
              currency: 'INR',
            }),
          });
        } catch {}
      }

      if (submitRes) {
        let data: any = null;
        try {
          data = await submitRes.json();
        } catch {}

        if ((submitRes.status === 201 || submitRes.status === 409) && data?.refund?.id) {
          navigate(`/refunds/${data.refund.id}`);
          return;
        }

        if (submitRes.status === 400 || submitRes.status === 404) {
          const matchedCase = allCases.find(
            (c) =>
              c.pnr?.toLowerCase() === cleanPnr.toLowerCase() ||
              c.id.toLowerCase() === cleanPnr.toLowerCase() ||
              c.caseRef?.replace('#', '').toLowerCase() === cleanPnr.toLowerCase()
          );
          if (matchedCase) {
            navigate(`/refunds/${matchedCase.id}`);
            return;
          }

          const matchedBooking = userBookings.find(
            (b) =>
              b.refLabel.toLowerCase().includes(cleanPnr.toLowerCase()) ||
              b.id.toLowerCase() === cleanPnr.toLowerCase()
          );
          if (matchedBooking && matchedBooking.refundCaseId) {
            navigate(`/refunds/${matchedBooking.refundCaseId}`);
            return;
          }

          setSubmitError(data?.error || 'Booking not eligible for refund.');
          setIsAnalyzing(false);
          return;
        }
      }
    } catch (err: any) {
      console.warn('Backend submit error, checking local store:', err);
    }

    navigate(`/refunds/${cleanPnr.replace('#', '') || 'RF12345'}`);
    setIsAnalyzing(false);
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = trackCaseId.trim().replace(/^#/, '');

    try {
      const res = await fetch(`/api/refunds/${cleanId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.refund?.id) {
          navigate(`/refunds/${data.refund.id}`);
          return;
        }
      }
    } catch {}

    const matched = allCases.find(
      (c) =>
        c.id.toLowerCase() === cleanId.toLowerCase() ||
        c.caseRef?.replace('#', '').toLowerCase() === cleanId.toLowerCase() ||
        c.pnr?.toLowerCase() === cleanId.toLowerCase()
    );
    navigate(`/refunds/${matched ? matched.id : cleanId || 'RF12345'}`);
  };

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <SiteHeader activeTab="refunds" />

      <main className="flex-1 w-full site-container py-8 text-left space-y-8">
        {/* Breadcrumb */}
        <div className="text-xs text-[#6b7775] flex items-center gap-1.5">
          <Link to="/" className="hover:text-[#0d3d3a] transition-colors">Home</Link>
          <span>›</span>
          <span className="text-[#0d3d3a] font-medium">Refund Center</span>
        </div>

        {/* Title Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#e3ded4] gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f2f0] border border-[#d0dfd3] text-[#0d6b63] text-xs font-bold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-[#0d6b63] animate-pulse" />
              Autonomous Refund Intelligence
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0d3d3a] tracking-tight">
              Refund Center & Arbitration Ledger
            </h1>
            <p className="text-sm text-[#5c6967] leading-relaxed">
              Verify disruption claims, track payment reimbursements, and monitor autonomous policy arbitration in real time.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchLiveRefunds}
              disabled={isLoadingLive}
              className="flex items-center gap-1.5 bg-white border border-[#e3ded4] text-[#42504e] hover:text-[#0d3d3a] px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs hover:bg-[#eae4d8] transition-colors cursor-pointer"
              title="Refresh refund records from database"
            >
              <span className={`material-symbols-outlined text-[16px] ${isLoadingLive ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{isLoadingLive ? 'Syncing...' : 'Sync Live'}</span>
            </button>

            <button
              onClick={() => setActiveTab('eligibility')}
              className="bg-[#0d6b63] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Claim</span>
            </button>
          </div>
        </div>

        {/* SUMMARY METRICS CARDS (6 Categories from Real Application Data) */}
        <section
          aria-label="Refund Summary Metrics"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4"
        >
          {/* 1. Total Requests */}
          <button
            type="button"
            onClick={() => { setActiveTab('dashboard'); setStatusFilter('ALL'); }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'ALL' && activeTab === 'dashboard'
                ? 'bg-white border-[#0d6b63] shadow-md ring-2 ring-[#0d6b63]/20'
                : 'bg-white border-[#e3ded4] hover:border-[#0d6b63]/50 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-[#6b7775] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Claims</span>
              <span className="material-symbols-outlined text-[18px] text-[#0d3d3a]">receipt_long</span>
            </div>
            <div className="text-2xl font-bold text-[#0d3d3a]">{summaryMetrics.total}</div>
            <span className="text-[11px] text-[#889593] mt-1 block">All registered</span>
          </button>

          {/* 2. Pending */}
          <button
            type="button"
            onClick={() => { setActiveTab('dashboard'); setStatusFilter('PENDING'); }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'PENDING' && activeTab === 'dashboard'
                ? 'bg-white border-[#0d6b63] shadow-md ring-2 ring-[#0d6b63]/20'
                : 'bg-white border-[#e3ded4] hover:border-[#0d6b63]/50 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-[#0d6b63] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#42504e]">Pending</span>
              <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
            </div>
            <div className="text-2xl font-bold text-[#0d3d3a]">{summaryMetrics.pending}</div>
            <span className="text-[11px] text-[#0d6b63] mt-1 block font-medium">Submitted & Intake</span>
          </button>

          {/* 3. Under Review */}
          <button
            type="button"
            onClick={() => { setActiveTab('dashboard'); setStatusFilter('UNDER_REVIEW'); }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'UNDER_REVIEW' && activeTab === 'dashboard'
                ? 'bg-white border-[#b45309] shadow-md ring-2 ring-[#b45309]/20'
                : 'bg-white border-[#e3ded4] hover:border-[#b45309]/50 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-[#b45309] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#42504e]">Under Review</span>
              <span className="material-symbols-outlined text-[18px]">policy</span>
            </div>
            <div className="text-2xl font-bold text-[#0d3d3a]">{summaryMetrics.underReview}</div>
            <span className="text-[11px] text-[#b45309] mt-1 block font-medium">Auditor & Evidence</span>
          </button>

          {/* 4. Approved */}
          <button
            type="button"
            onClick={() => { setActiveTab('dashboard'); setStatusFilter('APPROVED'); }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'APPROVED' && activeTab === 'dashboard'
                ? 'bg-white border-[#0284c7] shadow-md ring-2 ring-[#0284c7]/20'
                : 'bg-white border-[#e3ded4] hover:border-[#0284c7]/50 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-[#0284c7] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#42504e]">Approved</span>
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
            <div className="text-2xl font-bold text-[#0d3d3a]">{summaryMetrics.approved}</div>
            <span className="text-[11px] text-[#0284c7] mt-1 block font-medium">Payout Queued</span>
          </button>

          {/* 5. Completed (Green check tick ONLY for Completed) */}
          <button
            type="button"
            onClick={() => { setActiveTab('dashboard'); setStatusFilter('COMPLETED'); }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'COMPLETED' && activeTab === 'dashboard'
                ? 'bg-white border-[#166534] shadow-md ring-2 ring-[#166534]/20'
                : 'bg-white border-[#e3ded4] hover:border-[#166534]/50 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-[#166534] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#42504e]">Completed</span>
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </div>
            <div className="text-2xl font-bold text-[#166534]">{summaryMetrics.completed}</div>
            <span className="text-[11px] text-[#166534] mt-1 block font-semibold">Disbursed Funds ✓</span>
          </button>

          {/* 6. Rejected */}
          <button
            type="button"
            onClick={() => { setActiveTab('dashboard'); setStatusFilter('REJECTED'); }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'REJECTED' && activeTab === 'dashboard'
                ? 'bg-white border-[#dc2626] shadow-md ring-2 ring-[#dc2626]/20'
                : 'bg-white border-[#e3ded4] hover:border-[#dc2626]/50 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-[#dc2626] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#42504e]">Rejected</span>
              <span className="material-symbols-outlined text-[18px]">cancel</span>
            </div>
            <div className="text-2xl font-bold text-[#0d3d3a]">{summaryMetrics.rejected}</div>
            <span className="text-[11px] text-[#dc2626] mt-1 block font-medium">Flagged / Declined</span>
          </button>
        </section>

        {/* TAB CONTROLS */}
        <div className="flex items-center gap-2 border-b border-[#e3ded4] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-[#0d6b63] text-white shadow-xs'
                : 'bg-white border border-[#e3ded4] text-[#42504e] hover:bg-[#eae4d8]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">dashboard</span>
            <span>Claims Dashboard & Tracker</span>
          </button>
          <button
            onClick={() => setActiveTab('eligibility')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'eligibility'
                ? 'bg-[#0d6b63] text-white shadow-xs'
                : 'bg-white border border-[#e3ded4] text-[#42504e] hover:bg-[#eae4d8]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">fact_check</span>
            <span>Check Eligibility & Submit</span>
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'track'
                ? 'bg-[#0d6b63] text-white shadow-xs'
                : 'bg-white border border-[#e3ded4] text-[#42504e] hover:bg-[#eae4d8]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
            <span>Lookup by Reference ID</span>
          </button>
        </div>

        {/* API ERROR / RETRY BANNER */}
        {apiError && (
          <div className="p-4 rounded-xl bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>{apiError}</span>
            </div>
            <button
              onClick={fetchLiveRefunds}
              className="px-3 py-1 bg-white text-[#991b1b] border border-[#fecaca] rounded hover:bg-[#fef2f2] transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* TAB 1: MAIN DASHBOARD VIEW (TABLE & TIMELINE/DETAILS PANEL) */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Search, Filter & Claims List (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Filter & Search Bar */}
              <div className="bg-white rounded-xl border border-[#e3ded4] p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Search Input */}
                  <div className="flex-1 flex items-center gap-2 bg-[#fbf9f4] border border-[#e3ded4] rounded-lg px-3 py-2 text-xs">
                    <span className="material-symbols-outlined text-[16px] text-[#6b7775]">search</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by case ID, PNR, booking ref, traveler..."
                      className="bg-transparent w-full focus:outline-none text-[#192524] placeholder:text-[#889593]"
                      aria-label="Search refund claims"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-[#6b7775] hover:text-[#0d3d3a] cursor-pointer"
                        aria-label="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Travel Mode Filter */}
                  <div className="flex items-center gap-1 overflow-x-auto text-xs">
                    {(['ALL', 'flight', 'train', 'bus'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setServiceTypeFilter(mode)}
                        className={`px-3 py-1.5 rounded-md capitalize transition-colors font-medium cursor-pointer ${
                          serviceTypeFilter === mode
                            ? 'bg-[#0d6b63] text-white font-semibold shadow-xs'
                            : 'bg-[#fbf9f4] border border-[#e3ded4] text-[#42504e] hover:bg-[#eae4d8]'
                        }`}
                      >
                        {mode === 'ALL' ? 'All Modes' : mode}
                      </button>
                    )))}
                  </div>
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-1">
                  {(
                    [
                      { key: 'ALL', label: `All (${allCases.length})` },
                      { key: 'PENDING', label: `Pending (${summaryMetrics.pending})` },
                      { key: 'UNDER_REVIEW', label: `Under Review (${summaryMetrics.underReview})` },
                      { key: 'APPROVED', label: `Approved (${summaryMetrics.approved})` },
                      { key: 'COMPLETED', label: `Completed (${summaryMetrics.completed})` },
                      { key: 'REJECTED', label: `Rejected (${summaryMetrics.rejected})` },
                    ] as { key: StatusFilterType; label: string }[]
                  ).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStatusFilter(f.key)}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-colors cursor-pointer whitespace-nowrap border ${
                        statusFilter === f.key
                          ? 'bg-[#0d3d3a] text-white border-[#0d3d3a]'
                          : 'bg-[#fbf9f4] text-[#5c6967] border-[#e3ded4] hover:bg-[#f0ebe1]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Claims List */}
              <div className="space-y-3">
                {isLoadingLive && allCases.length === 0 ? (
                  /* Loading skeleton */
                  <div className="bg-white rounded-xl border border-[#e3ded4] p-8 text-center space-y-3 shadow-xs">
                    <div className="w-8 h-8 border-2 border-[#0d6b63] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-[#5c6967] font-medium">Loading authoritative refund claims...</p>
                  </div>
                ) : filteredCases.length > 0 ? (
                  filteredCases.map((c) => {
                    const isSelected = selectedCase?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCaseId(c.id)}
                        className={`bg-white rounded-xl border p-4 transition-all cursor-pointer shadow-xs ${
                          isSelected
                            ? 'border-[#0d6b63] ring-2 ring-[#0d6b63]/20 bg-[#fbfdfc]'
                            : 'border-[#e3ded4] hover:border-[#0d6b63]/50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#f0ebe1]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[#0d3d3a]">
                              Case #{c.caseRef?.replace('#', '') || c.id}
                            </span>
                            <span className="text-[#889593]">•</span>
                            <span className="text-[11px] font-semibold text-[#5c6967]">
                              PNR: {c.pnr || c.bookingId}
                            </span>
                            <span className="text-[#889593]">•</span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#42504e] font-medium">
                              <span className="material-symbols-outlined text-[13px] text-[#0d6b63]">
                                {c.carrier?.type === 'train' ? 'train' : c.carrier?.type === 'bus' ? 'directions_bus' : 'flight'}
                              </span>
                              {c.carrier?.name || 'Carrier Partner'}
                            </span>
                          </div>

                          <StatusBadge status={c.decisionStatus} size="sm" />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                          <div>
                            <div className="font-semibold text-[#0d3d3a]">
                              {c.carrier?.route || 'Transit Route'}
                            </div>
                            <div className="text-[11px] text-[#6b7775] mt-0.5">
                              {c.traveler?.name} · Journey: {c.journeyDate || 'Recent'}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-start sm:self-auto">
                            <div className="text-right">
                              <span className="text-[10px] text-[#889593] block font-bold uppercase">Refund Amount</span>
                              <span className="text-sm font-bold text-[#0d3d3a]">
                                {c.claimAmountFormatted || `₹${Number(c.claimAmount || 0).toLocaleString('en-IN')}`}
                              </span>
                            </div>

                            <Link
                              to={`/refunds/${c.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-bold text-[#0d6b63] hover:underline flex items-center gap-0.5"
                              title="Open full dossier"
                            >
                              <span>Dossier</span>
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </Link>
                          </div>
                        </div>

                        {c.reasonSummary && (
                          <div className="mt-2 pt-2 border-t border-[#fbf9f4] text-[11px] text-[#6b7775] line-clamp-1">
                            <span className="font-semibold text-[#42504e]">Disruption:</span> {c.reasonSummary}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  /* Empty state */
                  <div className="bg-white rounded-xl border border-[#e3ded4] p-10 text-center space-y-3 shadow-xs">
                    <span className="material-symbols-outlined text-[36px] text-[#889593] block mx-auto">
                      inbox
                    </span>
                    <h3 className="text-sm font-bold text-[#0d3d3a]">No Refund Claims Found</h3>
                    <p className="text-xs text-[#6b7775] max-w-sm mx-auto">
                      {searchQuery || statusFilter !== 'ALL' || serviceTypeFilter !== 'ALL'
                        ? 'No records match the current search filters. Try clearing your filters.'
                        : 'No active refund requests are currently on file for your account.'}
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('ALL');
                          setServiceTypeFilter('ALL');
                        }}
                        className="bg-white border border-[#e3ded4] text-[#0d3d3a] px-3.5 py-1.5 rounded-md text-xs font-semibold hover:bg-[#f7f4ed] transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                      <button
                        onClick={() => setActiveTab('eligibility')}
                        className="bg-[#0d6b63] text-white px-3.5 py-1.5 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors cursor-pointer"
                      >
                        Check Refund Eligibility
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Interactive Refund Progress Timeline & Details Panel (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-[11px] font-bold text-[#889593] uppercase tracking-wider block">
                Live Claim Tracker & Policy Dossier
              </span>

              {selectedCase ? (
                <div className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm space-y-5">
                  {/* Panel Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-[#e3ded4] gap-2">
                    <div>
                      <h3 className="font-mono text-sm font-bold text-[#0d3d3a]">
                        Case #{selectedCase.caseRef?.replace('#', '') || selectedCase.id}
                      </h3>
                      <span className="text-xs text-[#6b7775]">
                        {selectedCase.carrier?.name} ({selectedCase.carrier?.code}) · {selectedCase.carrier?.route}
                      </span>
                    </div>
                    <StatusBadge status={selectedCase.decisionStatus} size="sm" />
                  </div>

                  {/* AUTHORITATIVE PROGRESS TIMELINE (Green tick ONLY on completion) */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0d3d3a] block">
                      Disbursement Progress Timeline
                    </span>

                    {(() => {
                      const steps = getTimelineStepStates(selectedCase);
                      const stepList = [steps.submitted, steps.policy, steps.decision, steps.payout];

                      return (
                        <div className="grid grid-cols-4 gap-2 text-center text-[10px] py-1 bg-[#fbf9f4] p-2.5 rounded-lg border border-[#e3ded4]">
                          {stepList.map((st) => (
                            <div key={st.stepNumber} className="flex flex-col items-center gap-1">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border ${st.pillClass}`}
                                aria-label={st.ariaLabel}
                              >
                                {st.icon}
                              </div>
                              <span className={`font-bold ${st.textColor}`}>
                                {st.label}
                              </span>
                              <span
                                className="text-[9px] text-[#889593] truncate max-w-full px-0.5"
                                title={st.subLabel}
                              >
                                {st.subLabel}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Financial & Entitlement Summary */}
                  <div className="bg-[#f0ebe1] rounded-lg p-3.5 border border-[#e3ded4] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-[#6b7775] uppercase block">Claimed / Approved</span>
                      <span className="text-base font-bold text-[#0d3d3a]">
                        {selectedCase.claimAmountFormatted || `₹${Number(selectedCase.claimAmount || 0).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-[#6b7775] uppercase block">Risk Profile</span>
                      <span className={`text-xs font-semibold ${selectedCase.riskLevel === 'Low Risk' ? 'text-[#166534]' : 'text-[#b45309]'}`}>
                        {selectedCase.riskLevel || 'Low Risk'}
                      </span>
                    </div>
                  </div>

                  {/* Investigation Result & Findings */}
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-[#0d3d3a] block">Autonomous Audit Assessment:</span>
                    <p className="text-[#5c6967] leading-relaxed bg-[#fbf9f4] p-3 rounded-lg border border-[#e3ded4]">
                      {selectedCase.synthesis || selectedCase.reasonSummary || 'Case evidence verified against carrier disruption advisory and passenger fare tariff rules.'}
                    </p>
                  </div>

                  {/* Verified Checklist with Accurate Dynamic State */}
                  <div className="bg-[#fbf9f4] rounded-lg p-3 border border-[#e3ded4] space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#0d3d3a]">
                      <span className="text-[#166534] font-bold">✓</span>
                      <span>Booking passenger: {selectedCase.traveler?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0d3d3a]">
                      <span className="text-[#166534] font-bold">✓</span>
                      <span>Carrier operational advisory: {selectedCase.carrier?.code}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0d3d3a]">
                      <span className={isRefundApproved(selectedCase.decisionStatus) ? 'text-[#166534] font-bold' : 'text-[#b45309] font-bold'}>
                        {isRefundApproved(selectedCase.decisionStatus) ? '✓' : '●'}
                      </span>
                      <span>
                        Policy mandate: {selectedCase.evidenceStrength || 'DGCA CAR / EC 261 standard'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-center">
                    <Link
                      to={`/refunds/${selectedCase.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0d6b63] hover:underline"
                    >
                      <span>View full investigation case dossier</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-[#e3ded4] p-8 text-center text-[#6b7775] shadow-xs">
                  <p className="text-xs">Select a refund claim on the left to inspect its live arbitration timeline.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ELIGIBILITY & SUBMIT CLAIM FORM */}
        {activeTab === 'eligibility' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 bg-white rounded-xl border border-[#e3ded4] p-6 shadow-sm space-y-6">
              <form onSubmit={handleSubmitEligibility} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#0d3d3a]">Check Refund Eligibility</h2>
                  <p className="text-xs text-[#6b7775] mt-0.5">
                    Works for flights, hotels, trains, buses and cabs across all verified partner networks.
                  </p>
                </div>

                {submitError && (
                  <div className="p-3 rounded-lg bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] text-xs font-semibold flex items-center justify-between">
                    <span>{submitError}</span>
                    <button
                      type="button"
                      onClick={() => setSubmitError(null)}
                      className="text-[#991b1b] hover:opacity-75 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Booking type selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d3d3a] uppercase tracking-wider block">
                    Booking type
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {(['Flight', 'Hotel', 'Train', 'Bus', 'Cab'] as ModeType[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setBookingType(m)}
                        className={`py-2 text-xs font-semibold rounded-md border text-center transition-colors cursor-pointer ${
                          bookingType === m
                            ? 'bg-[#0d6b63] text-white border-[#0d6b63]'
                            : 'bg-[#fbf9f4] text-[#42504e] border-[#e3ded4] hover:border-[#0d6b63]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PNR and Contact Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#0d3d3a] block">
                      Booking reference / PNR
                    </label>
                    <input
                      type="text"
                      required
                      value={pnr}
                      onChange={(e) => setPnr(e.target.value)}
                      placeholder="e.g. ABC123 or BK-901291"
                      className="w-full border border-[#e3ded4] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0d6b63]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#0d3d3a] block">
                      Email or phone number
                    </label>
                    <input
                      type="text"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="e.g. traveller@example.com"
                      className="w-full border border-[#e3ded4] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0d6b63]"
                    />
                  </div>
                </div>

                {/* Reason Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0d3d3a] block">
                    Disruption or cancellation cause
                  </label>
                  <select
                    value={disruptionReason}
                    onChange={(e) => setDisruptionReason(e.target.value)}
                    className="w-full border border-[#e3ded4] rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0d6b63] bg-white cursor-pointer"
                  >
                    <option value="Cancelled by airline / operator (Flight AI-805)">
                      Cancelled by airline / operator (Flight AI-805)
                    </option>
                    <option value="Major delay exceeding 3 hours">
                      Major delay exceeding 3 hours
                    </option>
                    <option value="Schedule change without notice">
                      Schedule change without notice
                    </option>
                    <option value="Connecting transit missed due to inward delay">
                      Connecting transit missed due to inward delay
                    </option>
                    <option value="Medical emergency / unforeseen illness">
                      Medical emergency / unforeseen illness
                    </option>
                  </select>
                </div>

                {/* Document Upload Simulation */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0d3d3a] block">
                    Upload cancellation email or ticket (optional)
                  </label>
                  <div className="border border-dashed border-[#e3ded4] rounded-lg p-4 text-center bg-[#fbf9f4] hover:bg-[#f3eee5] transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[24px] text-[#0d6b63]">upload_file</span>
                    <span className="text-xs text-[#5c6967] block mt-1">
                      Drag & drop cancellation_email.pdf or click to browse
                    </span>
                    <span className="text-[10px] text-[#889593]">PDF, PNG, JPG up to 10MB</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="w-full bg-[#0d6b63] text-white py-2.5 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Evaluating carrier GDS & tariff policies...</span>
                    </>
                  ) : (
                    <>
                      <span>Check Refund Eligibility</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Helper Guide */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-[#e3ded4] p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#0d3d3a]">Refund Entitlement Guidelines</h3>
              <div className="space-y-3 text-xs text-[#5c6967] leading-relaxed">
                <p>
                  <strong>Carrier Cancellation:</strong> If a flight, train, or bus is cancelled by the operator, DGCA CAR and railway guidelines mandate 100% refund of basic fare and statutory taxes.
                </p>
                <p>
                  <strong>Delays & Rescheduling:</strong> Flight delays exceeding 3 hours entitle passengers to free alternate transport or full cancellation waivers.
                </p>
                <p>
                  <strong>Autonomous Verification:</strong> Our engine matches carrier operational logs and Amadeus/Sabre GDS advisories without requiring manual airline dispute calls.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRACK CLAIM BY REFERENCE */}
        {activeTab === 'track' && (
          <div className="max-w-xl mx-auto bg-white rounded-xl border border-[#e3ded4] p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#0d3d3a]">Track Existing Claim</h2>
              <p className="text-xs text-[#6b7775] mt-0.5">
                Enter your refund case ID (e.g. AT-9842, RF-1088) or booking reference to view live adjudication status.
              </p>
            </div>

            <form onSubmit={handleTrackSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0d3d3a] block">
                  Case reference ID or PNR
                </label>
                <input
                  type="text"
                  required
                  value={trackCaseId}
                  onChange={(e) => setTrackCaseId(e.target.value)}
                  placeholder="e.g. AT-9842 or 482910"
                  className="w-full border border-[#e3ded4] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0d6b63]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#0d6b63] text-white py-2.5 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Track Refund Status</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </form>
          </div>
        )}

        {/* BOTTOM SECTION: HOW IT WORKS & RECENT STATUTORY CLAIMS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 pb-12 border-t border-[#e3ded4]">
          {/* How It Works (3 Steps) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xl font-bold text-[#0d3d3a]">How Autonomous Arbitration Works</h3>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-[#e3ded4]">
                <div className="w-7 h-7 rounded-full bg-[#e8f2f0] text-[#0d6b63] font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-[#0d3d3a] text-sm">Submit Booking Reference</h4>
                  <p className="text-xs text-[#5c6967] mt-0.5">
                    Enter your booking reference. Our engine fetches the authoritative GDS ticketing records directly from the carrier.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-[#e3ded4]">
                <div className="w-7 h-7 rounded-full bg-[#e8f2f0] text-[#0d6b63] font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-[#0d3d3a] text-sm">AI Policy Arbitration</h4>
                  <p className="text-xs text-[#5c6967] mt-0.5">
                    Your claim is evaluated against DGCA directives, EC 261 mandates, and operator tariff conditions to prevent unauthorized fee deductions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-[#e3ded4]">
                <div className="w-7 h-7 rounded-full bg-[#e8f2f0] text-[#0d6b63] font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-[#0d3d3a] text-sm">Disbursement Tracking</h4>
                  <p className="text-xs text-[#5c6967] mt-0.5">
                    Follow each payment lifecycle stage until the gateway reconciles and confirms final settlement to your account.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Your Recent Claims List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0d3d3a]">Your Recent Claims</h3>
              <Link to="/bookings" className="text-xs font-semibold text-[#0d6b63] hover:underline">
                View all bookings →
              </Link>
            </div>

            <div className="space-y-3">
              {allCases.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-[#e3ded4] p-4 shadow-sm flex items-center justify-between hover:border-[#0d6b63]/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0d3d3a]">
                        Case #{c.caseRef?.replace('#', '') || c.id}
                      </span>
                      <StatusBadge status={c.decisionStatus} size="sm" />
                    </div>
                    <p className="text-xs text-[#6b7775] mt-1 capitalize">
                      {c.carrier?.type} · {c.carrier?.route}
                    </p>
                  </div>
                  <Link
                    to={`/refunds/${c.id}`}
                    className="text-xs font-bold text-[#0d6b63] hover:underline flex items-center gap-0.5"
                  >
                    <span>View case</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer Footer */}
        <div className="pt-4 pb-6 text-xs text-[#889593] border-t border-[#e3ded4]">
          Refund eligibility and amounts depend on your booking, applicable statutory policies, carrier advisories, and provider disbursement clearance.
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default RefundCenterPage;
