import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { useTravelBooking } from '../context/TravelBookingContext';

interface BusItem {
  id: string;
  catalogTripId?: string;
  operator: string;
  type: string;
  rating: number;
  seatsLeft: string;
  depTime: string;
  boarding: string;
  duration: string;
  arrTime: string;
  drop: string;
  fare: string;
  rawFare: number;
}

export const BusesPage: React.FC = () => {
  const { searchCriteria, setSearchCriteria, openBookingSummary, bookingSuccessAlert, clearBookingSuccessAlert } = useTravelBooking();

  const origin = searchCriteria.origin || 'Bengaluru';
  const destination = searchCriteria.destination || 'Goa';
  const departDate = searchCriteria.departDate || '2026-11-06';
  const passengers = searchCriteria.passengers || '1 passenger';

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [acPreference, setAcPreference] = useState<'all' | 'ac' | 'non-ac'>('all');
  const [seatPreference, setSeatPreference] = useState<'all' | 'sleeper' | 'seater'>('all');
  const [sortOption, setSortOption] = useState<'price_asc' | 'time_asc' | 'duration_asc'>('price_asc');
  const [selectedBusDetails, setSelectedBusDetails] = useState<BusItem | null>(null);

  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const [modOrigin, setModOrigin] = useState(origin);
  const [modDestination, setModDestination] = useState(destination);
  const [modDate, setModDate] = useState(departDate);
  const [modPassengers, setModPassengers] = useState(passengers);

  const [buses, setBuses] = useState<BusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>(
    'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed'
  );

  const displayDateFormatted = (() => {
    const d = new Date(departDate + 'T00:00:00');
    return !isNaN(d.getTime())
      ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      : departDate;
  })();

  const mapCatalogToBus = (t: any): BusItem => ({
    id: t.tripId || t.code || t.id,
    catalogTripId: t.id,
    operator: t.operator || 'InterCity Travels',
    type: t.travelClass || 'AC Sleeper (2+1)',
    rating: 4.6,
    seatsLeft: `${t.availableSeats || 12} seats left`,
    depTime: t.departTime || '21:30',
    boarding: t.origin || origin,
    duration: t.duration || '10h 30m',
    arrTime: t.arriveTime || '08:00',
    drop: t.destination || destination,
    fare: t.fareFormatted || `₹ ${(t.fareAmount || t.basePrice || 1450).toLocaleString('en-IN')}`,
    rawFare: Number(t.fareAmount || t.basePrice || 1450),
  });

  const fetchBuses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/catalog/trips?serviceType=buses');
      if (!res.ok) {
        throw new Error(`Catalog API responded with HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.trips)) {
        setBuses(data.trips.map(mapCatalogToBus));
        if (data.disclaimer) {
          setDisclaimer(data.disclaimer);
        }
      } else {
        throw new Error(data.error || 'Invalid catalog response format');
      }
    } catch (err: any) {
      console.warn('[CATALOG] Failed to fetch live buses:', err.message);
      setError(err.message || 'Unable to connect to bus catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, [origin, destination]);

  const handleBook = (bus: BusItem) => {
    const baseFare = bus.rawFare || parseInt(bus.fare.replace(/[^0-9]/g, '')) || 1450;
    const matchPassengers = passengers.match(/(\d+)/);
    const passengerCount = matchPassengers ? Math.max(1, parseInt(matchPassengers[1], 10)) : 1;
    const totalFare = baseFare * passengerCount;

    openBookingSummary({
      id: bus.id,
      catalogTripId: bus.catalogTripId || bus.id,
      serviceType: 'buses',
      title: `${bus.operator} · ${bus.type}`,
      operator: bus.operator,
      code: `#BUS-${bus.id.toUpperCase()}`,
      route: `${origin} → ${destination}`,
      origin,
      destination,
      departDate,
      departTime: bus.depTime,
      arriveTime: bus.arrTime,
      duration: bus.duration,
      travelClass: bus.type,
      passengers,
      passengerCount,
      baseRatePerUnit: baseFare,
      fareFormatted: `₹ ${totalFare.toLocaleString('en-IN')}`,
      fareAmount: totalFare,
      refundable: true,
      isCatalogDemo: true,
    });
  };

  const parseDurationMinutes = (dur: string) => {
    const hMatch = dur.match(/(\d+)\s*h/i);
    const mMatch = dur.match(/(\d+)\s*m/i);
    const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
    const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
    return hours * 60 + minutes;
  };

  const parseTimeToMinutes = (tm: string) => {
    const [h, m] = tm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const toggleType = (t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
  };

  const filteredBuses = buses.filter((b) => {
    if (selectedTypes.length > 0) {
      const matchType = selectedTypes.some((t) => b.type.toLowerCase().includes(t.toLowerCase().split(' ')[0]));
      if (!matchType) return false;
    }
    if (acPreference === 'ac' && !b.type.toUpperCase().includes('AC')) return false;
    if (acPreference === 'non-ac' && !b.type.toLowerCase().includes('non-ac')) return false;
    if (seatPreference === 'sleeper' && !b.type.toLowerCase().includes('sleeper')) return false;
    if (seatPreference === 'seater' && (!b.type.toLowerCase().includes('seater') && !b.type.toLowerCase().includes('semi-sleeper'))) return false;

    return true;
  });

  const sortedBuses = [...filteredBuses].sort((a, b) => {
    if (sortOption === 'price_asc') return a.rawFare - b.rawFare;
    if (sortOption === 'time_asc') return parseTimeToMinutes(a.depTime) - parseTimeToMinutes(b.depTime);
    if (sortOption === 'duration_asc') return parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration);
    return 0;
  });

  const handleSwapModify = () => {
    const temp = modOrigin;
    setModOrigin(modDestination);
    setModDestination(temp);
  };

  const handleApplyModify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modOrigin.trim() || !modDestination.trim() || !modDate) return;
    setSearchCriteria({
      origin: modOrigin.trim(),
      destination: modDestination.trim(),
      departDate: modDate,
      passengers: modPassengers,
    });
    setIsModifyOpen(false);
  };

  const matchPassengers = passengers.match(/(\d+)/);
  const passengerCount = matchPassengers ? Math.max(1, parseInt(matchPassengers[1], 10)) : 1;

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <SiteHeader activeTab="buses" />

      {bookingSuccessAlert && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-[#0d6b63] text-white font-semibold shadow-xl flex items-center justify-between gap-3 text-sm animate-fade-in max-w-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">directions_bus</span>
            <span>{bookingSuccessAlert}</span>
          </div>
          <button onClick={clearBookingSuccessAlert} className="text-white/80 hover:text-white cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <main className="flex-1 w-full site-container py-6 text-left">
        {/* Breadcrumb */}
        <div className="text-xs text-[#6b7775] mb-2 flex items-center gap-1.5">
          <Link to="/" className="hover:text-[#0d3d3a]">Home</Link>
          <span>›</span>
          <span className="text-[#6b7775]">Buses</span>
          <span>›</span>
          <span className="text-[#0d3d3a] font-medium">{origin} to {destination}</span>
        </div>

        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#e3ded4] gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0d3d3a] tracking-tight">
              Buses from {origin} to {destination}
            </h1>
            <p className="text-xs sm:text-sm text-[#5c6967] mt-0.5">
              {displayDateFormatted} · {passengers} · {sortedBuses.length} bus{sortedBuses.length !== 1 ? 'es' : ''} available
            </p>
          </div>

          <button
            onClick={() => {
              setIsModifyOpen(!isModifyOpen);
              setModOrigin(origin);
              setModDestination(destination);
              setModDate(departDate);
              setModPassengers(passengers);
            }}
            className="self-start sm:self-auto border border-[#0d6b63] text-[#0d6b63] bg-white px-3.5 py-1.5 rounded-md text-xs font-semibold hover:bg-[#e8f2f0] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">{isModifyOpen ? 'close' : 'tune'}</span>
            <span>{isModifyOpen ? 'Close modify' : 'Modify search'}</span>
          </button>
        </div>

        {/* Inline Modify Search Drawer */}
        {isModifyOpen && (
          <form
            onSubmit={handleApplyModify}
            className="my-4 p-4 sm:p-5 bg-white rounded-xl border border-[#0d6b63]/30 shadow-md animate-fade-in text-left space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#e3ded4]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d3d3a] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">directions_bus</span>
                Modify Bus Search
              </span>
              <span className="text-[11px] text-[#889593]">
                Updates seat availability and live schedules
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-3">
                <label className="text-[11px] font-bold text-[#5c6967] block uppercase mb-1">
                  From (City)
                </label>
                <input
                  type="text"
                  value={modOrigin}
                  onChange={(e) => setModOrigin(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e3ded4] rounded-lg focus:outline-none focus:border-[#0d6b63] bg-[#fbf9f4]"
                  placeholder="e.g. Bengaluru"
                />
              </div>

              <div className="lg:col-span-1 flex justify-center pb-0.5">
                <button
                  type="button"
                  onClick={handleSwapModify}
                  title="Swap Cities"
                  className="w-8 h-8 rounded-full border border-[#e3ded4] bg-white hover:bg-[#e8f2f0] text-[#0d6b63] flex items-center justify-center transition-transform hover:rotate-180 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                </button>
              </div>

              <div className="lg:col-span-3">
                <label className="text-[11px] font-bold text-[#5c6967] block uppercase mb-1">
                  To (City)
                </label>
                <input
                  type="text"
                  value={modDestination}
                  onChange={(e) => setModDestination(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e3ded4] rounded-lg focus:outline-none focus:border-[#0d6b63] bg-[#fbf9f4]"
                  placeholder="e.g. Goa"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="text-[11px] font-bold text-[#5c6967] block uppercase mb-1">
                  Journey Date
                </label>
                <input
                  type="date"
                  value={modDate}
                  onChange={(e) => setModDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e3ded4] rounded-lg focus:outline-none focus:border-[#0d6b63] bg-[#fbf9f4]"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="text-[11px] font-bold text-[#5c6967] block uppercase mb-1">
                  Passengers
                </label>
                <select
                  value={modPassengers}
                  onChange={(e) => setModPassengers(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e3ded4] rounded-lg focus:outline-none focus:border-[#0d6b63] bg-[#fbf9f4]"
                >
                  <option value="1 passenger">1 Passenger</option>
                  <option value="2 passengers">2 Passengers</option>
                  <option value="3 passengers">3 Passengers</option>
                  <option value="4 passengers">4 Passengers</option>
                  <option value="6 passengers">6 Passengers (Max)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e3ded4]">
              <button
                type="button"
                onClick={() => setIsModifyOpen(false)}
                className="px-3.5 py-1.5 text-xs text-[#5c6967] hover:text-[#0d3d3a] hover:bg-[#f0ebe1] rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-[#0d6b63] text-white hover:bg-[#0a534d] rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[15px]">check</span>
                <span>Update Results</span>
              </button>
            </div>
          </form>
        )}

        {/* 2-Column Split: Filters + Bus Cards (Page 18) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          {/* Left Filters */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-xl border border-[#e3ded4] p-4 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#e3ded4]">
                <h3 className="font-bold text-[#0d3d3a]">Filters</h3>
                <button
                  onClick={() => {
                    setSelectedTypes([]);
                    setAcPreference('all');
                    setSeatPreference('all');
                  }}
                  className="text-[#0d6b63] hover:underline font-semibold"
                >
                  Clear all
                </button>
              </div>

              {/* AC Preference Filter */}
              <div className="space-y-2">
                <label className="font-bold text-[#0d3d3a] uppercase tracking-wider block">AC Preference</label>
                <div className="flex items-center gap-1 bg-[#fbf9f4] p-1 rounded-lg border border-[#e3ded4]">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'ac', label: 'AC' },
                    { id: 'non-ac', label: 'Non-AC' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAcPreference(opt.id as any)}
                      className={`flex-1 py-1 text-center font-medium rounded transition-colors ${
                        acPreference === opt.id
                          ? 'bg-[#0d6b63] text-white font-semibold'
                          : 'text-[#5c6967] hover:text-[#0d3d3a]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seater / Sleeper Preference Filter */}
              <div className="space-y-2 pt-2 border-t border-[#e3ded4]">
                <label className="font-bold text-[#0d3d3a] uppercase tracking-wider block">Seat Type</label>
                <div className="flex items-center gap-1 bg-[#fbf9f4] p-1 rounded-lg border border-[#e3ded4]">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'sleeper', label: 'Sleeper' },
                    { id: 'seater', label: 'Seater' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSeatPreference(opt.id as any)}
                      className={`flex-1 py-1 text-center font-medium rounded transition-colors ${
                        seatPreference === opt.id
                          ? 'bg-[#0d6b63] text-white font-semibold'
                          : 'text-[#5c6967] hover:text-[#0d3d3a]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bus Type */}
              <div className="space-y-2 pt-2 border-t border-[#e3ded4]">
                <label className="font-bold text-[#0d3d3a] uppercase tracking-wider block">Bus type</label>
                {['AC Sleeper', 'Volvo / Multi-Axle', 'AC Semi-Sleeper', 'Non-AC'].map((bt) => (
                  <label key={bt} className="flex items-center gap-2 cursor-pointer text-[#42504e]">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(bt)}
                      onChange={() => toggleType(bt)}
                      className="accent-[#0d6b63] rounded"
                    />
                    <span>{bt}</span>
                  </label>
                ))}
              </div>

              {/* Departure Time */}
              <div className="space-y-2 pt-2 border-t border-[#e3ded4]">
                <label className="font-bold text-[#0d3d3a] uppercase tracking-wider block">Departure time</label>
                {['Evening · 18–22', 'Night · 22–06', 'Morning · 06–12'].map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer text-[#42504e]">
                    <input type="checkbox" defaultChecked className="accent-[#0d6b63] rounded" />
                    <span>{t}</span>
                  </label>
                ))}
              </div>

              {/* Boarding Point */}
              <div className="space-y-2 pt-2 border-t border-[#e3ded4]">
                <label className="font-bold text-[#0d3d3a] uppercase tracking-wider block">Boarding point</label>
                {['Majestic', 'Silk Board', 'Madiwala'].map((bp) => (
                  <label key={bp} className="flex items-center gap-2 cursor-pointer text-[#42504e]">
                    <input type="checkbox" defaultChecked className="accent-[#0d6b63] rounded" />
                    <span>{bp}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Bus Cards */}
          <div className="lg:col-span-9 space-y-4">
            {/* Demo Catalog Disclaimer Banner */}
            <div className="py-2.5 px-4 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-xs text-[#065f46] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#059669]">info</span>
                <span className="font-medium">{disclaimer}</span>
              </div>
              <span className="hidden sm:inline-block text-[11px] font-semibold text-[#047857] uppercase tracking-wider bg-white/70 px-2 py-0.5 rounded">
                Verified AWS DynamoDB Catalog
              </span>
            </div>

            {/* Error State */}
            {error && (
              <div className="p-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-xs sm:text-sm text-[#991b1b] flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#dc2626]">error</span>
                  <span>Failed to load bus inventory: {error}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchBuses}
                  className="bg-[#dc2626] text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-[#b91c1c] transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading Skeletons */}
            {loading && (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm animate-pulse space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-4 bg-[#e5e0d8] rounded w-44" />
                        <div className="h-3 bg-[#e5e0d8] rounded w-28" />
                      </div>
                      <div className="h-6 bg-[#e5e0d8] rounded w-20" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sorting Toolbar */}
            {!loading && !error && sortedBuses.length > 0 && (
              <div className="bg-white rounded-xl border border-[#e3ded4] p-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#0d3d3a] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">swap_vert</span>
                    Sort by:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'price_asc', label: 'Price: Low to High' },
                      { id: 'time_asc', label: 'Departure Time' },
                      { id: 'duration_asc', label: 'Fastest' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSortOption(opt.id as any)}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                          sortOption === opt.id
                            ? 'bg-[#0d6b63] text-white shadow-xs'
                            : 'bg-[#f7f4ed] text-[#42504e] hover:bg-[#eae4d8]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[#889593] text-[11px]">
                  {sortedBuses.length} bus{sortedBuses.length !== 1 ? 'es' : ''} available
                </span>
              </div>
            )}

            {!loading && !error && sortedBuses.length === 0 && (
              <div className="bg-white rounded-xl border border-[#e3ded4] p-10 text-center space-y-3 shadow-sm">
                <span className="material-symbols-outlined text-[42px] text-[#889593]">directions_bus</span>
                <h3 className="font-bold text-[#0d3d3a] text-base">No buses available in catalog</h3>
                <p className="text-xs text-[#6b7775] max-w-md mx-auto">
                  No scheduled demo bus routes currently found matching your filter criteria.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTypes([]);
                    setAcPreference('all');
                    setSeatPreference('all');
                  }}
                  className="px-4 py-2 bg-[#0d6b63] text-white rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors cursor-pointer shadow-sm"
                >
                  Reset all filters
                </button>
              </div>
            )}

            {!loading && sortedBuses.map((bus) => (
              <div
                key={bus.id}
                className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm hover:border-[#0d6b63]/60 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#f0ebe1]">
                  <div>
                    <h3 className="font-bold text-[#0d3d3a] text-base">{bus.operator}</h3>
                    <p className="text-xs text-[#6b7775]">{bus.type}</p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="bg-[#e8f2f0] text-[#0d6b63] text-xs font-bold px-2 py-0.5 rounded">
                      ★ {bus.rating}
                    </span>
                    <span className="text-xs text-[#b45309] font-medium bg-[#fffbeb] px-2 py-0.5 rounded border border-[#fde68a]">
                      {bus.seatsLeft}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <span className="font-bold text-base text-[#0d3d3a] block">{bus.depTime}</span>
                    <span className="text-[#6b7775] text-xs">{bus.boarding}</span>
                  </div>

                  <div className="text-center text-xs text-[#889593]">
                    <span>{bus.duration}</span>
                    <div className="w-24 sm:w-36 h-0.5 bg-[#e3ded4] my-1"></div>
                    <span>Overnight</span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-base text-[#0d3d3a] block">{bus.arrTime}</span>
                    <span className="text-[#6b7775] text-xs">{bus.drop}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#f0ebe1] flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-[#0d3d3a] block">{bus.fare}</span>
                    <span className="text-[11px] text-[#889593]">per passenger</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBusDetails(bus)}
                      className="border border-[#0d6b63] text-[#0d6b63] bg-white px-3.5 py-2 rounded-md text-xs font-semibold hover:bg-[#e8f2f0] transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBook(bus)}
                      className="bg-[#0d6b63] text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors cursor-pointer shadow-sm"
                    >
                      Select & Book
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bus Details Modal */}
        {selectedBusDetails && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-[#e3ded4] p-6 space-y-5 shadow-2xl animate-fade-in text-left max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#e3ded4]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#e8f2f0] flex items-center justify-center text-[#0d6b63] font-bold text-base">
                    <span className="material-symbols-outlined text-[20px]">directions_bus</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0d3d3a]">
                      {selectedBusDetails.operator}
                    </h3>
                    <p className="text-xs text-[#6b7775]">
                      {selectedBusDetails.type} · ★ {selectedBusDetails.rating}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBusDetails(null)}
                  className="text-[#6b7775] hover:text-black p-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Schedule & Route */}
              <div className="bg-[#fbf9f4] p-4 rounded-xl border border-[#e3ded4] space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <span className="text-lg font-bold text-[#0d3d3a] block">{selectedBusDetails.depTime}</span>
                    <span className="text-xs font-semibold text-[#0d3d3a]">{selectedBusDetails.boarding}</span>
                    <span className="text-[11px] text-[#6b7775] block">Departure</span>
                  </div>
                  <div className="text-center px-3">
                    <span className="text-xs text-[#889593] font-medium">{selectedBusDetails.duration}</span>
                    <div className="w-20 sm:w-28 h-0.5 bg-[#0d6b63]/40 my-1 relative">
                      <div className="w-2 h-2 rounded-full bg-[#0d6b63] absolute left-1/2 -top-0.75 -translate-x-1/2"></div>
                    </div>
                    <span className="text-[11px] text-[#0d6b63] font-semibold">{selectedBusDetails.seatsLeft}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-[#0d3d3a] block">{selectedBusDetails.arrTime}</span>
                    <span className="text-xs font-semibold text-[#0d3d3a]">{selectedBusDetails.drop}</span>
                    <span className="text-[11px] text-[#6b7775] block">Arrival</span>
                  </div>
                </div>
              </div>

              {/* Amenities Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { icon: 'ac_unit', label: 'Air Conditioned' },
                  { icon: 'power', label: 'Charging Point' },
                  { icon: 'local_drink', label: 'Water Bottle' },
                  { icon: 'bed', label: 'Fresh Blanket' },
                  { icon: 'gps_fixed', label: 'Live GPS Tracking' },
                  { icon: 'shield', label: 'Verified Carrier' },
                ].map((amenity) => (
                  <div key={amenity.label} className="p-2.5 bg-white rounded-lg border border-[#e3ded4] flex flex-col items-center text-center gap-1">
                    <span className="material-symbols-outlined text-[18px] text-[#0d6b63]">{amenity.icon}</span>
                    <span className="text-[10px] font-medium text-[#42504e]">{amenity.label}</span>
                  </div>
                ))}
              </div>

              {/* Dispute & Refund Protection */}
              <div className="p-3.5 bg-[#e8f2f0]/60 rounded-xl border border-[#d0dfd3] space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#0d3d3a]">
                  <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">verified</span>
                  <span>Agent Travel Bus Protection</span>
                </div>
                <p className="text-[11px] text-[#42504e] leading-relaxed">
                  Full cancellation refund if cancelled up to 6 hours before boarding. If the bus operator delays more than 2 hours or cancels the trip, our automated dispute engine guarantees immediate refund processing.
                </p>
              </div>

              {/* Price & Action */}
              <div className="pt-2 border-t border-[#e3ded4] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#889593] block">Total Payable ({passengerCount} passenger{passengerCount > 1 ? 's' : ''}):</span>
                  <span className="text-xl font-bold text-[#0d3d3a]">
                    ₹ {(selectedBusDetails.rawFare * passengerCount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBusDetails(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#5c6967] hover:text-[#0d3d3a] hover:bg-[#f0ebe1] rounded-lg transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const b = selectedBusDetails;
                      setSelectedBusDetails(null);
                      handleBook(b);
                    }}
                    className="bg-[#0d6b63] text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Proceed to Book</span>
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
};
