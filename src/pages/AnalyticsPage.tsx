import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState('Last 30 Days');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(5); // Default to Oct 24 peak

  const timeframeOptions = ['Last 7 Days', 'Last 30 Days', 'Current Quarter', 'Year to Date'];

  const handleCycleTimeframe = () => {
    const currentIndex = timeframeOptions.indexOf(timeframe);
    const nextIndex = (currentIndex + 1) % timeframeOptions.length;
    setTimeframe(timeframeOptions[nextIndex]);
  };

  return (
    <div className="flex flex-col w-full pb-16 text-left">
      {/* Top Breadcrumb & Executive Header Controls */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-space-md py-space-sm mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-label-sm text-[11px] uppercase tracking-wider text-outline">
            <span className="hover:text-on-surface cursor-pointer transition-colors">Analytics</span>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface-variant font-semibold">Refund Operations & Governance</span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface font-bold tracking-tight">
            Refund Analytics
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-2xl">
            Monitor refund outcomes, investigation risk, AI recommendations, and human review performance.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-space-sm shrink-0">
          <button
            onClick={handleCycleTimeframe}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-xs sm:text-sm shadow-sm hover:bg-surface-container-low transition-all cursor-pointer border border-surface-container"
            type="button"
          >
            <span className="material-symbols-outlined text-outline text-[18px]">calendar_today</span>
            <span>{timeframe}</span>
            <span className="material-symbols-outlined text-outline text-[18px]">expand_more</span>
          </button>

          <button
            onClick={() => alert('Generating analytical ledger report (PDF / CSV)...')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-inverse-surface text-inverse-on-surface hover:bg-on-surface font-label-md text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Report</span>
          </button>
        </div>
      </header>

      {/* TOP KPI METRIC CARDS (4-Column Bento Grid) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-gutter my-space-md">
        {/* Card 1: Total Investigations */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs uppercase tracking-wider text-outline font-semibold">
              Total Investigations
            </span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">troubleshoot</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-3">
              <span className="font-metric-display text-metric-display text-on-surface font-bold tracking-tight">
                1,428
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#f7fee7] text-[#3f6212] font-label-sm text-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                12.4%
              </span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
              Investigation cases evaluated
            </p>
          </div>
        </div>

        {/* Card 2: Refunds Approved */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs uppercase tracking-wider text-outline font-semibold">
              Refunds Approved
            </span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">currency_rupee</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-3">
              <span className="font-metric-display text-metric-display text-on-surface font-bold tracking-tight">
                ₹56.8L
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#f7fee7] text-[#3f6212] font-label-sm text-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                8.7%
              </span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
              Avg turnaround: 4.2 mins
            </p>
          </div>
        </div>

        {/* Card 3: Approval Rate */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs uppercase tracking-wider text-outline font-semibold">
              Approval Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-3">
              <span className="font-metric-display text-metric-display text-on-surface font-bold tracking-tight">
                78.4%
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#f7fee7] text-[#3f6212] font-label-sm text-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                4.2%
              </span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
              1,119 refunds approved
            </p>
          </div>
        </div>

        {/* Card 4: High-Risk Cases */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs uppercase tracking-wider text-outline font-semibold">
              High-Risk Cases
            </span>
            <div className="w-8 h-8 rounded-lg bg-error-container/40 flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[18px]">security_update_warning</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-3">
              <span className="font-metric-display text-metric-display text-on-surface font-bold tracking-tight">
                3
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#f7fee7] text-[#3f6212] font-label-sm text-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                -18%
              </span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
              Requires human review
            </p>
          </div>
        </div>
      </section>

      {/* ROW 1: Trends (2/3) + Risk Distribution (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-gutter my-space-sm">
        {/* Section 1: Refund Investigation Trend */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
            <div>
              <h2 className="font-headline-sm text-base sm:text-headline-sm text-on-surface font-semibold">
                Refund Investigation Trend
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Daily volume of automated investigations vs. approved refund value over the last 30 days
              </p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 shrink-0 font-label-sm text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary-container"></span>
                <span className="text-on-surface-variant">Investigations (Cases)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-inverse-surface"></span>
                <span className="text-on-surface-variant">Refund Amount (₹ Lakhs)</span>
              </div>
            </div>
          </div>

          {/* Rich SVG Chart Container */}
          <div className="relative w-full h-72 pt-4">
            {/* Peak Tooltip Indicator */}
            {hoveredPoint === 5 && (
              <div className="absolute left-[74%] top-4 -translate-x-1/2 z-10 hidden sm:flex flex-col items-center pointer-events-none animate-fade-in">
                <div className="px-3 py-1.5 rounded-xl bg-inverse-surface text-inverse-on-surface shadow-xl flex flex-col gap-0.5 items-center text-center border border-white/10">
                  <span className="font-code-sm text-[11px] text-primary-fixed-dim font-bold">Oct 24 • Peak Session</span>
                  <span className="font-label-sm text-xs font-semibold">64 investigations, ₹2.4L approved</span>
                </div>
                <div className="w-2 h-2 bg-inverse-surface rotate-45 -mt-1"></div>
                <div className="w-px h-28 bg-primary-container/80 border-dashed border-l border-primary-container"></div>
                <div className="w-3 h-3 rounded-full bg-primary-container ring-4 ring-primary-container/30 -mt-1.5"></div>
              </div>
            )}

            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 240">
              <defs>
                <linearGradient id="limeAreaGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#84cc16" stopOpacity="0.35"></stop>
                  <stop offset="100%" stopColor="#84cc16" stopOpacity="0.0"></stop>
                </linearGradient>
                <linearGradient id="slateAreaGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#2d3133" stopOpacity="0.18"></stop>
                  <stop offset="100%" stopColor="#2d3133" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              <line stroke="#e0e3e5" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="690" y1="20" y2="20"></line>
              <line stroke="#e0e3e5" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="690" y1="70" y2="70"></line>
              <line stroke="#e0e3e5" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="690" y1="120" y2="120"></line>
              <line stroke="#e0e3e5" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="690" y1="170" y2="170"></line>
              <line stroke="#c1cab0" strokeWidth="1" x1="40" x2="690" y1="210" y2="210"></line>

              {/* Y-Axis Labels */}
              <text className="fill-outline font-code-sm text-[10px]" textAnchor="end" x="32" y="24">80</text>
              <text className="fill-outline font-code-sm text-[10px]" textAnchor="end" x="32" y="74">60</text>
              <text className="fill-outline font-code-sm text-[10px]" textAnchor="end" x="32" y="124">40</text>
              <text className="fill-outline font-code-sm text-[10px]" textAnchor="end" x="32" y="174">20</text>
              <text className="fill-outline font-code-sm text-[10px]" textAnchor="end" x="32" y="214">0</text>

              {/* Area 1: Amount (₹ Lakhs) */}
              <path
                d="M 50 185 Q 110 160 160 170 T 270 140 T 380 120 T 490 85 T 570 65 T 670 110 L 670 210 L 50 210 Z"
                fill="url(#slateAreaGrad)"
              ></path>
              <path
                d="M 50 185 Q 110 160 160 170 T 270 140 T 380 120 T 490 85 T 570 65 T 670 110"
                fill="none"
                stroke="#2d3133"
                strokeLinecap="round"
                strokeWidth="2.5"
              ></path>

              {/* Area 2: Investigations (Cases) */}
              <path
                d="M 50 170 Q 110 130 160 145 T 270 100 T 380 90 T 490 60 T 570 40 T 670 80 L 670 210 L 50 210 Z"
                fill="url(#limeAreaGrad)"
              ></path>
              <path
                d="M 50 170 Q 110 130 160 145 T 270 100 T 380 90 T 490 60 T 570 40 T 670 80"
                fill="none"
                stroke="#84cc16"
                strokeLinecap="round"
                strokeWidth="3"
              ></path>

              {/* Interactive Plotted Points */}
              <circle cx="50" cy="170" fill="#84cc16" r="4" className="cursor-pointer" onClick={() => setHoveredPoint(0)}></circle>
              <circle cx="160" cy="145" fill="#84cc16" r="4" className="cursor-pointer" onClick={() => setHoveredPoint(1)}></circle>
              <circle cx="270" cy="100" fill="#84cc16" r="4" className="cursor-pointer" onClick={() => setHoveredPoint(2)}></circle>
              <circle cx="380" cy="90" fill="#84cc16" r="4" className="cursor-pointer" onClick={() => setHoveredPoint(3)}></circle>
              <circle cx="490" cy="60" fill="#84cc16" r="4" className="cursor-pointer" onClick={() => setHoveredPoint(4)}></circle>
              <circle cx="570" cy="40" fill="#84cc16" r="5" className="cursor-pointer stroke-surface-container-lowest stroke-2" onClick={() => setHoveredPoint(5)}></circle>
              <circle cx="670" cy="80" fill="#84cc16" r="4" className="cursor-pointer" onClick={() => setHoveredPoint(6)}></circle>
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between pl-10 pr-2 pt-2 text-outline font-code-sm text-[11px]">
              <span>Oct 1</span>
              <span>Oct 5</span>
              <span>Oct 10</span>
              <span>Oct 15</span>
              <span>Oct 20</span>
              <span className="font-semibold text-on-surface">Oct 24</span>
              <span>Oct 30</span>
            </div>
          </div>
        </div>

        {/* Section 2: Risk Distribution Donut */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div>
            <h2 className="font-headline-sm text-base sm:text-headline-sm text-on-surface font-semibold">
              Risk Distribution
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant">Case risk classification breakdown</p>
          </div>

          {/* Donut Chart with Center Metric */}
          <div className="relative flex items-center justify-center my-4">
            <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" fill="transparent" r="62" stroke="#eceef0" strokeWidth="16"></circle>
              {/* Segment 1: Low Risk (72%) = 280.5 */}
              <circle
                cx="80"
                cy="80"
                fill="transparent"
                r="62"
                stroke="#84cc16"
                strokeDasharray="280.5 389.56"
                strokeDashoffset="0"
                strokeWidth="16"
              ></circle>
              {/* Segment 2: Medium Risk (18%) = 70.1 */}
              <circle
                cx="80"
                cy="80"
                fill="transparent"
                r="62"
                stroke="#f59e0b"
                strokeDasharray="70.1 389.56"
                strokeDashoffset="-280.5"
                strokeWidth="16"
              ></circle>
              {/* Segment 3: High Risk (4%) = 15.6 */}
              <circle
                cx="80"
                cy="80"
                fill="transparent"
                r="62"
                stroke="#ef4444"
                strokeDasharray="15.6 389.56"
                strokeDashoffset="-350.6"
                strokeWidth="16"
              ></circle>
              {/* Segment 4: Insufficient Evidence (6%) = 23.4 */}
              <circle
                cx="80"
                cy="80"
                fill="transparent"
                r="62"
                stroke="#94a3b8"
                strokeDasharray="23.4 389.56"
                strokeDashoffset="-366.2"
                strokeWidth="16"
              ></circle>
            </svg>

            {/* Centered Metric Inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-headline-md text-xl sm:text-headline-md font-bold text-on-surface">1,428</span>
              <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider">
                Cases Evaluated
              </span>
            </div>
          </div>

          {/* Breakdown Legend Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-surface-container text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                <span className="font-medium text-on-surface">Low Risk</span>
              </div>
              <div className="flex items-center gap-2 font-code-sm">
                <span className="text-on-surface-variant">1,028 cases</span>
                <span className="font-semibold text-on-surface bg-surface-container-lowest px-2 py-0.5 rounded-full border border-surface-container">
                  72%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-surface-container text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                <span className="font-medium text-on-surface">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2 font-code-sm">
                <span className="text-on-surface-variant">257 cases</span>
                <span className="font-semibold text-on-surface bg-surface-container-lowest px-2 py-0.5 rounded-full border border-surface-container">
                  18%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-surface-container text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                <span className="font-medium text-on-surface">High Risk</span>
              </div>
              <div className="flex items-center gap-2 font-code-sm">
                <span className="text-on-surface-variant">57 cases</span>
                <span className="font-semibold text-error bg-error-container/40 px-2 py-0.5 rounded-full">
                  4%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-surface-container text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]"></span>
                <span className="font-medium text-on-surface">Insufficient Evidence</span>
              </div>
              <div className="flex items-center gap-2 font-code-sm">
                <span className="text-on-surface-variant">86 cases</span>
                <span className="font-semibold text-on-surface bg-surface-container-lowest px-2 py-0.5 rounded-full border border-surface-container">
                  6%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROW 2: Refund Outcomes (1/2) + AI Performance (1/2) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-space-gutter my-space-sm">
        {/* Section 3: Refund Outcomes */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h2 className="font-headline-sm text-base sm:text-headline-sm text-on-surface font-semibold">
                Refund Outcomes
              </h2>
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Final Disposition</span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant my-4">
              Distribution across final resolution pathways
            </p>

            {/* Progress Bars */}
            <div className="space-y-4">
              {/* Full Refund: 61% */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="font-medium text-on-surface flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                    Full Refund
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant font-code-sm">871 cases</span>
                    <span className="font-semibold text-on-primary-container bg-primary-container/20 px-2 py-0.5 rounded-full">
                      61%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: '61%' }}></div>
                </div>
              </div>

              {/* Partial Refund: 17% */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="font-medium text-on-surface flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                    Partial Refund
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant font-code-sm">243 cases</span>
                    <span className="font-semibold text-[#065f46] bg-[#d1fae5] px-2 py-0.5 rounded-full">
                      17%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-[#10b981] rounded-full" style={{ width: '17%' }}></div>
                </div>
              </div>

              {/* Manual Review: 14% */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="font-medium text-on-surface flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                    Manual Review
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant font-code-sm">200 cases</span>
                    <span className="font-semibold text-on-secondary-container bg-secondary/15 px-2 py-0.5 rounded-full">
                      14%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '14%' }}></div>
                </div>
              </div>

              {/* Rejected: 8% */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="font-medium text-on-surface flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                    Rejected
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant font-code-sm">114 cases</span>
                    <span className="font-semibold text-error bg-error-container/40 px-2 py-0.5 rounded-full">
                      8%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-error rounded-full" style={{ width: '8%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-container flex items-center justify-between text-on-surface-variant font-body-sm text-xs">
            <span>Straight-through processing index: <strong className="text-on-surface">78.0%</strong></span>
            <span className="text-primary font-semibold">1,214 Direct Dispatches</span>
          </div>
        </div>

        {/* Section 4: AI Investigation Performance */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-container">
              <h2 className="font-headline-sm text-base sm:text-headline-sm text-on-surface font-semibold">
                AI Investigation Performance
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs font-semibold">
                <span className="material-symbols-outlined text-[15px]">verified_user</span>
                AI advises, human authorizes
              </span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant my-4">
              Investigation & recommendation accuracy prior to human authorization
            </p>

            {/* Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex flex-col">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Completed</span>
                <span className="font-headline-sm text-base sm:text-lg font-bold text-on-surface mt-1">1,428</span>
                <span className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">100% ingested</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex flex-col">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Strong Evidence</span>
                <span className="font-headline-sm text-base sm:text-lg font-bold text-on-surface mt-1">1,214</span>
                <span className="font-body-sm text-[11px] text-primary font-medium mt-0.5">85.0% certainty</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex flex-col">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Human Escalations</span>
                <span className="font-headline-sm text-base sm:text-lg font-bold text-on-surface mt-1">186</span>
                <span className="font-body-sm text-[11px] text-secondary font-medium mt-0.5">13.0% flagged</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex flex-col">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Evidence Feeds</span>
                <span className="font-headline-sm text-base sm:text-lg font-bold text-on-surface mt-1">4.6 / 5</span>
                <span className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">Avg cross-checks</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex flex-col col-span-2">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Recommendation Acceptance</span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-headline-sm text-base font-bold text-primary">82%</span>
                  <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary-container rounded-full" style={{ width: '82%' }}></div>
                  </div>
                </div>
                <span className="font-body-sm text-[11px] text-on-surface-variant mt-1">
                  Direct consensus with auditor sign-offs
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-3">
            <span className="material-symbols-outlined text-outline text-[20px] shrink-0 mt-0.5">info</span>
            <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
              The AI conducts automated data cross-checks (GDS, payment gateway, carrier cancellation bulletins, and fare rules) and generates a structured recommendation. Final disbursement authority remains with accredited human auditors.
            </p>
          </div>
        </div>
      </section>

      {/* ROW 3: Human Review Log (2/3) + Insights (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-gutter my-space-sm">
        {/* Section 5: Recent Human Review Outcomes Table */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div>
                <h2 className="font-headline-sm text-base sm:text-headline-sm text-on-surface font-semibold">
                  Recent Human Review Outcomes
                </h2>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Auditor determination log on flagged & escalation cases
                </p>
              </div>
              <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider hidden sm:inline-block">
                5 Most Recent
              </span>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left font-body-md text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 rounded-l-xl">Case ID</th>
                    <th className="py-3 px-4">Recommendation</th>
                    <th className="py-3 px-4">Final Outcome</th>
                    <th className="py-3 px-4 text-right">Refund Amount</th>
                    <th className="py-3 px-4 rounded-r-xl">Auditor Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container/60">
                  <tr
                    onClick={() => navigate('/refund-investigations/AT-9842')}
                    className="hover:bg-surface-container-low/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-code-sm font-semibold text-secondary hover:underline">
                      #AT-9842
                    </td>
                    <td className="py-3.5 px-4 font-body-sm text-on-surface">Full Refund</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f7fee7] text-[#3f6212] font-label-sm text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                        Approved
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-code-sm font-semibold text-right text-on-surface">₹9,450</td>
                    <td className="py-3.5 px-4 font-body-sm text-xs text-on-surface-variant truncate max-w-xs">
                      Carrier cancellation confirmed via airline advisory
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3.5 px-4 font-code-sm font-semibold text-secondary">#AT-9837</td>
                    <td className="py-3.5 px-4 font-body-sm text-on-surface">Partial Refund</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f7fee7] text-[#3f6212] font-label-sm text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                        Approved
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-code-sm font-semibold text-right text-on-surface">₹4,200</td>
                    <td className="py-3.5 px-4 font-body-sm text-xs text-on-surface-variant truncate max-w-xs">
                      Pro-rated non-refundable segment deducted
                    </td>
                  </tr>

                  <tr
                    onClick={() => navigate('/reviews')}
                    className="hover:bg-surface-container-low/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-code-sm font-semibold text-secondary hover:underline">
                      #AT-9829
                    </td>
                    <td className="py-3.5 px-4 font-body-sm text-on-surface">Full Refund</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        Manual Review
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-code-sm font-semibold text-right text-on-surface">₹18,500</td>
                    <td className="py-3.5 px-4 font-body-sm text-xs text-on-surface-variant truncate max-w-xs">
                      High-value corporate ticket routed for senior audit
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3.5 px-4 font-code-sm font-semibold text-secondary">#AT-9818</td>
                    <td className="py-3.5 px-4 font-body-sm text-on-surface">Full Refund</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container/40 text-error font-label-sm text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                        Rejected
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-code-sm font-semibold text-right text-on-surface">₹12,000</td>
                    <td className="py-3.5 px-4 font-body-sm text-xs text-on-surface-variant truncate max-w-xs">
                      Passenger no-show prior to flight reschedule
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3.5 px-4 font-code-sm font-semibold text-secondary">#AT-9805</td>
                    <td className="py-3.5 px-4 font-body-sm text-on-surface">Full Refund</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f7fee7] text-[#3f6212] font-label-sm text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                        Approved
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-code-sm font-semibold text-right text-on-surface">₹6,800</td>
                    <td className="py-3.5 px-4 font-body-sm text-xs text-on-surface-variant truncate max-w-xs">
                      Weather cancellation verified by air traffic feed
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-container flex items-center justify-between text-xs">
            <span className="font-body-sm text-on-surface-variant">Showing 5 of 186 recent escalations</span>
            <button
              onClick={() => navigate('/reviews')}
              className="inline-flex items-center gap-1.5 font-label-md font-semibold text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <span>View All 186 Reviewed Cases</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Section 6: Investigation Insights */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-surface-container">
              <h2 className="font-headline-sm text-base sm:text-headline-sm text-on-surface font-semibold">
                Investigation Insights
              </h2>
              <span className="material-symbols-outlined text-outline text-[20px]">lightbulb</span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant my-4">Case risk classification breakdown</p>

            {/* 3 Insight Cards */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-on-primary-container text-[18px]">speed</span>
                </div>
                <div>
                  <h3 className="font-label-md text-xs font-semibold text-on-surface">Low Risk Majority</h3>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Most investigations are classified as Low Risk (72%), enabling rapid straight-through verification workflows.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-lg bg-[#d1fae5] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[#065f46] text-[18px]">fact_check</span>
                </div>
                <div>
                  <h3 className="font-label-md text-xs font-semibold text-on-surface">Strong Evidence Correlation</h3>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Strong evidence cases (5/5 verified feeds) have a significantly higher approval rate (96.2%) and near-zero post-settlement dispute rate.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-on-secondary-fixed text-[18px]">gavel</span>
                </div>
                <div>
                  <h3 className="font-label-md text-xs font-semibold text-on-surface">Human Governance Trigger</h3>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-1 leading-relaxed">
                    High-value (&gt;₹15,000) or higher-risk refunds are automatically routed to human reviewers for final verification.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Pipeline Health Status */}
          <div className="mt-6 pt-4 border-t border-surface-container flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>
              <span className="font-label-sm text-on-surface font-medium">Investigation System Online</span>
            </div>
            <span className="font-code-sm text-outline">v2.4.1 Auditor Engine</span>
          </div>
        </div>
      </section>
    </div>
  );
};
