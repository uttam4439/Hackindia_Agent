import React, { useEffect, useRef, useState } from 'react';
import { useTravelBooking, SelectedTrip } from '../../context/TravelBookingContext';

interface SearchResultsModalProps {
  isOpen: boolean;
  searchData: any;
  onClose: () => void;
}

export const SearchResultsModal: React.FC<SearchResultsModalProps> = ({
  isOpen,
  searchData,
  onClose,
}) => {
  const { openBookingSummary } = useTravelBooking();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [detailModalTrip, setDetailModalTrip] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'time' | 'duration'>('price');

  // Handle scroll locking
  useEffect(() => {
    if (!isOpen || !searchData) return;

    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;
    const originalBodyOverflow = document.body.style.overflow;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      document.body.style.overflow = originalBodyOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, searchData]);

  // Fetch real authoritative trips for searchData
  useEffect(() => {
    if (!isOpen || !searchData) return;

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const serviceType = searchData.type || 'flights';
        const res = await fetch(`/api/catalog/trips?serviceType=${encodeURIComponent(serviceType)}`);
        if (!res.ok) {
          throw new Error(`Failed to load inventory (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (data.success && Array.isArray(data.trips)) {
          setTrips(data.trips);
        } else {
          setTrips([]);
        }
      } catch (err: any) {
        console.warn('[SEARCH MODAL ERROR]', err);
        setError(err.message || 'Unable to load journeys');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [isOpen, searchData]);

  if (!isOpen || !searchData) return null;

  // Sorting
  const sortedTrips = [...trips].sort((a, b) => {
    if (sortBy === 'price') {
      const priceA = Number(a.fareAmount || a.basePrice || 0);
      const priceB = Number(b.fareAmount || b.basePrice || 0);
      return priceA - priceB;
    }
    if (sortBy === 'time') {
      return (a.departTime || '').localeCompare(b.departTime || '');
    }
    if (sortBy === 'duration') {
      return (a.duration || '').localeCompare(b.duration || '');
    }
    return 0;
  });

  const handleSelectTrip = (item: any) => {
    const serviceType = searchData.type || item.serviceType || 'flights';
    const passengerCount = Number(searchData.passengers || searchData.travellers?.adults || 1);
    const baseFare = Number(item.fareAmount || item.basePrice || 1450);
    const totalFare = baseFare * passengerCount;

    const selected: SelectedTrip = {
      id: item.tripId || item.code || item.id,
      catalogTripId: item.id,
      serviceType,
      title: `${item.operator} · ${item.code}`,
      operator: item.operator,
      code: item.code || item.tripId,
      route: item.route || `${searchData.fromCity || searchData.fromStation || item.origin} → ${searchData.toCity || searchData.toStation || item.destination}`,
      origin: item.origin || searchData.fromCity || searchData.fromStation || 'Origin',
      destination: item.destination || searchData.toCity || searchData.toStation || 'Destination',
      departDate: searchData.departDate || searchData.journeyDate || '2026-12-21',
      returnDate: searchData.returnDate,
      departTime: item.departTime || '08:00',
      arriveTime: item.arriveTime || '10:30',
      duration: item.duration || '2h 30m',
      travelClass: searchData.cabinClass || searchData.trainClass || item.travelClass || 'Standard',
      passengers: `${passengerCount} Passenger${passengerCount > 1 ? 's' : ''}`,
      passengerCount,
      baseRatePerUnit: baseFare,
      fareFormatted: `₹ ${totalFare.toLocaleString('en-IN')}`,
      fareAmount: totalFare,
      refundable: item.refundable ?? true,
      isCatalogDemo: true,
    };

    onClose();
    openBookingSummary(selected);
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in overscroll-contain"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#C2EAE7] overflow-hidden text-left flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0d283e] via-[#006D77] to-[#0a1e2e] text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#E8B86D]">verified</span>
              <h3 className="font-extrabold text-xl capitalize font-['Plus_Jakarta_Sans']">
                {searchData.type} Search Results
              </h3>
            </div>
            <p className="text-xs text-white/80 mt-1">
              Authoritative catalog inventory with autonomous refund protection.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            aria-label="Close search results"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Sort & Filter Controls Bar */}
        <div className="bg-[#EAF8F7] px-6 py-2.5 border-b border-[#C2EAE7] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 font-semibold text-[#17324D]">
            <span className="text-[#5A738E]">Sort by:</span>
            <button
              type="button"
              onClick={() => setSortBy('price')}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                sortBy === 'price' ? 'bg-[#006D77] text-white' : 'bg-white text-[#5A738E] hover:bg-white/80'
              }`}
            >
              Price: Low to High
            </button>
            <button
              type="button"
              onClick={() => setSortBy('time')}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                sortBy === 'time' ? 'bg-[#006D77] text-white' : 'bg-white text-[#5A738E] hover:bg-white/80'
              }`}
            >
              Departure Time
            </button>
            <button
              type="button"
              onClick={() => setSortBy('duration')}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                sortBy === 'duration' ? 'bg-[#006D77] text-white' : 'bg-white text-[#5A738E] hover:bg-white/80'
              }`}
            >
              Fastest Duration
            </button>
          </div>

          <span className="text-[#006D77] font-bold">
            {sortedTrips.length} Journey{sortedTrips.length !== 1 ? 's' : ''} Available
          </span>
        </div>

        {/* Scrollable Results List */}
        <div
          ref={scrollContainerRef}
          className="p-5 sm:p-6 space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain"
        >
          {/* Autonomous Refund Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#EAF8F7] border border-[#BCE8E4] text-[#006D77] text-xs font-semibold">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#20B8B0]">security</span>
              Backed by automated statutory refund monitoring against DGCA CAR & carrier policies.
            </span>
            <span className="hidden sm:inline font-bold uppercase tracking-wider text-[10px] bg-[#20B8B0]/20 text-[#006D77] px-2.5 py-0.5 rounded-full">
              Protected
            </span>
          </div>

          {/* Loading Skeletons */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-5 rounded-2xl border border-gray-200 bg-white animate-pulse space-y-3">
                  <div className="flex justify-between">
                    <div className="h-5 bg-gray-200 rounded w-40" />
                    <div className="h-6 bg-gray-200 rounded w-24" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-60" />
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => onClose()}
                className="font-bold underline"
              >
                Close
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && sortedTrips.length === 0 && (
            <div className="p-10 text-center rounded-2xl border border-[#C2EAE7] bg-[#F8FCFB] space-y-3">
              <span className="material-symbols-outlined text-[40px] text-[#5A738E]">search_off</span>
              <h4 className="font-bold text-[#17324D] text-base">No journeys found matching your search</h4>
              <p className="text-xs text-[#5A738E] max-w-md mx-auto">
                Try modifying your departure date or checking alternative stations.
              </p>
            </div>
          )}

          {/* Journey Cards */}
          {!loading &&
            sortedTrips.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 sm:p-5 rounded-2xl border border-gray-200 hover:border-[#20B8B0] hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
              >
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-base text-[#17324D]">{item.operator}</span>
                    <span className="text-xs font-bold text-[#006D77] bg-[#EAF8F7] px-2 py-0.5 rounded border border-[#BCE8E4]">
                      {item.code || item.tripId}
                    </span>
                    {item.travelClass && (
                      <span className="text-xs text-[#5A738E] font-medium bg-gray-100 px-2 py-0.5 rounded">
                        {item.travelClass}
                      </span>
                    )}
                    {item.stops && (
                      <span className="text-[11px] font-semibold text-[#166534] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {item.stops}
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-semibold text-[#17324D] mt-0.5">{item.route}</div>

                  <div className="text-xs text-[#5A738E] flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-[#17324D] text-sm">{item.departTime}</span>
                    <span>&rarr;</span>
                    <span className="font-bold text-[#17324D] text-sm">{item.arriveTime}</span>
                    <span>({item.duration})</span>
                    {item.availableSeats !== undefined && (
                      <span className="text-[#006D77] font-semibold ml-2">
                        · {item.availableSeats} seats left
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 shrink-0">
                  <div className="text-right">
                    <div className="font-black text-2xl text-[#006D77]">
                      {item.fareFormatted || `₹ ${Number(item.fareAmount || item.basePrice || 0).toLocaleString('en-IN')}`}
                    </div>
                    <span className="text-[10px] text-[#5A738E] font-medium block">per passenger, all taxes incl.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailModalTrip(item)}
                      className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-[#EAF8F7] text-[#17324D] text-xs font-bold transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTrip(item)}
                      className="px-5 py-2 rounded-xl bg-[#006D77] hover:bg-[#00565E] text-white text-xs font-extrabold shadow-sm hover:shadow transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>Select</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#EAF8F7]/60 p-4 border-t border-[#C2EAE7] flex items-center justify-between text-xs text-[#5A738E] shrink-0">
          <span>Curated Authoritative Catalog Inventory · Live Sandbox</span>
          <button
            onClick={onClose}
            className="font-bold text-[#006D77] hover:underline cursor-pointer"
          >
            Modify Search
          </button>
        </div>
      </div>

      {/* Trip Details Sub-Modal */}
      {detailModalTrip && (
        <div
          className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setDetailModalTrip(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full border border-[#C2EAE7] p-6 space-y-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-[#006D77] uppercase tracking-wider block">
                  Journey Details
                </span>
                <h4 className="text-lg font-bold text-[#17324D]">{detailModalTrip.operator}</h4>
                <p className="text-xs text-[#5A738E]">{detailModalTrip.code || detailModalTrip.tripId} · {detailModalTrip.travelClass}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalTrip(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-[#5A738E]">Sector Route</span>
                <span className="font-semibold text-[#17324D]">{detailModalTrip.route}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-[#5A738E]">Schedule</span>
                <span className="font-semibold text-[#17324D]">
                  {detailModalTrip.departTime} → {detailModalTrip.arriveTime} ({detailModalTrip.duration})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-[#5A738E]">Available Seats</span>
                <span className="font-semibold text-[#166534]">{detailModalTrip.availableSeats || 24} confirmed seats</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-[#5A738E]">Fare Protection</span>
                <span className="font-bold text-[#006D77]">100% Refundable under DGCA CAR</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDetailModalTrip(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const trip = detailModalTrip;
                  setDetailModalTrip(null);
                  handleSelectTrip(trip);
                }}
                className="px-5 py-2 rounded-xl bg-[#006D77] text-white text-xs font-bold hover:bg-[#00565E]"
              >
                Select this Journey
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
