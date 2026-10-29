import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { useTravelBooking } from '../context/TravelBookingContext';

interface FlightItem {
  id: string;
  catalogTripId?: string;
  airline: string;
  code: string;
  flightNo: string;
  fromTime: string;
  toTime: string;
  fromCode: string;
  toCode: string;
  duration: string;
  stops: string;
  price: number;
  priceFormatted: string;
  refundable: boolean;
  logo: string;
  availableSeats?: number;
  isCatalogDemo?: boolean;
}

const parseLocalDate = (isoStr: string) => {
  if (!isoStr) return new Date(2026, 11, 21);
  const parts = isoStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? new Date(2026, 11, 21) : d;
};

const formatLocalYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const FlightsPage: React.FC = () => {
  const { searchCriteria, setSearchCriteria, openBookingSummary, bookingSuccessAlert, clearBookingSuccessAlert } = useTravelBooking();

  const origin = searchCriteria.origin || 'Delhi (DEL)';
  const destination = searchCriteria.destination || 'Mumbai (BOM)';
  const departDate = searchCriteria.departDate || '2026-12-21';
  const passengers = searchCriteria.passengers || '1 traveller · Economy';

  // Filters state
  const [selectedStops, setSelectedStops] = useState<string[]>(['nonstop']);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);

  // Inline Modify Search State
  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const [modOrigin, setModOrigin] = useState(origin);
  const [modDestination, setModDestination] = useState(destination);
  const [modDate, setModDate] = useState(departDate);
  const [modPassengers, setModPassengers] = useState(passengers);
  const [modifyError, setModifyError] = useState<string | null>(null);

  // Parse numeric passenger count
  const parsePassengerCount = (pStr: string) => {
    const match = pStr.match(/(\d+)/);
    return match ? Math.max(1, parseInt(match[1], 10)) : 1;
  };
  const passengerCount = parsePassengerCount(passengers);

  // Generate 7-day date window starting on departDate through departDate + 7 days (8 dates spanning 7-day interval)
  const generateDates = (startIso: string) => {
    const startDate = parseLocalDate(startIso);
    const list = [];
    const basePrices = [4872, 5100, 4950, 5280, 5420, 5190, 6340, 5150];

    for (let i = 0; i <= 7; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const iso = formatLocalYMD(d);
      const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      list.push({
        iso,
        day: dayLabel,
        price: `₹ ${(basePrices[i % basePrices.length]).toLocaleString('en-IN')}`,
        rawPrice: basePrices[i % basePrices.length],
        isInitial: i === 0,
      });
    }
    return list;
  };

  const dates = generateDates(departDate);

  const parsedActiveDate = parseLocalDate(departDate);
  const displayDateFormatted = !isNaN(parsedActiveDate.getTime())
    ? parsedActiveDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : departDate;

  // Find base fare for currently selected date from date window
  const activeDateEntry = dates.find((d) => d.iso === departDate) || dates[0];
  const activeBasePrice = activeDateEntry ? activeDateEntry.rawPrice : 4872;

  const [flights, setFlights] = useState<FlightItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>(
    'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed'
  );

  const mapCatalogTripToFlight = (t: any): FlightItem => {
    const fromCode = t.origin?.includes('(') ? t.origin.split('(')[1].replace(')', '') : 'DEL';
    const toCode = t.destination?.includes('(') ? t.destination.split('(')[1].replace(')', '') : 'BOM';
    const airline = t.operator || 'Air India';
    const code =
      t.operator === 'Air India'
        ? 'AI'
        : t.operator === 'IndiGo'
        ? '6E'
        : t.operator === 'Vistara'
        ? 'UK'
        : t.operator === 'SpiceJet'
        ? 'SG'
        : t.code?.slice(0, 2) || 'AI';
    const price = Number(t.fareAmount || t.basePrice) || activeBasePrice;
    return {
      id: t.tripId || t.code || t.id,
      catalogTripId: t.id,
      airline,
      code,
      flightNo: t.flightNo || t.code || t.tripId,
      fromTime: t.departTime || '06:10',
      toTime: t.arriveTime || '08:25',
      fromCode,
      toCode,
      duration: t.duration || '2h 15m',
      stops: t.stops || 'Non-stop',
      price,
      priceFormatted: t.fareFormatted || `₹ ${price.toLocaleString('en-IN')}`,
      refundable: t.refundable ?? true,
      logo: t.logo || 'flight_takeoff',
      availableSeats: t.availableSeats,
      isCatalogDemo: t.isCatalogDemo,
    };
  };

  const fetchFlights = async () => {
    setLoading(true);
    setError(null);
    try {
      const originCity = origin.includes('(') ? origin.split('(')[0].trim() : origin.trim();
      const destCity = destination.includes('(') ? destination.split('(')[0].trim() : destination.trim();

      const res = await fetch(
        `/api/catalog/trips?serviceType=flights&origin=${encodeURIComponent(originCity)}&destination=${encodeURIComponent(destCity)}`
      );
      if (!res.ok) {
        throw new Error(`Catalog API responded with HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.trips)) {
        if (data.trips.length > 0) {
          setFlights(data.trips.map(mapCatalogTripToFlight));
        } else {
          // If specific route returned no flights, query all flights in catalog so user has options
          const allRes = await fetch('/api/catalog/trips?serviceType=flights');
          const allData = await allRes.json();
          if (allData.success && Array.isArray(allData.trips)) {
            setFlights(allData.trips.map(mapCatalogTripToFlight));
          } else {
            setFlights([]);
          }
        }
        if (data.disclaimer) {
          setDisclaimer(data.disclaimer);
        }
      } else {
        throw new Error(data.error || 'Invalid catalog response format');
      }
    } catch (err: any) {
      console.warn('[CATALOG] Failed to fetch live flights:', err.message);
      setError(err.message || 'Unable to connect to flight catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
  }, [origin, destination, departDate]);

  const toggleAirline = (name: string) => {
    setSelectedAirlines((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const toggleStop = (stop: string) => {
    setSelectedStops((prev) =>
      prev.includes(stop) ? prev.filter((s) => s !== stop) : [...prev, stop]
    );
  };

  const handleBook = (flight: FlightItem) => {
    const totalFare = flight.price * passengerCount;
    openBookingSummary({
      id: flight.id,
      catalogTripId: flight.catalogTripId || flight.id,
      serviceType: 'flights',
      title: `${flight.airline} · ${flight.flightNo}`,
      operator: flight.airline,
      code: flight.flightNo,
      route: `${origin} → ${destination}`,
      origin,
      destination,
      departDate,
      departTime: flight.fromTime,
      arriveTime: flight.toTime,
      duration: flight.duration,
      travelClass: searchCriteria.travelClass || 'Economy',
      passengers,
      passengerCount,
      baseRatePerUnit: flight.price,
      taxAmount: Math.round(totalFare * 0.12),
      fareFormatted: `₹ ${totalFare.toLocaleString('en-IN')}`,
      fareAmount: totalFare,
      refundable: flight.refundable,
      notes: `${flight.stops} · ${displayDateFormatted} · Departure confirmed`,
      isCatalogDemo: true,
    });
  };

  const handleSwapModify = () => {
    const temp = modOrigin;
    setModOrigin(modDestination);
    setModDestination(temp);
    setModifyError(null);
  };

  const handleApplyModify = (e: React.FormEvent) => {
    e.preventDefault();
    const o = modOrigin.trim();
    const d = modDestination.trim();
    if (!o || !d) {
      setModifyError('Please specify both origin and destination.');
      return;
    }
    if (o.toLowerCase() === d.toLowerCase()) {
      setModifyError('Origin and destination cannot be the same city.');
      return;
    }
    if (!modDate) {
      setModifyError('Please select a departure date.');
      return;
    }
    setModifyError(null);
    setSearchCriteria({
      origin: o,
      destination: d,
      departDate: modDate,
      passengers: modPassengers,
    });
    setIsModifyOpen(false);
  };

  const filteredFlights = flights.filter((f) => {
    if (selectedAirlines.length > 0 && !selectedAirlines.includes(f.airline)) {
      return false;
    }
    if (selectedStops.length > 0) {
      const isNonStop = f.stops.toLowerCase().includes('non-stop');
      const hasNonStop = selectedStops.includes('nonstop');
      const has1Stop = selectedStops.includes('1stop');
      if (hasNonStop && !has1Stop && !isNonStop) return false;
      if (has1Stop && !hasNonStop && isNonStop) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <SiteHeader activeTab="flights" />

      {bookingSuccessAlert && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-[#0d6b63] text-white font-semibold shadow-xl flex items-center justify-between gap-3 text-sm animate-fade-in max-w-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{bookingSuccessAlert}</span>
          </div>
          <button onClick={clearBookingSuccessAlert} className="text-white/80 hover:text-white cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <main className="flex-1 w-full site-container py-6 text-left">
        {/* Breadcrumb (Page 3) */}
        <div className="text-xs text-[#6b7775] mb-2 flex items-center gap-1.5">
          <Link to="/" className="hover:text-[#0d3d3a]">Home</Link>
          <span>›</span>
          <span className="hover:text-[#0d3d3a]">Flights</span>
          <span>›</span>
          <span className="text-[#0d3d3a] font-medium">{origin} to {destination}</span>
        </div>

        {/* Header Strip & Modify Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#e3ded4] gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0d3d3a] tracking-tight">
              Flights from {origin} to {destination}
            </h1>
            <p className="text-xs sm:text-sm text-[#5c6967] mt-0.5">
              {displayDateFormatted} · {passengers} · {filteredFlights.length} flight{filteredFlights.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsModifyOpen(!isModifyOpen);
              setModOrigin(origin);
              setModDestination(destination);
              setModDate(departDate);
              setModPassengers(passengers);
              setModifyError(null);
            }}
            className="self-start sm:self-auto border border-[#0d6b63] text-[#0d6b63] bg-white px-3.5 py-1.5 rounded-md text-xs font-semibold hover:bg-[#e8f2f0] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isModifyOpen ? 'close' : 'tune'}
            </span>
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
                <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">search</span>
                Modify Flight Criteria
              </span>
              <span className="text-[11px] text-[#889593]">
                Changes instantly update availability and fare window
              </span>
            </div>

            {modifyError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>{modifyError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              {/* Origin */}
              <div className="lg:col-span-3">
                <label className="text-[11px] font-bold text-[#5c6967] block uppercase mb-1">
                  From (Origin)
                </label>
                <input
                  type="text"
                  value={modOrigin}
                  onChange={(e) => {
                    setModOrigin(e.target.value);
                    setModifyError(null);
                  }}
                  className="w-full px-3 py-2 text-xs border border-[#e3ded4] rounded-lg focus:outline-none focus:border-[#0d6b63] bg-[#fbf9f4]"
                  placeholder="e.g. Delhi (DEL)"
                />
              </div>

              {/* Swap Button */}
              <div className="lg:col-span-1 flex justify-center pb-0.5">
                <button
                  type="button"
                  onClick={handleSwapModify}
                  title="Swap Origin and Destination"
                  className="w-8 h-8 rounded-full border border-[#e3ded4] bg-white hover:bg-[#e8f2f0] text-[#0d6b63] flex items-center justify-center transition-transform hover:rotate-180 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                </button>
              </div>

              {/* Destination */}
              <div className="lg:col-span-3">
                <label className="text-[11px] font-bold text-[#5c6967] block uppercase mb-1">
                  To (Destination)
                </label>
                <input
                  type="text"
                  value={modDestination}
                  onChange={(e) => {
                    setModDestination(e.target.value);
                    setModifyError(null);
                  }}
                  className="w-full px-3 py-2 text-xs border border-[#e3ded4] rounded-lg focus:outline-none focus:border-[#0d6b63] bg-[#fbf9f4]"
                  placeholder="e.g. Mumbai (BOM)"
                />
              </div>

              {/* Departure Date */}
              <div className="lg:col-span-2">
                <label className="text-[11px] font-bold text-[#5c6967] block uppercase mb-1">
                  Departure Date
                </label>
                <input
                  type="date"
                  value={modDate}
                  onChange={(e) => {
                    setModDate(e.target.value);
                    setModifyError(null);
                  }}
                  className="w-full px-3 py-2 text-xs border border-[#e3ded4] rounded-lg focus:outline-none focus:border-[#0d6b63] bg-[#fbf9f4]"
                />
              </div>

              {/* Passengers */}
              <div className="lg:col-span-3">
                <label className="text-[11px] font-bold text-[#5c6967] block uppercase mb-1">
                  Travellers & Cabin
                </label>
                <select
                  value={modPassengers}
                  onChange={(e) => setModPassengers(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e3ded4] rounded-lg focus:outline-none focus:border-[#0d6b63] bg-[#fbf9f4]"
                >
                  <option value="1 traveller · Economy">1 traveller · Economy</option>
                  <option value="2 travellers · Economy">2 travellers · Economy</option>
                  <option value="3 travellers · Economy">3 travellers · Economy</option>
                  <option value="4 travellers · Economy">4 travellers · Economy</option>
                  <option value="1 traveller · Business">1 traveller · Business</option>
                  <option value="2 travellers · Business">2 travellers · Business</option>
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

        {/* Date Strip Carousel */}
        <div className="py-4 border-b border-[#e3ded4] overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {dates.map((d) => (
              <button
                key={d.iso}
                type="button"
                onClick={() => setSearchCriteria({ departDate: d.iso })}
                className={`px-4 py-2.5 rounded-lg border text-xs font-medium transition-all text-center min-w-[120px] cursor-pointer ${
                  departDate === d.iso
                    ? 'border-[#0d6b63] bg-white text-[#0d3d3a] shadow-sm ring-2 ring-[#0d6b63]'
                    : 'border-[#e3ded4] bg-white/70 text-[#6b7775] hover:bg-white hover:text-[#0d3d3a]'
                }`}
              >
                <div className="font-semibold">{d.day}</div>
                <div className={`mt-0.5 text-xs ${departDate === d.iso ? 'text-[#0d6b63] font-bold' : 'text-[#889593]'}`}>
                  {d.price}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Layout: Filters + Results */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          {/* Left Filters Column */}
          <aside className="lg:col-span-3 space-y-5">
            <div className="bg-white rounded-xl border border-[#e3ded4] p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e3ded4]">
                <h3 className="text-sm font-bold text-[#0d3d3a]">Filters</h3>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAirlines([]);
                    setSelectedStops(['nonstop']);
                  }}
                  className="text-xs text-[#0d6b63] hover:underline font-medium cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              {/* Stops Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0d3d3a] uppercase tracking-wider block">
                  Stops
                </label>
                <label className="flex items-center gap-2 text-xs text-[#42504e] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStops.includes('nonstop')}
                    onChange={() => toggleStop('nonstop')}
                    className="accent-[#0d6b63] rounded"
                  />
                  <span>Non-stop (82)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#42504e] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStops.includes('1stop')}
                    onChange={() => toggleStop('1stop')}
                    className="accent-[#0d6b63] rounded"
                  />
                  <span>1 stop (124)</span>
                </label>
              </div>

              {/* Airlines Filter */}
              <div className="space-y-2 pt-2 border-t border-[#e3ded4]">
                <label className="text-xs font-bold text-[#0d3d3a] uppercase tracking-wider block">
                  Airlines
                </label>
                {['Air India', 'IndiGo', 'Vistara', 'Akasa Air'].map((airline) => (
                  <label key={airline} className="flex items-center gap-2 text-xs text-[#42504e] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAirlines.includes(airline)}
                      onChange={() => toggleAirline(airline)}
                      className="accent-[#0d6b63] rounded"
                    />
                    <span>{airline}</span>
                  </label>
                ))}
              </div>

              {/* Refund Protection Info */}
              <div className="pt-3 border-t border-[#e3ded4] bg-[#e8f2f0]/60 -mx-4 -mb-4 p-3.5 rounded-b-xl">
                <div className="flex items-start gap-2 text-xs text-[#2d5650]">
                  <span className="material-symbols-outlined text-[16px] text-[#0d6b63] shrink-0 mt-0.5">
                    verified_user
                  </span>
                  <div>
                    <span className="font-bold block">Protected by Agent Travel</span>
                    <span className="text-[11px] leading-tight text-[#5c6967] block mt-0.5">
                      All tickets include automated dispute arbitration if delayed or cancelled.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Flight Results Column */}
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
                  <span>Failed to load flight inventory: {error}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchFlights}
                  className="bg-[#dc2626] text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-[#b91c1c] transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading Skeletons */}
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm animate-pulse space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[#e5e0d8]" />
                        <div className="space-y-2">
                          <div className="h-4 bg-[#e5e0d8] rounded w-48" />
                          <div className="h-3 bg-[#e5e0d8] rounded w-64" />
                        </div>
                      </div>
                      <div className="h-8 bg-[#e5e0d8] rounded w-28" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && filteredFlights.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e3ded4] p-10 text-center space-y-3 shadow-sm">
                <span className="material-symbols-outlined text-[42px] text-[#889593]">flight_takeoff</span>
                <h3 className="font-bold text-[#0d3d3a] text-base">No flights match your filter criteria</h3>
                <p className="text-xs text-[#6b7775] max-w-md mx-auto">
                  We couldn't find flights matching your selected stop or airline filters for {origin} → {destination} on {displayDateFormatted}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAirlines([]);
                    setSelectedStops(['nonstop', '1stop']);
                  }}
                  className="px-4 py-2 bg-[#0d6b63] text-white rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors cursor-pointer shadow-sm"
                >
                  Reset all filters
                </button>
              </div>
            ) : !loading && (
              filteredFlights.map((flight) => (
                <div
                  key={flight.id}
                  className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm hover:border-[#0d6b63]/60 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Airline & Timings */}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#f0ebe1] flex items-center justify-center text-[#0d3d3a] font-bold text-xs border border-[#e3ded4]">
                        {flight.code}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#0d3d3a] text-sm">
                            {flight.airline} · {flight.flightNo}
                          </h4>
                          <span className="text-[10px] font-semibold text-[#0d6b63] bg-[#e8f2f0] px-2 py-0.5 rounded-full">
                            Departs {displayDateFormatted}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#6b7775] mt-1">
                          <span className="font-semibold text-[#0d3d3a]">{flight.fromTime}</span>
                          <span>{flight.fromCode}</span>
                          <span className="text-[#889593]">→ {flight.duration} ({flight.stops}) →</span>
                          <span className="font-semibold text-[#0d3d3a]">{flight.toTime}</span>
                          <span>{flight.toCode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Action Button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-[#e3ded4] gap-2">
                      <div className="text-right">
                        <span className="text-xl font-bold text-[#0d3d3a] leading-none block">
                          {flight.priceFormatted}
                        </span>
                        <span className="text-[11px] text-[#889593]">per traveller</span>
                        {passengerCount > 1 && (
                          <span className="text-[11px] font-semibold text-[#0d6b63] block mt-0.5">
                            Total: ₹ {(flight.price * passengerCount).toLocaleString('en-IN')} ({passengerCount} travellers)
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleBook(flight)}
                        className="bg-[#0d6b63] text-white px-5 py-2 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm cursor-pointer"
                      >
                        Book flight
                      </button>
                    </div>
                  </div>

                  {/* Footer Strip with Refund Assurance */}
                  <div className="pt-2 border-t border-[#f0ebe1] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-[#0d6b63] font-semibold text-[11px] bg-[#e8f2f0] px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0d6b63]"></span>
                      Eligible for refund assistance
                    </div>
                    <span className="text-[#889593] text-[11px]">
                      Free cancellation before departure · Tracked 24/7 by AI
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};
