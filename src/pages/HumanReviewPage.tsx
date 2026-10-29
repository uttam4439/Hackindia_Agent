import React, { useState, useEffect } from 'react';
import { ReviewerHeader } from '../components/layout/ReviewerHeader';
import { useInvestigation } from '../context/InvestigationContext';

export const HumanReviewPage: React.FC = () => {
  const { cases, approveRefund, requestManualReview, rejectRecommendation, saveReviewerDraft } = useInvestigation();

  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Ready' | 'Docs'>('All');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('AT-9842');
  const [decision, setDecision] = useState<string>('eligible');

  const [adjustedAmount, setAdjustedAmount] = useState<string>('');
  const [reviewerNote, setReviewerNote] = useState<string>(
    'I have reviewed the AI findings and the supporting documents. Carrier operational cancellation confirmed in GDS logs.'
  );
  const [submittedAlert, setSubmittedAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);


  // Filter cases relevant for human review queue
  const reviewQueue = cases.filter(
    (c) =>
      c.humanReviewRequired ||
      c.decisionStatus === 'Under Human Review' ||
      c.decisionStatus === 'Pending Human Approval' ||
      c.decisionStatus === 'Ready for Payout' ||
      c.decisionStatus === 'Awaiting Carrier Evidence'
  );

  const filteredCases = (reviewQueue.length > 0 ? reviewQueue : cases).filter((c) => {
    if (selectedFilter === 'Ready') return c.decisionStatus === 'Ready for Payout' || c.decisionStatus === 'Pending Human Approval';
    if (selectedFilter === 'Docs') return c.decisionStatus === 'Awaiting Carrier Evidence' || c.decisionStatus === 'Under Human Review';
    return true;
  });

  const selectedCase =
    cases.find(
      (c) =>
        c.id.toLowerCase() === selectedCaseId.toLowerCase() ||
        c.caseRef.toLowerCase().replace('#', '') === selectedCaseId.toLowerCase().replace('#', '') ||
        c.pnr.toLowerCase() === selectedCaseId.toLowerCase() ||
        (c.bookingId && c.bookingId.toLowerCase() === selectedCaseId.toLowerCase())
    ) ||
    filteredCases[0] ||
    cases[0];


  // Restore backend draft or reviewer note when selected case changes or loads
  useEffect(() => {
    if (!selectedCase) return;
    const draftNote = (selectedCase as any)?.reviewerDraftNote;
    const draftDecision = (selectedCase as any)?.reviewerDraftDecision;

    if (draftNote) {
      setReviewerNote(draftNote);
      if (draftDecision) {
        setDecision(draftDecision === 'more_docs' ? 'docs' : draftDecision);
      }
      setAdjustedAmount(String(selectedCase.claimAmount));
      return;
    }

    if (selectedCase.reviewerComment) {
      setReviewerNote(selectedCase.reviewerComment);
      setAdjustedAmount(String(selectedCase.claimAmount));
      return;
    }

    // Default initial state for cases without draft
    setDecision('eligible');
    setReviewerNote('I have reviewed the AI findings and the supporting documents. Carrier operational cancellation confirmed in GDS logs.');
    setAdjustedAmount(String(selectedCase.claimAmount));
  }, [selectedCase?.id, selectedCase?.claimAmount, (selectedCase as any)?.reviewerDraftNote]);

  const parsedAdjusted = parseFloat(adjustedAmount);
  const isAdjustedInvalid = decision === 'adjusted' && (
    !adjustedAmount.trim() ||
    isNaN(parsedAdjusted) ||
    parsedAdjusted <= 0 ||
    parsedAdjusted > selectedCase.claimAmount
  );

  const handleConfirmSubmit = async () => {
    const caseLabel = selectedCase.caseRef.replace('#', '') || selectedCase.id;
    setIsSubmitting(true);
    let res: { success: boolean; error?: string } = { success: false };

    if (decision === 'eligible') {
      res = await approveRefund(selectedCase.id, reviewerNote);
      if (res.success) {
        setSubmittedAlert({ type: 'success', message: `Case #${caseLabel} approved! Refund payout authorization recorded in audit ledger.` });
      } else {
        setSubmittedAlert({ type: 'error', message: `Failed to approve Case #${caseLabel}: ${res.error || 'Server error'}` });
      }
    } else if (decision === 'adjusted') {
      if (isAdjustedInvalid) {
        setIsSubmitting(false);
        setSubmittedAlert({ type: 'error', message: `Please enter a valid adjusted amount between ₹1 and ${selectedCase.claimAmountFormatted}.` });
        setTimeout(() => setSubmittedAlert(null), 3500);
        return;
      }
      res = await approveRefund(
        selectedCase.id,
        `Approved with adjusted estimate (₹${parsedAdjusted.toLocaleString('en-IN')}): ${reviewerNote}`,
        parsedAdjusted
      );
      if (res.success) {
        setSubmittedAlert({ type: 'success', message: `Case #${caseLabel} approved with adjusted amount of ₹${parsedAdjusted.toLocaleString('en-IN')}!` });
      } else {
        setSubmittedAlert({ type: 'error', message: `Failed to approve Case #${caseLabel}: ${res.error || 'Server error'}` });
      }
    } else if (decision === 'docs' || decision === 'more_docs') {
      res = await requestManualReview(selectedCase.id, reviewerNote);
      if (res.success) {
        setSubmittedAlert({ type: 'success', message: `Case #${caseLabel} marked for additional document verification.` });
      } else {
        setSubmittedAlert({ type: 'error', message: `Failed to update Case #${caseLabel}: ${res.error || 'Server error'}` });
      }
    } else if (decision === 'not_eligible') {
      res = await rejectRecommendation(selectedCase.id, reviewerNote || 'Claim rejected following human auditor review.');
      if (res.success) {
        setSubmittedAlert({ type: 'success', message: `Case #${caseLabel} closed as not eligible. Finding recorded.` });
      } else {
        setSubmittedAlert({ type: 'error', message: `Failed to reject Case #${caseLabel}: ${res.error || 'Server error'}` });
      }
    }

    setIsSubmitting(false);
    setTimeout(() => setSubmittedAlert(null), 3500);
  };

  const handleSaveDraft = async () => {
    const caseLabel = selectedCase.caseRef.replace('#', '') || selectedCase.id;
    if (!reviewerNote.trim()) {
      setSubmittedAlert({ type: 'error', message: 'Please enter a reviewer note before saving as draft.' });
      setTimeout(() => setSubmittedAlert(null), 3500);
      return;
    }

    setIsSavingDraft(true);
    const res = await saveReviewerDraft(selectedCase.id, reviewerNote, decision === 'docs' ? 'more_docs' : decision);
    setIsSavingDraft(false);

    if (res.success) {
      setSubmittedAlert({ type: 'success', message: `Draft note saved for Case #${caseLabel}.` });
    } else {
      setSubmittedAlert({ type: 'error', message: `Failed to save draft for Case #${caseLabel}: ${res.error || 'Server error'}` });
    }
    setTimeout(() => setSubmittedAlert(null), 3500);
  };

  const handleEscalate = async () => {
    const caseLabel = selectedCase.caseRef.replace('#', '') || selectedCase.id;
    setIsSubmitting(true);
    const res = await requestManualReview(selectedCase.id, `Escalated to Senior Audit Reviewer: ${reviewerNote}`, true);
    setIsSubmitting(false);

    if (res.success) {
      setSubmittedAlert({ type: 'success', message: `Case #${caseLabel} escalated to Senior Review Desk.` });
    } else {
      setSubmittedAlert({ type: 'error', message: `Failed to escalate Case #${caseLabel}: ${res.error || 'Server error'}` });
    }
    setTimeout(() => setSubmittedAlert(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <ReviewerHeader />

      {/* Action Notification */}
      {submittedAlert && (
        <div
          className={`fixed top-20 right-6 z-50 p-4 rounded-xl text-white font-semibold shadow-2xl flex items-center gap-2.5 text-xs animate-fade-in border ${
            submittedAlert.type === 'error'
              ? 'bg-[#7f1d1d] border-[#991b1b]'
              : 'bg-[#0a3635] border-[#185e5b]'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[18px] ${
              submittedAlert.type === 'error' ? 'text-[#fca5a5]' : 'text-[#20B8B0]'
            }`}
          >
            {submittedAlert.type === 'error' ? 'error' : 'verified'}
          </span>
          <span>{submittedAlert.message}</span>
        </div>
      )}

      <main className="flex-1 w-full site-container py-6 text-left">
        {/* Reviewer Header Sub-bar */}
        <div className="pb-5 border-b border-[#e3ded4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0d3d3a] tracking-tight">
              Case review
            </h1>
            <p className="text-xs sm:text-sm text-[#5c6967] mt-0.5">
              Check the AI findings and decide how the case should proceed. The provider makes the final refund decision.
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-[#e8f2f0] text-[#0d6b63] border border-[#d0dfd3]">
            {filteredCases.length} cases in your queue
          </span>
        </div>

        {/* Filter Tabs for Queue */}
        <div className="py-3 flex items-center gap-2">
          {(['All', 'Ready', 'Docs'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedFilter === filter
                  ? 'bg-[#0d6b63] text-white shadow-sm'
                  : 'bg-white border border-[#e3ded4] text-[#42504e] hover:bg-[#eae4d8]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* 2-Column Split: Queue List + Detailed Review (Page 11) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          {/* Left Column: Cases Queue List */}
          <div className="lg:col-span-4 space-y-3">
            {filteredCases.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCaseId(c.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                  selectedCaseId === c.id
                    ? 'bg-white border-[#0d6b63] shadow-md ring-1 ring-[#0d6b63]'
                    : 'bg-white/80 border-[#e3ded4] hover:bg-white hover:border-[#0d6b63]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#0d3d3a]">
                    #{c.caseRef} · {c.carrier.type.toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      c.decisionStatus === 'Ready for Payout' || c.decisionStatus === 'Approved'
                        ? 'bg-[#ecfdf5] text-[#166534] border-[#bbf7d0]'
                        : c.decisionStatus === 'Awaiting Carrier Evidence'
                        ? 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]'
                        : 'bg-[#e8f2f0] text-[#0d6b63] border-[#d0dfd3]'
                    }`}
                  >
                    {c.decisionStatus}
                  </span>
                </div>

                <div className="font-semibold text-sm text-[#0d3d3a]">{c.carrier.route}</div>

                <div className="flex items-center justify-between text-[#6b7775] pt-1 text-[11px] border-t border-[#f0ebe1]">
                  <span>{c.carrier.name} · {c.carrier.code}</span>
                  <span className="font-semibold text-[#0d3d3a]">{c.claimAmountFormatted}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Active Case Review & Decision Form (Page 11) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#e3ded4] p-6 shadow-sm space-y-6">
            {/* Header of Active Case */}
            <div className="flex items-center justify-between pb-4 border-b border-[#e3ded4]">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[#0d3d3a]">
                    Case #{selectedCase.caseRef.replace('#', '') || selectedCase.id}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      selectedCase.decisionStatus === 'Ready for Payout' || selectedCase.decisionStatus === 'Approved'
                        ? 'bg-[#ecfdf5] text-[#166534] border-[#bbf7d0]'
                        : selectedCase.decisionStatus === 'Awaiting Carrier Evidence'
                        ? 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]'
                        : selectedCase.decisionStatus === 'Flagged' || selectedCase.decisionStatus === 'Rejected'
                        ? 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                        : 'bg-[#e8f2f0] text-[#0d6b63] border-[#d0dfd3]'
                    }`}
                  >
                    {selectedCase.decisionStatus}
                  </span>
                </div>
                <p className="text-xs text-[#6b7775] mt-0.5">{selectedCase.carrier.route}</p>
              </div>

              <span className="font-mono font-bold text-lg text-[#0d3d3a]">
                {selectedCase.claimAmountFormatted}
              </span>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-lg bg-[#fbf9f4] border border-[#e3ded4] text-xs">
              <div>
                <span className="text-[10px] text-[#889593] font-bold uppercase block">Service</span>
                <span className="font-semibold text-[#0d3d3a] capitalize">{selectedCase.carrier.type}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#889593] font-bold uppercase block">Details</span>
                <span className="font-semibold text-[#0d3d3a] truncate block">{selectedCase.carrier.name} · {selectedCase.carrier.code}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#889593] font-bold uppercase block">Route</span>
                <span className="font-semibold text-[#0d3d3a] truncate block">{selectedCase.carrier.route}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#889593] font-bold uppercase block">Traveller</span>
                <span className="font-semibold text-[#0d3d3a]">{selectedCase.traveler.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#889593] font-bold uppercase block">Claim Amount</span>
                <span className="font-bold text-[#0d6b63]">{selectedCase.claimAmountFormatted}</span>
              </div>
            </div>

            {/* AI Summary Box (Page 11) */}
            <div className="p-4 rounded-lg bg-[#e8f2f0]/60 border border-[#d0dfd3] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0d6b63] block">
                  AI Summary · For Human Review
                </span>
                <span className="text-[11px] font-semibold text-[#0d6b63]">
                  {selectedCase.aiConfidence}% Confidence ({selectedCase.evidenceStrength})
                </span>
              </div>
              <p className="text-[#2d5650] leading-relaxed">
                {selectedCase.synthesis || selectedCase.reasonSummary}
              </p>
            </div>

            {/* Evidence Checked Table (Page 11) */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#0d3d3a] uppercase tracking-wider">
                Evidence checked ({selectedCase.artifacts?.length || 0} items)
              </h3>

              <div className="border border-[#e3ded4] rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#fbf9f4] border-b border-[#e3ded4] text-[#6b7775]">
                    <tr>
                      <th className="p-3 font-semibold">Evidence item</th>
                      <th className="p-3 font-semibold">Source</th>
                      <th className="p-3 font-semibold">Finding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ebe1]">
                    {selectedCase.artifacts && selectedCase.artifacts.length > 0 ? (
                      selectedCase.artifacts.map((art) => (
                        <tr key={art.id}>
                          <td className="p-3 font-medium text-[#0d3d3a]">
                            <div className="flex items-center gap-2">
                              <span className={`material-symbols-outlined text-[16px] ${art.iconColor || 'text-[#0d6b63]'}`}>
                                {art.icon || 'description'}
                              </span>
                              <span>{art.title}</span>
                            </div>
                          </td>
                          <td className="p-3 text-[#6b7775]">{art.source}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                              art.verified ? 'bg-[#ecfdf5] text-[#166534]' : 'bg-[#fffbeb] text-[#92400e]'
                            }`}>
                              {art.verified ? 'Verified · Matches' : 'Under Review'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-[#6b7775]">
                          No artifacts currently recorded for this case.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reviewer Decision Radio Form (Page 11) */}
            <div className="space-y-4 pt-3 border-t border-[#e3ded4]">
              <h3 className="text-sm font-bold text-[#0d3d3a]">
                Reviewer decision
              </h3>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-[#e3ded4] hover:bg-[#fbf9f4] cursor-pointer">
                  <input
                    type="radio"
                    name="decision"
                    value="eligible"
                    checked={decision === 'eligible'}
                    onChange={() => setDecision('eligible')}
                    className="mt-0.5 accent-[#0d6b63]"
                  />
                  <div>
                    <span className="font-bold text-[#0d3d3a] block">
                      Submit claim to provider as eligible
                    </span>
                    <span className="text-[#5c6967]">
                      Send the case and evidence to the airline for its decision.
                    </span>
                  </div>
                </label>

                <div
                  className={`p-3 rounded-lg border transition-all ${
                    decision === 'adjusted' ? 'bg-[#fbf9f4] border-[#0d6b63]' : 'border-[#e3ded4] hover:bg-[#fbf9f4]'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="decision"
                      value="adjusted"
                      checked={decision === 'adjusted'}
                      onChange={() => setDecision('adjusted')}
                      className="mt-0.5 accent-[#0d6b63]"
                    />
                    <div>
                      <span className="font-bold text-[#0d3d3a] block">
                        Submit with adjusted estimate
                      </span>
                      <span className="text-[#5c6967]">
                        Enter a different estimate below before submitting.
                      </span>
                    </div>
                  </label>
                  {decision === 'adjusted' && (
                    <div className="mt-2.5 ml-7 space-y-1.5 pt-2 border-t border-[#e3ded4]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#0d3d3a]">
                          Adjusted Amount (INR)
                        </label>
                        <span className="text-[10px] text-[#5c6967]">
                          Max: {selectedCase.claimAmountFormatted}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 max-w-xs">
                        <span className="text-xs font-bold text-[#5c6967]">₹</span>
                        <input
                          type="number"
                          min="1"
                          max={selectedCase.claimAmount}
                          value={adjustedAmount}
                          onChange={(e) => setAdjustedAmount(e.target.value)}
                          placeholder="e.g. 15000"
                          className="w-full border border-[#e3ded4] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#0d3d3a] focus:outline-none focus:border-[#0d6b63] bg-white"
                        />
                      </div>
                      {isAdjustedInvalid && (
                        <p className="text-[10px] text-[#991b1b] font-medium">
                          Please enter an amount between ₹1 and {selectedCase.claimAmountFormatted}.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-[#e3ded4] hover:bg-[#fbf9f4] cursor-pointer">
                  <input
                    type="radio"
                    name="decision"
                    value="docs"
                    checked={decision === 'docs' || decision === 'more_docs'}
                    onChange={() => setDecision('docs')}
                    className="mt-0.5 accent-[#0d6b63]"
                  />
                  <div>
                    <span className="font-bold text-[#0d3d3a] block">
                      Request more documents
                    </span>
                    <span className="text-[#5c6967]">
                      Ask the traveller for additional proof.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-[#e3ded4] hover:bg-[#fbf9f4] cursor-pointer">
                  <input
                    type="radio"
                    name="decision"
                    value="not_eligible"
                    checked={decision === 'not_eligible'}
                    onChange={() => setDecision('not_eligible')}
                    className="mt-0.5 accent-[#0d6b63]"
                  />
                  <div>
                    <span className="font-bold text-[#0d3d3a] block">
                      Close as not eligible
                    </span>
                    <span className="text-[#5c6967]">
                      A reason is required and will be shared with the traveller.
                    </span>
                  </div>
                </label>
              </div>

              {/* Reviewer Note */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-[#0d3d3a] block">
                  Reviewer note (required)
                </label>
                <textarea
                  rows={3}
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  className="w-full border border-[#e3ded4] rounded-lg p-3 text-xs focus:outline-none focus:border-[#0d6b63]"
                />
                <span className="text-[11px] text-[#889593]">
                  The traveller will be notified of this outcome by email
                </span>
              </div>

              {/* Action Buttons (Page 11) */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={!reviewerNote.trim() || isAdjustedInvalid || isSubmitting || isSavingDraft}
                  className="bg-[#0d6b63] text-white px-5 py-2.5 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting…' : 'Confirm and submit'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}

                  disabled={isSavingDraft || isSubmitting}
                  className="bg-white border border-[#e3ded4] text-[#0d3d3a] px-4 py-2.5 rounded-md text-xs font-semibold hover:bg-[#f7f4ed] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingDraft ? 'Saving draft…' : 'Save as draft'}

                  disabled={isSavingDraft}
                  className="bg-white border border-[#e3ded4] text-[#0d3d3a] px-4 py-2.5 rounded-md text-xs font-semibold hover:bg-[#f7f4ed] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                
                  {isSavingDraft ? 'Saving…' : 'Save as draft'}
                </button>
                <button
                  type="button"
                  onClick={handleEscalate}
                  disabled={isSubmitting || isSavingDraft}
                  className="bg-white border border-[#e3ded4] text-[#991b1b] px-4 py-2.5 rounded-md text-xs font-semibold hover:bg-[#fee2e2]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Escalate to senior reviewer
                </button>
              </div>
            </div>

            {/* Case History Log (Page 11) */}
            <div className="space-y-3 pt-4 border-t border-[#e3ded4]">
              <h3 className="text-xs font-bold text-[#0d3d3a] uppercase tracking-wider">
                Case history & Audit Trail
              </h3>

              <div className="space-y-2 text-xs">
                {selectedCase.auditLog && selectedCase.auditLog.length > 0 ? (
                  selectedCase.auditLog.map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-1 text-[#6b7775]">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${log.dotColor || 'bg-[#0d6b63]'}`}></span>
                        <span className="font-medium text-[#0d3d3a]">{log.title}</span>
                        {log.description && <span className="text-[#889593]">({log.description})</span>}
                      </div>
                      <span className="text-[#889593] font-mono text-[11px]">{log.time}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-1 text-[#6b7775]">Initial case intake recorded in audit ledger.</div>
                )}
                {selectedCase.assignedAuditor && (
                  <div className="flex items-center justify-between py-1 text-[#0d6b63] font-semibold border-t border-[#f0ebe1] pt-2">
                    <span>Assigned to {selectedCase.assignedAuditor}</span>
                    <span>Active Queue</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
