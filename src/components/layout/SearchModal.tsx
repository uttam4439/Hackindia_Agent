import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvestigation } from '../../context/InvestigationContext';

export const SearchModal: React.FC = () => {
  const { isSearchModalOpen, setIsSearchModalOpen, cases, selectCaseById } = useInvestigation();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Listen for ⌘K or Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchModalOpen]);

  if (!isSearchModalOpen) return null;

  const filteredCases = cases.filter(
    (c) =>
      c.caseRef.toLowerCase().includes(query.toLowerCase()) ||
      c.pnr.toLowerCase().includes(query.toLowerCase()) ||
      c.traveler.name.toLowerCase().includes(query.toLowerCase()) ||
      c.carrier.name.toLowerCase().includes(query.toLowerCase()) ||
      c.carrier.code.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectCase = (id: string) => {
    selectCaseById(id);
    setIsSearchModalOpen(false);
    navigate(`/refund-investigations/${id}`);
  };

  const handleNavigatePage = (path: string) => {
    setIsSearchModalOpen(false);
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-surface-container-lowest rounded-3xl shadow-2xl border border-surface-container-high overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Box */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-container">
          <span className="material-symbols-outlined text-[24px] text-primary">search</span>
          <input
            autoFocus
            type="text"
            className="w-full bg-transparent font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none"
            placeholder="Search cases, PNR, carrier, passenger, or jump to page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={() => setIsSearchModalOpen(false)}
            className="px-2 py-1 rounded-md bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container"
          >
            ESC
          </button>
        </div>

        {/* Quick Links & Results */}
        <div className="max-h-96 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Quick Page Jump */}
          <div>
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline px-2">
              Platform Views
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              <button
                onClick={() => handleNavigatePage('/dashboard')}
                className="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-left text-xs font-semibold text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">grid_view</span>
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => handleNavigatePage('/refund-investigations/AT-9842')}
                className="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-left text-xs font-semibold text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">policy</span>
                <span>Case Detail</span>
              </button>
              <button
                onClick={() => handleNavigatePage('/reviews')}
                className="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-left text-xs font-semibold text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">rate_review</span>
                <span>Human Review</span>
              </button>
              <button
                onClick={() => handleNavigatePage('/analytics')}
                className="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-left text-xs font-semibold text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">monitoring</span>
                <span>Analytics</span>
              </button>
            </div>
          </div>

          {/* Investigation Results */}
          <div>
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">
                Investigation Cases ({filteredCases.length})
              </span>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {filteredCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCase(c.id)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low hover:bg-primary-container/15 hover:border-primary-container/40 border border-transparent transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-surface-container-high group-hover:bg-primary-container/30 flex items-center justify-center font-bold text-xs text-on-surface">
                      {c.traveler.initials}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-on-surface">{c.caseRef}</span>
                        <span className="text-xs font-mono text-outline">PNR: {c.pnr}</span>
                        <span className="text-xs text-on-surface font-medium">• {c.traveler.name}</span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        {c.carrier.name} ({c.carrier.route}) • {c.claimAmountFormatted}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface">
                      {c.riskLevel}
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary transition-colors">
                      arrow_forward
                    </span>
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
