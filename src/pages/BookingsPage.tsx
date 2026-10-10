import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { allMockBookings } from '../data/mockBookings';
import { useInvestigation } from '../context/InvestigationContext';

export const BookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectCaseById } = useInvestigation();

  const [bookings] = useState(allMockBookings);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<'all' | 'flight' | 'train' | 'bus'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'disrupted' | 'ontime'>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const handleInspectRefund = (investigationId: string) => {
    selectCaseById(investigationId);
    navigate(`/refund-investigations/${investigationId}`);
  };

  const handleScanGDS = () => {
    setActionSuccessMsg('Carrier GDS scan completed: 1,428 bookings verified across Amadeus & IRCTC.');
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.pnr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.traveler.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.carrier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.carrier.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.carrier.route.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMode = selectedMode === 'all' || b.carrier.type === selectedMode;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'disrupted' && b.status !== 'Confirmed / On Time') ||
      (statusFilter === 'ontime' && b.status === 'Confirmed / On Time');

    return matchesSearch && matchesMode && matchesStatus;
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
              Live Telemetry Tracking
            </span>
            <span className="font-code-sm text-xs text-on-surface-variant/70">
              1,428 Active Itineraries
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight font-bold">
            Travel Bookings Ledger
          </h1>
          <p className="font-body-md text-sm sm:text-body-md text-on-surface-variant">
            Continuous GDS monitoring for cancellations, delays, and schedule alterations across flights, trains, and buses.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-space-sm">
          <button
            onClick={handleScanGDS}
            className="flex items-center gap-space-xs bg-surface-container-lowest text-on-surface font-label-md text-xs sm:text-sm px-space-md py-2.5 rounded-full shadow-sm hover:bg-surface-container-low transition-colors border border-surface-container cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">sync</span>
            <span>Scan Carrier GDS</span>
          </button>

          <button
            onClick={() => alert('Exporting bookings ledger CSV/Excel...')}
            className="flex items-center gap-space-xs bg-surface-container-lowest text-on-surface font-label-md text-xs sm:text-sm px-space-md py-2.5 rounded-full shadow-sm hover:bg-surface-container-low transition-colors border border-surface-container cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">ios_share</span>
            <span>Export Bookings</span>
          </button>

          <button
            onClick={() => navigate('/refund-investigations/AT-9842')}
            className="flex items-center gap-space-xs bg-primary-container text-on-primary-container font-label-md text-xs sm:text-sm font-bold px-space-lg py-2.5 rounded-full shadow-sm hover:shadow-md hover:bg-primary-fixed-dim transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Audit New Booking</span>
          </button>
        </div>
      </section>

      {/* 4-Metric Grid Architecture */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md text-left">
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">Monitored Bookings</span>
            <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-[20px]">flight_takeoff</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">1,428</span>
            <span className="font-body-sm text-xs text-on-surface-variant mt-1">Flights, trains & luxury buses</span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Audit Coverage</span>
            <span className="text-primary font-semibold">100% Monitored</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">Disrupted / Flagged</span>
            <div className="w-9 h-9 rounded-xl bg-error-container flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">42</span>
            <span className="font-body-sm text-xs text-error font-medium mt-1">Cancellations & major delays</span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Eligible for Refund</span>
            <span className="text-error font-semibold">100% Claim Actionable</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">Refunds Recovered</span>
            <div className="w-9 h-9 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary font-semibold">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">₹56.8L</span>
            <span className="font-body-sm text-xs text-primary font-medium mt-1">Direct corporate restitution</span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Automated Clearance</span>
            <span className="text-primary font-semibold">98.2% Resolution</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-sm text-on-surface-variant font-medium">Telemetry Sync</span>
            <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">radar</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight font-bold">Live</span>
            <span className="font-body-sm text-xs text-secondary font-medium mt-1">Amadeus, IRCTC & RedBus sync</span>
          </div>
          <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-xs text-on-surface-variant/80 border-t border-surface-container">
            <span>Telemetry Ping</span>
            <span className="text-on-surface font-semibold">&lt; 15 seconds</span>
          </div>
        </div>
      </section>

      {/* Main Bookings Ledger Table Section */}
      <section className="bg-surface-container-lowest rounded-3xl p-space-lg sm:p-space-xl shadow-sm border border-surface-container flex flex-col gap-space-lg">
        {/* Table Search & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div>
            <h3 className="font-headline-md text-xl sm:text-headline-md font-bold text-on-surface tracking-tight">
              Audited Bookings Ledger
            </h3>
            <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant">
              Every passenger itinerary synchronized from partner APIs with automated disruption audits
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            {/* Search Input */}
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-2 rounded-full min-w-[240px] border border-surface-container">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
              <input
                className="bg-transparent font-body-sm text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none w-full"
                placeholder="Search PNR, traveler, carrier, route..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-surface-container-low text-on-surface font-label-md text-xs sm:text-sm px-space-md py-2 rounded-full focus:outline-none border border-surface-container cursor-pointer"
            >
              <option value="all">All Disruption Statuses</option>
              <option value="disrupted">Disrupted / Flagged Only</option>
              <option value="ontime">On-Time Bookings</option>
            </select>
          </div>
        </div>

        {/* Mode Filter Pills */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-space-xs">
          <button
            onClick={() => setSelectedMode('all')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedMode === 'all'
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
            }`}
            type="button"
          >
            All Modes (1,428)
          </button>
          <button
            onClick={() => setSelectedMode('flight')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedMode === 'flight'
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">flight</span>
            <span>Flights (942)</span>
          </button>
          <button
            onClick={() => setSelectedMode('train')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedMode === 'train'
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">train</span>
            <span>Rail / Trains (364)</span>
          </button>
          <button
            onClick={() => setSelectedMode('bus')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedMode === 'bus'
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">directions_bus</span>
            <span>Intercity Buses (122)</span>
          </button>
        </div>

        {/* Bookings Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-xs sm:text-sm">
            <thead>
              <tr className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider bg-surface-container-low rounded-xl">
                <th className="py-space-md px-space-md rounded-l-xl">PNR / Booking Ref</th>
                <th className="py-space-md px-space-md">Traveler</th>
                <th className="py-space-md px-space-md">Carrier & Route</th>
                <th className="py-space-md px-space-md">Journey Date</th>
                <th className="py-space-md px-space-md">Fare Paid</th>
                <th className="py-space-md px-space-md">Flight/Trip Status</th>
                <th className="py-space-md px-space-md">Refund Audit Status</th>
                <th className="py-space-md px-space-md rounded-r-xl text-right">Investigation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {filteredBookings.map((item) => (
                <tr key={item.id} className="hover:bg-surface-container-low/60 transition-colors">
                  {/* PNR */}
                  <td className="py-space-md px-space-md">
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-sm font-bold text-on-surface">PNR: {item.pnr}</span>
                      <span className="font-code-sm text-[11px] text-on-surface-variant">{item.bookingRef}</span>
                    </div>
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
                      <span className="p-1.5 rounded-lg bg-surface-container text-on-surface">
                        <span className="material-symbols-outlined text-[16px]">
                          {item.carrier.type === 'train'
                            ? 'train'
                            : item.carrier.type === 'bus'
                            ? 'directions_bus'
                            : 'flight'}
                        </span>
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface text-xs sm:text-sm">
                          {item.carrier.name} ({item.carrier.code})
                        </span>
                        <span className="text-[11px] text-on-surface-variant">{item.carrier.route}</span>
                      </div>
                    </div>
                  </td>

                  {/* Journey Date */}
                  <td className="py-space-md px-space-md">
                    <div className="flex flex-col">
                      <span className="text-on-surface font-medium text-xs sm:text-sm">{item.journeyDate}</span>
                      <span className="text-[11px] text-on-surface-variant">Seat: {item.carrier.seat}</span>
                    </div>
                  </td>

                  {/* Fare */}
                  <td className="py-space-md px-space-md">
                    <span className="font-semibold text-on-surface">{item.amountFormatted}</span>
                  </td>

                  {/* Trip Status */}
                  <td className="py-space-md px-space-md">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-xs font-semibold ${
                        item.status.includes('Cancelled')
                          ? 'bg-error-container text-on-error-container'
                          : item.status.includes('Delay') || item.status.includes('Grounded') || item.status.includes('Missed')
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-primary-fixed/40 text-on-primary-fixed-variant'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status.includes('Cancelled')
                            ? 'bg-error'
                            : item.status.includes('Delay')
                            ? 'bg-amber-600'
                            : 'bg-primary'
                        }`}
                      ></span>
                      {item.status}
                    </span>
                  </td>

                  {/* Refund Audit Status */}
                  <td className="py-space-md px-space-md">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-xs font-semibold ${
                        item.refundStatus === 'Full Refund Eligible' || item.refundStatus === 'Disbursed'
                          ? 'bg-primary-container/30 text-primary font-bold'
                          : item.refundStatus === 'In Review' || item.refundStatus === 'Under Investigation'
                          ? 'bg-secondary-fixed text-on-secondary-fixed'
                          : item.refundStatus === 'TDR Auto-Filed'
                          ? 'bg-secondary-fixed-dim/40 text-on-secondary-fixed-variant'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {item.refundStatus}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-space-md px-space-md text-right">
                    {item.relatedInvestigationId ? (
                      <button
                        onClick={() => handleInspectRefund(item.relatedInvestigationId!)}
                        className="px-space-md py-1.5 rounded-full bg-primary-container hover:bg-primary-fixed-dim text-on-primary-container font-label-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
                        type="button"
                      >
                        Inspect Refund
                      </button>
                    ) : (
                      <button
                        onClick={() => alert(`PNR ${item.pnr} itinerary is on-time. No disruption claim detected.`)}
                        className="px-space-md py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                        type="button"
                      >
                        Audit Policy
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-xs border-t border-surface-container">
          <span className="font-body-sm text-xs text-on-surface-variant">
            Showing <strong className="text-on-surface font-semibold">1–{filteredBookings.length}</strong> of 1,428 monitored travel bookings
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
