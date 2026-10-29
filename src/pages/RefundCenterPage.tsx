import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { useInvestigation } from '../context/InvestigationContext';
import { useTravelBooking } from '../context/TravelBookingContext';

type ModeType = 'Flight' | 'Hotel' | 'Train' | 'Bus' | 'Cab';

export const RefundCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { cases } = useInvestigation();
  const { userBookings } = useTravelBooking();

  const [activeTab, setActiveTab] = useState<'eligibility' | 'track'>('eligibility');
  const [bookingType, setBookingType] = useState<ModeType>('Flight');
  const [pnr, setPnr] = useState('ABC123');
  const [contact, setContact] = useState('aarav.sharma@example.com');
  const [disruptionReason, setDisruptionReason] = useState('Cancelled by airline / operator (Flight AI-805)');
  const [trackCaseId, setTrackCaseId] = useState('RF12345');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const previewCase = cases[0];

  const handleSubmitEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setSubmitError(null);

    const cleanPnr = pnr.trim();

    try {
      // 1. Submit refund claim to backend API
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
        // Fallback to direct localhost if proxy was bypassed
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

        // 201 Created -> navigate to newly created refund case
        if (data && submitRes.status === 201 && data.refund?.id) {
          navigate(`/refunds/${data.refund.id}`);
          return;
        }

        // 409 Conflict -> existing refund case already active, navigate to track it
        if (submitRes.status === 409 && data.refund?.id) {
          navigate(`/refunds/${data.refund.id}`);
          return;
        }

        // If booking not found or not eligible in backend, check local user bookings/cases
        if (submitRes.status === 400 || submitRes.status === 404) {
          const matchedCase = cases.find(
            (c) =>
              c.pnr.toLowerCase() === cleanPnr.toLowerCase() ||
              c.id.toLowerCase() === cleanPnr.toLowerCase() ||
              c.caseRef.replace('#', '').toLowerCase() === cleanPnr.toLowerCase()
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

          setSubmitError(data.error || 'Booking not eligible for refund.');
          setIsAnalyzing(false);
          return;
        }
      }
    } catch (err: any) {
      console.warn('Backend submit error:', err);
    }

    // Fallback navigation
    if (cleanPnr) navigate(`/refunds/${cleanPnr.replace('#', '')}`);
    setIsAnalyzing(false);
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = trackCaseId.trim().replace('#', '');

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

    const matched = cases.find(
      (c) =>
        c.id.toLowerCase() === cleanId.toLowerCase() ||
        c.caseRef.replace('#', '').toLowerCase() === cleanId.toLowerCase() ||
        c.pnr.toLowerCase() === cleanId.toLowerCase()
    );
    if (matched || cleanId) navigate(`/refunds/${matched ? matched.id : cleanId}`);
  };

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <SiteHeader activeTab="refunds" />

      <main className="flex-1 w-full site-container py-8 text-left">
        {/* Breadcrumb */}
        <div className="text-xs text-[#6b7775] mb-2 flex items-center gap-1.5">
          <Link to="/" className="hover:text-[#0d3d3a]">Home</Link>
          <span>›</span>
          <span className="text-[#0d3d3a] font-medium">Refunds</span>
        </div>

        {/* Title Header Section (Page 9) */}
        <div className="pb-6 border-b border-[#e3ded4] space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f2f0] border border-[#d0dfd3] text-[#0d6b63] text-xs font-bold tracking-wide uppercase">
            AI-Powered Refund Assistance
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0d3d3a] tracking-tight">
            Refund center
          </h1>
          <p className="text-sm sm:text-base text-[#5c6967] max-w-2xl leading-relaxed">
            If your booking is cancelled or disrupted, our AI helps you check refund eligibility,
            understand applicable policies and track your claim.
          </p>
          <p className="text-xs text-[#889593]">
            Refund eligibility and amounts depend on your booking, applicable policies and provider decisions.
          </p>
        </div>

        {/* Check eligibility / Track refund Switch Tabs */}
        <div className="py-4 border-b border-[#e3ded4] flex items-center gap-3">
          <button
            onClick={() => setActiveTab('eligibility')}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'eligibility'
                ? 'bg-[#0d6b63] text-white shadow-sm'
                : 'bg-white border border-[#e3ded4] text-[#42504e] hover:bg-[#eae4d8]'
            }`}
          >
            Check eligibility
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'track'
                ? 'bg-[#0d6b63] text-white shadow-sm'
                : 'bg-white border border-[#e3ded4] text-[#42504e] hover:bg-[#eae4d8]'
            }`}
          >
            Track refund
          </button>
        </div>

        {/* MAIN INTERACTIVE SECTION (2 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#e3ded4] p-6 shadow-sm space-y-6">
            {activeTab === 'eligibility' ? (
              <form onSubmit={handleSubmitEligibility} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#0d3d3a]">
                    Check refund eligibility
                  </h2>
                  <p className="text-xs text-[#6b7775] mt-0.5">
                    Works for flights, hotels, trains, buses and cabs.
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
                        className={`py-2 text-xs font-semibold rounded-md border text-center transition-colors ${
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
                      placeholder="e.g. ABC123 or 482910"
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
                    className="w-full border border-[#e3ded4] rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0d6b63] bg-white"
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
                  className="w-full bg-[#0d6b63] text-white py-2.5 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Checking airline GDS & refund policy...</span>
                    </>
                  ) : (
                    <>
                      <span>Check Refund Eligibility</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-[#889593] text-center">
                  Your details are used only to look up this booking. The provider makes the final decision on any refund.
                </p>
              </form>
            ) : (
              /* Track Refund Form */
              <form onSubmit={handleTrackSubmit} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#0d3d3a]">
                    Track your refund claim
                  </h2>
                  <p className="text-xs text-[#6b7775] mt-0.5">
                    Enter your refund case ID or booking reference to view live status.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0d3d3a] block">
                    Case reference ID
                  </label>
                  <input
                    type="text"
                    required
                    value={trackCaseId}
                    onChange={(e) => setTrackCaseId(e.target.value)}
                    placeholder="e.g. RF12345 or RF11982"
                    className="w-full border border-[#e3ded4] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0d6b63]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0d6b63] text-white py-2.5 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm"
                >
                  Track refund status →
                </button>
              </form>
            )}
          </div>

          {/* Right Column: CLAIM TRACKING PREVIEW (Page 9) */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-[11px] font-bold text-[#889593] uppercase tracking-wider block">
              Claim Tracking Preview
            </span>

            <div className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e3ded4]">
                <div>
                  <h3 className="font-mono text-sm font-bold text-[#0d3d3a]">
                    Case #{previewCase.caseRef.replace('#', '') || previewCase.id}
                  </h3>
                  <span className="text-xs text-[#6b7775]">{previewCase.carrier.route} · {previewCase.journeyDate}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  previewCase.decisionStatus === 'Ready for Payout' || previewCase.decisionStatus === 'Approved'
                    ? 'bg-[#ecfdf5] text-[#166534] border-[#bbf7d0]'
                    : previewCase.decisionStatus === 'Under Human Review'
                    ? 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'
                    : 'bg-[#e8f2f0] text-[#0d6b63] border-[#d0dfd3]'
                }`}>
                  {previewCase.decisionStatus}
                </span>
              </div>

              {/* Progress Stepper */}
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] py-1">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-[#0d6b63] text-white flex items-center justify-center font-bold text-[9px]">
                    ✓
                  </div>
                  <span className="font-bold text-[#0d3d3a]">Submitted</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-[#0d6b63] text-white flex items-center justify-center font-bold text-[9px]">
                    ✓
                  </div>
                  <span className="font-bold text-[#0d6b63]">AI review</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-[#0d6b63] text-white flex items-center justify-center font-bold text-[9px]">
                    3
                  </div>
                  <span className="font-bold text-[#0d6b63]">Decision</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-[#f3eee5] text-[#889593] flex items-center justify-center font-bold text-[9px]">
                    4
                  </div>
                  <span className="text-[#889593]">Disbursement</span>
                </div>
              </div>

              {/* Verified checklist */}
              <div className="bg-[#fbf9f4] rounded-lg p-3.5 border border-[#e3ded4] space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#0d3d3a]">
                  <span className="text-[#166534] font-bold">✓</span>
                  <span>Booking details verified ({previewCase.traveler.name})</span>
                </div>
                <div className="flex items-center gap-2 text-[#0d3d3a]">
                  <span className="text-[#166534] font-bold">✓</span>
                  <span>Carrier operational log verified ({previewCase.carrier.code})</span>
                </div>
                <div className="flex items-center gap-2 text-[#0d3d3a]">
                  <span className="text-[#166534] font-bold">✓</span>
                  <span>Policy evaluated ({previewCase.evidenceStrength})</span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Link
                  to={`/refunds/${previewCase.id}`}
                  className="text-xs font-semibold text-[#0d6b63] hover:underline"
                >
                  View full case details →
                </Link>
              </div>

              <p className="text-[11px] text-[#889593] text-center border-t border-[#f0ebe1] pt-2">
                Real-time investigation dossier. The provider executes the final disbursement.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: HOW IT WORKS + YOUR RECENT CLAIMS (Page 9) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 pb-12 border-t border-[#e3ded4]">
          {/* How It Works (3 Steps) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xl font-bold text-[#0d3d3a]">
              How it works
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-[#e3ded4]">
                <div className="w-7 h-7 rounded-full bg-[#e8f2f0] text-[#0d6b63] font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-[#0d3d3a] text-sm">
                    Share your booking details
                  </h4>
                  <p className="text-xs text-[#5c6967] mt-0.5">
                    Enter your booking reference and contact information so our engine can fetch GDS ticketing records.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-[#e3ded4]">
                <div className="w-7 h-7 rounded-full bg-[#e8f2f0] text-[#0d6b63] font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-[#0d3d3a] text-sm">
                    AI reviews eligibility
                  </h4>
                  <p className="text-xs text-[#5c6967] mt-0.5">
                    Your booking is checked against airline or railway tariff rules, DGCA directives, and provider cancellation policies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-[#e3ded4]">
                <div className="w-7 h-7 rounded-full bg-[#e8f2f0] text-[#0d6b63] font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-[#0d3d3a] text-sm">
                    Track your claim
                  </h4>
                  <p className="text-xs text-[#5c6967] mt-0.5">
                    Follow each step in real time. We prepare and submit evidence to the carrier, who executes the final disbursement.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Your Recent Claims (Page 9) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0d3d3a]">
                Your recent claims
              </h3>
              <Link to="/bookings" className="text-xs font-semibold text-[#0d6b63] hover:underline">
                View all →
              </Link>
            </div>

            <div className="space-y-3">
              {cases.slice(0, 3).map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-[#e3ded4] p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0d3d3a]">Case #{c.caseRef}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                        c.decisionStatus === 'Ready for Payout' || c.decisionStatus === 'Approved'
                          ? 'bg-[#ecfdf5] text-[#166534] border-[#bbf7d0]'
                          : c.decisionStatus === 'Under Human Review'
                          ? 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'
                          : 'bg-[#e8f2f0] text-[#0d6b63] border-[#d0dfd3]'
                      }`}>
                        {c.decisionStatus}
                      </span>
                    </div>
                    <p className="text-xs text-[#6b7775] mt-1 capitalize">{c.carrier.type} · {c.carrier.route}</p>
                  </div>
                  <Link
                    to={`/refunds/${c.id}`}
                    className="text-xs font-bold text-[#0d6b63] hover:underline"
                  >
                    View case →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};
