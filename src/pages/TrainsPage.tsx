import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { useTravelBooking } from '../context/TravelBookingContext';

interface TrainClass {
  name: string;
  status: string;
  fare: string;
  rawFare: number;
}

interface TrainItem {
  id: string;
  catalogTripId?: string;
  name: string;
  number: string;
  frequency: string;
  depTime: string;
  fromStation: string;
  duration: string;
  arrTime: string;
  toStation: string;
  classes: TrainClass[];
}

export const TrainsPage: React.FC = () => {
  const { searchCriteria, setSearchCriteria, openBookingSummary, bookingSuccessAlert, clearBookingSuccessAlert } = useTravelBooking();

  const origin = searchCriteria.origin || 'New Delhi (NDLS)';
  const destination = searchCriteria.destination || 'Jaipur (JP)';
  const departDate = searchCriteria.departDate || '2026-11-02';
  const passengers = searchCriteria.passengers || '2 passengers';

  const [selectedClasses, setSelectedClasses] = useState<string[]>(['Chair Car']);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['Early morning · 04–08', 'Morning · 08–12']);
  const [sortOption, setSortOption] = useState<'price_asc' | 'time_asc' | 'duration_asc'>('price_asc');
  const [selectedTrainDetails, setSelectedTrainDetails] = useState<TrainItem | null>(null);
  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const [modOrigin, setModOrigin] = useState(origin);
  const [modDestination, setModDestination] = useState(destination);
  const [modDate, setModDate] = useState(departDate);
  const [modPassengers, setModPassengers] = useState(passengers);
  const [trains, setTrains] = useState<TrainItem[]>([]);
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

  const mapCatalogToTrain = (t: any): TrainItem => ({
    id: t.tripId || t.code || t.id,
    catalogTripId: t.id,
    name: t.operator || 'Express',
    number: t.code || t.tripId,
    frequency: 'Runs daily',
    depTime: t.departTime || '06:05',
    fromStation: t.origin || origin,
    duration: t.duration || '4h 30m',
    arrTime: t.arriveTime || '12:40',
    toStation: t.destination || destination,
    classes: [
      {
        name: t.travelClass || 'Chair Car (CC)',
        status: `AVAILABLE ${t.availableSeats || 42}`,
        fare: t.fareFormatted || `₹ ${(t.fareAmount || t.basePrice || 945).toLocaleString('en-IN')}`,
        rawFare: Number(t.fareAmount || t.basePrice || 945),
      },
      {
        name: 'Exec Chair (EC)',
        status: `AVAILABLE ${Math.max(4, Math.floor((t.availableSeats || 20) / 3))}`,
        fare: `₹ ${(Math.round((t.fareAmount || t.basePrice || 945) * 1.8)).toLocaleString('en-IN')}`,
        rawFare: Math.round((t.fareAmount || t.basePrice || 945) * 1.8),
      },
    ],
  });

  const fetchTrains = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/catalog/trips?serviceType=trains');
      if (!res.ok) {
        throw new Error(`Catalog API responded with HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.trips)) {
        setTrains(data.trips.map(mapCatalogToTrain));
        if (data.disclaimer) {
          setDisclaimer(data.disclaimer);
        }
      } else {
        throw new Error(data.error || 'Invalid catalog response format');
      }
    } catch (err: any) {
      console.warn('[CATALOG] Failed to fetch live trains:', err.message);
      setError(err.message || 'Unable to connect to train catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrains();
  }, [origin, destination]);

  const handleBook = (train: TrainItem, classItem: TrainClass) => {
    const baseFare = classItem.rawFare || parseInt(classItem.fare.replace(/[^0-9]/g, '')) || 945;
    const matchPassengers = passengers.match(/(\d+)/);
    const passengerCount = matchPassengers ? Math.max(1, parseInt(matchPassengers[1], 10)) : 1;
    const totalFare = baseFare * passengerCount;

    openBookingSummary({
      id: `${train.id}-${classItem.name}`,
      catalogTripId: train.catalogTripId || train.id,
      serviceType: 'trains',
      title: `${train.name} (${train.number})`,
      operator: `${train.name} · ${classItem.name}`,
      code: `#${train.number}`,
      route: `${origin} → ${destination}`,
      origin,
      destination,
      departDate,
      departTime: train.depTime,
      arriveTime: train.arrTime,
      duration: train.duration,
      travelClass: classItem.name,
      passengers,
      passengerCount,
      baseRatePerUnit: baseFare,
      fareFormatted: `₹ ${totalFare.toLocaleString('en-IN')}`,
      fareAmount: totalFare,
      refundable: true,
      isCatalogDemo: true,
    });
  };

  const toggleClassFilter = (cls: string) => {
    setSelectedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const toggleTimeFilter = (tm: string) => {
    setSelectedTimes((prev) =>
      prev.includes(tm) ? prev.filter((t) => t !== tm) : [...prev, tm]
    );
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

  const getLowestFare = (tr: TrainItem) => {
    if (!tr.classes || tr.classes.length === 0) return 99999;
    return Math.min(...tr.classes.map((c) => c.rawFare));
  };

  const sortedTrains = [...trains].sort((a, b) => {
    if (sortOption === 'price_asc') return getLowestFare(a) - getLowestFare(b);
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

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <SiteHeader activeTab="trains" />

      {bookingSuccessAlert && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-[#0d6b63] text-white font-semibold shadow-xl flex items-center justify-between gap-3 text-sm animate-fade-in max-w-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">train</span>
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
          <span className="text-[#6b7775]">Trains</span>
          <span>›</span>
          <span className="text-[#0d3d3a] font-medium">{origin} to {destination}</span>
        </div>

        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#e3ded4] gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0d3d3a] tracking-tight">
              Trains from {origin} to {destination}
            </h1>
            <p className="text-xs sm:text-sm text-[#5c6967] mt-0.5">
              {displayDateFormatted} · {passengers} · {sortedTrains.length} train{sortedTrains.length !== 1 ? 's' : ''} found
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
                <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">train</span>
                Modify Train Journey Criteria
              </span>
              <span className="text-[11px] text-[#889593]">
                Updates live schedules and seat availability
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-3">
                <label className="text-[11px] font-bold text-[#5c6967] block uppercase mb-1">
                  From Station
                </label>
                <input
                  type="text"
                  value={modOrigin}
                  onChange={(e) => setModOrigin(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e3ded4] rounded-lg focus:outline-none focus:border-[#0d6b63] bg-[#fbf9f4]"
                  placeholder="e.g. New Delhi (NDLS)"
                />
              </div>

              <div className="lg:col-span-1 flex justify-center pb-0.5">
                <button
                  type="button"
                  onClick={handleSwapModify}
                  title="Swap Stations"
                  className="w-8 h-8 rounded-full border border-[#e3ded4] bg-white hover:bg-[#e8f2f0] text-[#0d6b63] flex items-center justify-center transition-transform hover:rotate-180 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                </button>
              </div>

              <div className="lg:col-span-3">
                <label className="text-[11px] font-bold text-[#5c6967] block uppercase mb-1">
                  To Station
                </label>
                <input
                  type="text"
                  value={modDestination}
                  onChange={(e) => setModDestination(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e3ded4] rounded-lg focus:outline-none focus:border-[#0d6b63] bg-[#fbf9f4]"
                  placeholder="e.g. Jaipur (JP)"
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

        {/* 2-Column Split: Filters + Train Cards (Page 17) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          {/* Left Filters */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-xl border border-[#e3ded4] p-4 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#e3ded4]">
                <h3 className="font-bold text-[#0d3d3a]">Filters</h3>
                <button
                  onClick={() => {
                    setSelectedClasses(['Chair Car', 'Executive Chair', 'Sleeper', '3A / 2A']);
                    setSelectedTimes(['Early morning · 04–08', 'Morning · 08–12', 'Evening · 18–24']);
                  }}
                  className="text-[#0d6b63] hover:underline font-semibold"
                >
                  Clear all
                </button>
              </div>

              {/* Class */}
              <div className="space-y-2">
                <label className="font-bold text-[#0d3d3a] uppercase tracking-wider block">Class</label>
                {['Chair Car', 'Executive Chair', 'Sleeper', '3A / 2A'].map((cls) => (
                  <label key={cls} className="flex items-center gap-2 cursor-pointer text-[#42504e]">
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(cls)}
                      onChange={() => toggleClassFilter(cls)}
                      className="accent-[#0d6b63] rounded"
                    />
                    <span>{cls}</span>
                  </label>
                ))}
              </div>

              {/* Departure Time */}
              <div className="space-y-2 pt-2 border-t border-[#e3ded4]">
                <label className="font-bold text-[#0d3d3a] uppercase tracking-wider block">Departure time</label>
                {['Early morning · 04–08', 'Morning · 08–12', 'Evening · 18–24'].map((time) => (
                  <label key={time} className="flex items-center gap-2 cursor-pointer text-[#42504e]">
                    <input
                      type="checkbox"
                      checked={selectedTimes.includes(time)}
                      onChange={() => toggleTimeFilter(time)}
                      className="accent-[#0d6b63] rounded"
                    />
                    <span>{time}</span>
                  </label>
                ))}
              </div>

              {/* Train Type */}
              <div className="space-y-2 pt-2 border-t border-[#e3ded4]">
                <label className="font-bold text-[#0d3d3a] uppercase tracking-wider block">Train type</label>
                {['Shatabdi / Vande Bharat', 'Superfast', 'Express'].map((tp) => (
                  <label key={tp} className="flex items-center gap-2 cursor-pointer text-[#42504e]">
                    <input type="checkbox" defaultChecked className="accent-[#0d6b63] rounded" />
                    <span>{tp}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Train Cards */}
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
                  <span>Failed to load train inventory: {error}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchTrains}
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
                  <div key={i} className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm animate-pulse space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-4 bg-[#e5e0d8] rounded w-48" />
                        <div className="h-3 bg-[#e5e0d8] rounded w-32" />
                      </div>
                      <div className="h-6 bg-[#e5e0d8] rounded w-28" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sorting Toolbar */}
            {!loading && !error && sortedTrains.length > 0 && (
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
                  {sortedTrains.length} train{sortedTrains.length !== 1 ? 's' : ''} available
                </span>
              </div>
            )}

            {!loading && !error && sortedTrains.length === 0 && (
              <div className="bg-white rounded-xl border border-[#e3ded4] p-10 text-center space-y-3 shadow-sm">
                <span className="material-symbols-outlined text-[42px] text-[#889593]">train</span>
                <h3 className="font-bold text-[#0d3d3a] text-base">No trains available in catalog</h3>
                <p className="text-xs text-[#6b7775] max-w-md mx-auto">
                  No scheduled demo train routes currently found matching your search.
                </p>
              </div>
            )}

            {!loading && sortedTrains.map((train) => (
              <div
                key={train.id}
                className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm hover:border-[#0d6b63]/60 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f0ebe1]">
                  <div>
                    <h3 className="font-bold text-[#0d3d3a] text-base">{train.name}</h3>
                    <p className="text-xs text-[#6b7775]">#{train.number} · {train.frequency}</p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedTrainDetails(train)}
                      className="border border-[#0d6b63] text-[#0d6b63] bg-white px-3 py-1 rounded text-xs font-semibold hover:bg-[#e8f2f0] transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0d6b63] bg-[#e8f2f0] px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0d6b63]"></span>
                      TDR Refund Protected
                    </div>
                  </div>
                </div>

                {/* Schedule Strip */}
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <span className="font-bold text-base text-[#0d3d3a] block">{train.depTime}</span>
                    <span className="text-[#6b7775] text-xs">{train.fromStation}</span>
                  </div>

                  <div className="text-center text-xs text-[#889593]">
                    <span>{train.duration}</span>
                    <div className="w-24 sm:w-36 h-0.5 bg-[#e3ded4] my-1 relative">
                      <div className="w-2 h-2 rounded-full bg-[#0d6b63] absolute left-1/2 -top-0.5 -translate-x-1/2"></div>
                    </div>
                    <span>Direct</span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-base text-[#0d3d3a] block">{train.arrTime}</span>
                    <span className="text-[#6b7775] text-xs">{train.toStation}</span>
                  </div>
                </div>

                {/* Class Availability Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {train.classes.map((c) => (
                    <div
                      key={c.name}
                      className="p-3 rounded-lg border border-[#e3ded4] bg-[#fbf9f4] flex items-center justify-between text-xs hover:border-[#0d6b63]/50 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-[#0d3d3a] block">{c.name}</span>
                        <span className="text-[11px] font-semibold text-[#166534]">{c.status}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-[#0d3d3a]">{c.fare}</span>
                        <button
                          type="button"
                          onClick={() => handleBook(train, c)}
                          className="bg-[#0d6b63] text-white px-3.5 py-1.5 rounded text-xs font-semibold hover:bg-[#0a534d] transition-colors cursor-pointer shadow-xs"
                        >
                          Select & Book
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Train Details Modal */}
        {selectedTrainDetails && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-[#e3ded4] p-6 space-y-5 shadow-2xl animate-fade-in text-left max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#e3ded4]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#e8f2f0] flex items-center justify-center text-[#0d6b63] font-bold text-base">
                    <span className="material-symbols-outlined text-[20px]">train</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0d3d3a]">
                      {selectedTrainDetails.name} (#{selectedTrainDetails.number})
                    </h3>
                    <p className="text-xs text-[#6b7775]">
                      {origin} → {destination} · {displayDateFormatted}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTrainDetails(null)}
                  className="text-[#6b7775] hover:text-black p-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Timings Strip */}
              <div className="bg-[#fbf9f4] p-4 rounded-xl border border-[#e3ded4] space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <span className="text-lg font-bold text-[#0d3d3a] block">{selectedTrainDetails.depTime}</span>
                    <span className="text-xs font-semibold text-[#0d3d3a]">{selectedTrainDetails.fromStation}</span>
                  </div>
                  <div className="text-center px-3">
                    <span className="text-xs text-[#889593] font-medium">{selectedTrainDetails.duration}</span>
                    <div className="w-20 sm:w-28 h-0.5 bg-[#0d6b63]/40 my-1 relative">
                      <div className="w-2 h-2 rounded-full bg-[#0d6b63] absolute left-1/2 -top-0.75 -translate-x-1/2"></div>
                    </div>
                    <span className="text-[11px] text-[#0d6b63] font-semibold">{selectedTrainDetails.frequency}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-[#0d3d3a] block">{selectedTrainDetails.arrTime}</span>
                    <span className="text-xs font-semibold text-[#0d3d3a]">{selectedTrainDetails.toStation}</span>
                  </div>
                </div>
              </div>

              {/* Onboard Amenities */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-[#e3ded4] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#0d6b63] font-semibold">
                    <span className="material-symbols-outlined text-[16px]">restaurant</span>
                    <span>Pantry & Catering</span>
                  </div>
                  <p className="text-[11px] text-[#5c6967]">Onboard meals available or included</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-[#e3ded4] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#0d6b63] font-semibold">
                    <span className="material-symbols-outlined text-[16px]">power</span>
                    <span>Charging & Bio-Toilets</span>
                  </div>
                  <p className="text-[11px] text-[#5c6967]">Personal sockets at all AC seats</p>
                </div>
              </div>

              {/* IRCTC TDR Rules */}
              <div className="p-3.5 bg-[#e8f2f0]/60 rounded-xl border border-[#d0dfd3] space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#0d3d3a]">
                  <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">gavel</span>
                  <span>IRCTC TDR Dispute Protection</span>
                </div>
                <p className="text-[11px] text-[#42504e] leading-relaxed">
                  Automatic TDR filing assistance is included if the train is delayed more than 3 hours or in the event of AC failure. Agent Travel arbitrates with IRCTC on your behalf.
                </p>
              </div>

              {/* Class Booking Selection inside Modal */}
              <div className="space-y-2 pt-2 border-t border-[#e3ded4]">
                <span className="text-xs font-bold text-[#0d3d3a] block">Select Class to Continue:</span>
                <div className="space-y-2">
                  {selectedTrainDetails.classes.map((cls) => (
                    <div
                      key={cls.name}
                      className="p-3 rounded-xl border border-[#e3ded4] flex items-center justify-between hover:bg-[#fbf9f4] transition-colors text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#0d3d3a] block">{cls.name}</span>
                        <span className="text-[11px] text-[#166534] font-semibold">{cls.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-[#0d3d3a]">{cls.fare}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const tr = selectedTrainDetails;
                            setSelectedTrainDetails(null);
                            handleBook(tr, cls);
                          }}
                          className="bg-[#0d6b63] text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-[#0a534d] transition-colors cursor-pointer shadow-xs"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
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
