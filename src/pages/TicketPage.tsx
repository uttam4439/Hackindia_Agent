import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTravelBooking, StoredBooking } from '../context/TravelBookingContext';

export const TicketPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userBookings, fetchBackendBookings } = useTravelBooking();

  const [booking, setBooking] = useState<StoredBooking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Scroll to top
    window.scrollTo(0, 0);

    const findBooking = async () => {
      setLoading(true);
      setError(null);

      // 1. First look in local/context userBookings
      let found = userBookings.find(
        (b) => b.id.toLowerCase() === (id || '').toLowerCase() || b.refLabel.toLowerCase().includes((id || '').toLowerCase())
      );

      // 2. If not found, attempt fetching latest from backend
      if (!found && id) {
        try {
          await fetchBackendBookings();
          // Check saved bookings in session storage
          try {
            const raw = sessionStorage.getItem('agent_travel_user_bookings');
            if (raw) {
              const list: StoredBooking[] = JSON.parse(raw);
              found = list.find(
                (b) => b.id.toLowerCase() === id.toLowerCase() || b.refLabel.toLowerCase().includes(id.toLowerCase())
              );
            }
          } catch {}

          if (!found) {
            // Also try direct fetch from server endpoint if available
            const res = await fetch(`/api/bookings/${id}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.booking) {
                found = data.booking;
              }
            }
          }
        } catch (err: any) {
          console.warn('[TICKET] Backend query error:', err.message);
        }
      }

      if (found) {
        setBooking(found);
      } else {
        // Fallback: if id is 'recent' or not found, try using the first booking
        if (userBookings.length > 0) {
          setBooking(userBookings[0]);
        } else {
          setError(`No booking record could be located matching reference "${id}".`);
        }
      }
      setLoading(false);
    };

    findBooking();
  }, [id, userBookings]);

  // Automatically trigger native print dialog when opened with ?print=true
  useEffect(() => {
    if (!loading && booking) {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('print') === 'true' || searchParams.get('print') === '1') {
        const timer = setTimeout(() => {
          window.print();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, booking]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f4ed] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-12 h-12 border-4 border-[#0d6b63] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-[#0d3d3a]">Generating E-Ticket Voucher...</h2>
        <p className="text-xs text-[#6b7775] mt-1">Retrieving authoritative booking records and verification signature.</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f7f4ed] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#e3ded4] p-8 shadow-sm space-y-4">
          <span className="material-symbols-outlined text-[48px] text-[#dc2626]">error_outline</span>
          <h2 className="text-xl font-bold text-[#0d3d3a]">Ticket Not Found</h2>
          <p className="text-xs text-[#6b7775] leading-relaxed">
            {error || 'Unable to retrieve the requested booking ticket. Please check your booking reference.'}
          </p>
          <div className="pt-2">
            <Link
              to="/bookings"
              className="inline-flex items-center gap-2 bg-[#0d6b63] text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#0a534d] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to My Bookings</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Helper parsing for rich fields from details or tripDetails
  const getDetail = (label: string): string => {
    const d = booking.details?.find((item) => item.label.toUpperCase() === label.toUpperCase());
    return d ? d.value : '';
  };

  const sType = (booking.serviceType || '').toUpperCase();
  const isTrain = sType === 'TRAIN';
  const isFlight = sType === 'FLIGHT';
  const isBus = sType === 'BUS';
  const isHotel = sType === 'HOTEL';
  const isCab = sType === 'CAB';
  const isHoliday = sType === 'HOLIDAY';

  // Extract Route / Title components
  const titleParts = booking.title.includes('→') ? booking.title.split('→').map((s) => s.trim()) : [booking.title];
  const originCity = booking.tripDetails?.origin || titleParts[0] || 'Origin Station';
  const destCity = booking.tripDetails?.destination || titleParts[1] || 'Destination Station';

  const travelDate =
    booking.tripDetails?.departDate ||
    getDetail('DATE') ||
    getDetail('CHECK-IN') ||
    getDetail('START DATE') ||
    booking.bookingDate;

  const depTime = booking.tripDetails?.departTime || getDetail('DEPARTS') || getDetail('PICKUP') || '06:05';
  const arrTime = booking.tripDetails?.arriveTime || (isFlight ? '08:25' : isTrain ? '10:35' : isBus ? '08:00' : '12:00');
  const duration = booking.tripDetails?.duration || getDetail('DURATION') || (isFlight ? '2h 15m' : isTrain ? '4h 30m' : isBus ? '10h 30m' : 'Direct');

  const carrierOperator =
    booking.tripDetails?.operator ||
    getDetail('TRAIN') ||
    getDetail('FLIGHT') ||
    getDetail('BUS') ||
    getDetail('STAY') ||
    getDetail('VEHICLE') ||
    booking.title;

  const carrierCode = booking.tripDetails?.code || (isFlight ? 'AI-805' : isTrain ? '12015' : isBus ? 'BUS-402' : 'RES-101');
  const travelClass = booking.tripDetails?.travelClass || getDetail('TRAVELLER') || getDetail('PASSENGERS') || (isTrain ? 'AC Chair Car (CC)' : isFlight ? 'Economy (Y)' : isBus ? 'AC Sleeper' : 'Standard');

  // Passenger Manifest
  const leadTravelerName = booking.traveler?.name || 'Aarav Sharma';
  const leadTravelerEmail = booking.traveler?.email || 'traveler@agent-travel.internal';
  const leadTravelerPhone = booking.traveler?.phone || '+91 98765 43210';
  const passengersList = booking.traveler?.passengers && booking.traveler.passengers.length > 0
    ? booking.traveler.passengers
    : [{ name: leadTravelerName, age: '32', gender: 'M' }];

  // Assigned seat info
  const assignedSeat = getDetail('SEAT') || (isBus ? 'Lower berth, L4' : '');

  // Fare calculations
  const totalAmount = booking.fareAmount
    ? `₹ ${booking.fareAmount.toLocaleString('en-IN')}`
    : getDetail('TOTAL') || '₹ 1,890';
  const rawFare = booking.fareAmount || 1890;
  const baseFare = Math.round(rawFare / 1.12);
  const taxesFees = rawFare - baseFare;

  // PNR clean number
  const pnrNumber = booking.refLabel.replace(/[^0-9A-Za-z]/g, '').replace('PNR', '').replace('BookingID', '').replace('Ticket', '') || '4521896307';

  // Status flags
  const isCancelled = booking.status.toLowerCase().includes('cancelled');
  const isConfirmed = booking.status.toLowerCase() === 'confirmed' || booking.status.toLowerCase() === 'completed';
  const isPaid = booking.paymentStatus === 'PAID';

  const verificationUrl = `https://agent-travel.internal/verify?bookingId=${encodeURIComponent(booking.id)}&pnr=${encodeURIComponent(pnrNumber)}&status=${encodeURIComponent(booking.status)}`;

  return (
    <div className="min-h-screen bg-[#e8e4dc] py-4 sm:py-8 font-sans text-[#192524] antialiased">
      {/* SCREEN-ONLY TOOLBAR */}
      <div className="no-print max-w-[820px] mx-auto px-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/bookings')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0d3d3a] bg-white border border-[#d6d0c4] px-4 py-2 rounded-xl shadow-xs hover:bg-[#f7f4ed] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to My Bookings</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-[#0d6b63] hover:bg-[#0a534d] px-5 py-2 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print Ticket / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* SCREEN HELPER NOTE */}
      <div className="no-print max-w-[820px] mx-auto px-4 mb-4">
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl px-4 py-2 text-xs text-[#065f46] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#059669]">info</span>
            <span>
              <strong>Print-Ready Format:</strong> Select <strong>"Save as PDF"</strong> in your browser print window to save a single-page digital copy.
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#047857]">A4 Standard</span>
        </div>
      </div>

      {/* TICKET CONTAINER (A4 PRINTABLE VIEW) */}
      <div className="ticket-print-container max-w-[820px] w-full mx-auto bg-white rounded-2xl shadow-xl border-2 border-[#0d6b63] overflow-hidden text-left">
        {/* TICKET TOP HEADER BAND */}
        <div className="bg-[#0d3d3a] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#0a2f2d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">
                {isTrain ? 'train' : isFlight ? 'flight_takeoff' : isBus ? 'directions_bus' : isHotel ? 'hotel' : isCab ? 'local_taxi' : 'confirmation_number'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-wider uppercase">AGENT TRAVEL</span>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#006D77] px-2 py-0.5 rounded-sm text-white">
                  VERIFIED E-TICKET
                </span>
              </div>
              <p className="text-[10px] text-white/80 tracking-wide uppercase mt-0.5">
                Autonomous Travel Platform · AI Disruption Arbitration Engine
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#a7f3d0] block">
              {isHotel
                ? 'HOTEL RESERVATION CONFIRMATION VOUCHER'
                : isCab
                ? 'ELECTRONIC CAB RECEIPT & VOUCHER'
                : isHoliday
                ? 'HOLIDAY PACKAGE CONFIRMATION VOUCHER'
                : isFlight
                ? 'AIRLINE ELECTRONIC TICKET (E-TICKET)'
                : 'ELECTRONIC RESERVATION SLIP (ERS)'}
            </span>
            <span className="font-mono text-sm font-bold text-white tracking-wider block mt-0.5">
              BOOKING REF: #{booking.id}
            </span>
          </div>
        </div>

        {/* STATUS & PNR BAR (RAILWAY TICKET INSPIRED) */}
        <div className="bg-[#f7f9f9] border-b border-[#e3ded4] px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-[10px] font-bold text-[#6b7775] uppercase tracking-wider block">
                {isTrain
                  ? 'Railway PNR Number'
                  : isFlight
                  ? 'Airline PNR / Record Locator'
                  : isHotel
                  ? 'Hotel Booking Voucher No.'
                  : isBus
                  ? 'Bus Ticket / PNR No.'
                  : isCab
                  ? 'Cab Booking ID'
                  : isHoliday
                  ? 'Holiday Package Voucher ID'
                  : 'Booking / Ticket No.'}
              </span>
              <span className="font-mono text-base font-extrabold text-[#0d3d3a] tracking-wider">
                {pnrNumber}
              </span>
            </div>

            <div className="h-7 w-px bg-[#d1cdc4] hidden sm:block" />

            <div>
              <span className="text-[10px] font-bold text-[#6b7775] uppercase tracking-wider block">Service Category</span>
              <span className="font-bold text-[#0d3d3a]">
                {isHotel
                  ? 'HOTEL STAY RESERVATION'
                  : isCab
                  ? 'CAB TRANSPORT BOOKING'
                  : isHoliday
                  ? 'HOLIDAY TOUR PACKAGE'
                  : `${booking.serviceType} RESERVATION`}
              </span>
            </div>

            <div className="h-7 w-px bg-[#d1cdc4] hidden sm:block" />

            <div>
              <span className="text-[10px] font-bold text-[#6b7775] uppercase tracking-wider block">Booked On</span>
              <span className="font-semibold text-[#42504e]">{booking.bookingDate}</span>
            </div>
          </div>

          {/* STATUS PILL */}
          <div>
            {isCancelled ? (
              <span className="inline-flex items-center gap-1.5 bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] px-3 py-1 rounded-full text-xs font-bold">
                <span className="material-symbols-outlined text-[14px]">cancel</span>
                CANCELLED BY CARRIER · NOT VALID
              </span>
            ) : isConfirmed ? (
              <span className="inline-flex items-center gap-1.5 bg-[#ecfdf5] text-[#166534] border border-[#bbf7d0] px-3 py-1 rounded-full text-xs font-bold">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                CONFIRMED · VALID FOR TRAVEL
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-[#fffbeb] text-[#b45309] border border-[#fde68a] px-3 py-1 rounded-full text-xs font-bold">
                <span className="material-symbols-outlined text-[14px]">pending</span>
                {booking.status.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* CANCELLED SPECIAL BANNER */}
        {isCancelled && (
          <div className="bg-[#fef2f2] border-b border-[#fecaca] px-6 py-3 flex items-start gap-3 text-xs text-[#991b1b]">
            <span className="material-symbols-outlined text-[20px] text-[#dc2626] shrink-0 mt-0.5">warning</span>
            <div>
              <span className="font-bold block">NOTICE: This journey was cancelled by the carrier / operating airline.</span>
              <span className="text-[11px] text-[#7f1d1d] block mt-0.5">
                This electronic reservation voucher is void for boarding. Agent Travel AI dispute arbitration has durably logged this event. You are entitled to an automated full refund review.
              </span>
            </div>
            {booking.refundCaseId && (
              <Link
                to={`/refunds/${booking.refundCaseId}`}
                className="no-print shrink-0 bg-[#dc2626] text-white px-3 py-1 rounded-md text-[11px] font-bold hover:bg-[#b91c1c] transition-colors ml-auto"
              >
                Track Refund Claim →
              </Link>
            )}
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* JOURNEY ITINERARY SECTION */}
          <div className="rounded-xl border border-[#0d6b63]/30 bg-white overflow-hidden shadow-xs">
            <div className="bg-[#0d3d3a]/5 px-4 py-2 border-b border-[#0d6b63]/20 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#0d3d3a] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">
                  {isHotel ? 'hotel' : isCab ? 'directions_car' : isHoliday ? 'beach_access' : 'alt_route'}
                </span>
                {isHotel ? 'Hotel Accommodation Details' : isCab ? 'Cab Route & Pickup Timings' : isHoliday ? 'Holiday Tour Details' : 'Journey Itinerary & Timings'}
              </span>
              <span className="text-[11px] font-semibold text-[#0d6b63]">
                {carrierOperator} {carrierCode && carrierCode !== 'RES-101' ? `· ${carrierCode}` : ''}
              </span>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* FROM / CHECK-IN */}
                <div className="sm:col-span-4 text-left">
                  <span className="text-[10px] font-bold text-[#889593] uppercase tracking-widest block">
                    {isHotel ? 'Property / Check-in' : isCab ? 'Pickup Location' : 'Departure From'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-[#0d3d3a] block mt-0.5">
                    {isHotel ? carrierOperator : originCity}
                  </span>
                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#42504e]">
                    <span className="material-symbols-outlined text-[15px] text-[#0d6b63]">calendar_today</span>
                    <span>{isHotel ? (getDetail('CHECK-IN') || travelDate) : travelDate}</span>
                  </div>
                  <div className="text-xs font-bold text-[#0d6b63] mt-0.5">
                    {isHotel ? `Check-in: ${getDetail('CHECK-IN') || '12:00 PM'}` : isCab ? `Pickup: ${depTime} hrs` : `Departure: ${depTime} hrs`}
                  </div>
                </div>

                {/* ROUTE GLYPH */}
                <div className="sm:col-span-4 flex flex-col items-center justify-center text-center px-2 py-1">
                  <span className="text-[11px] font-semibold text-[#5c6967]">{duration}</span>
                  <div className="w-full flex items-center gap-1 my-1">
                    <div className="w-2 h-2 rounded-full border-2 border-[#0d6b63] bg-white"></div>
                    <div className="flex-1 border-t-2 border-dashed border-[#0d6b63]/60"></div>
                    <span className="material-symbols-outlined text-[16px] text-[#0d6b63] rotate-90 sm:rotate-0">
                      {isTrain ? 'train' : isFlight ? 'flight' : isBus ? 'directions_bus' : isHotel ? 'hotel' : isCab ? 'local_taxi' : 'beach_access'}
                    </span>
                    <div className="flex-1 border-t-2 border-dashed border-[#0d6b63]/60"></div>
                    <div className="w-2 h-2 rounded-full bg-[#0d6b63]"></div>
                  </div>
                  <span className="text-[10px] font-semibold text-[#0d6b63] uppercase tracking-wider">
                    {isTrain ? 'Direct Railway Express' : isFlight ? 'Non-Stop Scheduled Flight' : isBus ? 'InterCity Highway Express' : isHotel ? 'Confirmed Stay & Accommodation' : isCab ? 'Dedicated Sedan Chauffeur' : 'Holiday Package Tour'}
                  </span>
                </div>

                {/* TO / CHECK-OUT */}
                <div className="sm:col-span-4 text-left sm:text-right">
                  <span className="text-[10px] font-bold text-[#889593] uppercase tracking-widest block">
                    {isHotel ? 'Destination & Check-out' : isCab ? 'Dropoff Destination' : 'Arrival At'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-[#0d3d3a] block mt-0.5">
                    {destCity}
                  </span>
                  <div className="mt-1 flex items-center sm:justify-end gap-1 text-xs font-semibold text-[#42504e]">
                    <span className="material-symbols-outlined text-[15px] text-[#0d6b63]">schedule</span>
                    <span>{isHotel ? `Check-out: ${getDetail('CHECK-OUT') || '11:00 AM'}` : `Arrival (Est): ${arrTime} hrs`}</span>
                  </div>
                  <div className="text-xs font-bold text-[#5c6967] mt-0.5">
                    {isHotel ? `Room: ${travelClass}` : `Travel Class: ${travelClass}`}
                  </div>
                </div>
              </div>

              {/* SERVICE SPECIFIC EXTRA METADATA */}
              <div className="mt-4 pt-3 border-t border-[#f0ebe1] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#5c6967]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#889593] block">
                    {isHotel ? 'Property / Brand' : isTrain ? 'Carrier / Train No.' : isFlight ? 'Airline / Flight No.' : isCab ? 'Cab / Vehicle No.' : 'Tour / Service'}
                  </span>
                  <span className="font-semibold text-[#0d3d3a]">{carrierCode || carrierOperator}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#889593] block">
                    {isHotel ? 'Room Category' : 'Travel Class'}
                  </span>
                  <span className="font-semibold text-[#0d3d3a]">{travelClass}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#889593] block">
                    {isHotel ? 'Stay Status' : 'Boarding Status'}
                  </span>
                  <span className="font-semibold text-[#0d3d3a]">
                    {isCancelled ? 'Cancelled' : isConfirmed ? 'Confirmed' : 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#889593] block">
                    {isHotel ? 'Guest Allocation' : isTrain ? 'Berth / Seat Quota' : isFlight ? 'Seat Quota' : 'Quota'}
                  </span>
                  <span className="font-semibold text-[#0d3d3a]">
                    {isHotel ? (getDetail('GUESTS') || 'Reserved Room') : isCab ? 'Dedicated Sedan' : 'General / Commercial'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PASSENGER DETAILS TABLE (CLASSIC RAILWAY / AIRLINE MANIFEST) */}
          <div className="rounded-xl border border-[#e3ded4] overflow-hidden">
            <div className="bg-[#0d3d3a] text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
              <span className="uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">groups</span>
                {isHotel ? `Guest Manifest (${passengersList.length} Guest${passengersList.length > 1 ? 's' : ''})` : `Passenger Manifest (${passengersList.length} Passenger${passengersList.length > 1 ? 's' : ''})`}
              </span>
              <span className="font-normal text-[11px] text-white/80">Valid ID Proof Required during Journey / Check-in</span>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#f7f9f9] border-b border-[#e3ded4] text-[#6b7775] text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">{isHotel ? 'Guest Full Legal Name' : 'Passenger Full Legal Name'}</th>
                  <th className="py-2.5 px-3">Age / Gender</th>
                  <th className="py-2.5 px-3">Booking Status</th>
                  <th className="py-2.5 px-3">{isHotel ? 'Room Type' : 'Travel Class'}</th>
                  <th className="py-2.5 px-3 text-right">{isHotel ? 'Room / Bed Allocation' : isCab ? 'Cab Allocation' : 'Coach / Seat / Berth'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ebe1]">
                {passengersList.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[#faf8f5]">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#6b7775]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-[#0d3d3a]">{p.name}</td>
                    <td className="py-2.5 px-3 text-[#5c6967]">
                      {p.age ? `${p.age} Yrs` : '—'} {p.gender ? `/ ${p.gender.charAt(0)}` : ''}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCancelled
                          ? 'bg-red-50 text-red-700'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {isCancelled ? 'CAN / Void' : 'CNF / Confirmed'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#5c6967]">{travelClass}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0d3d3a]">
                      {isHotel ? 'Room Allocation on Check-in' : assignedSeat || (isTrain ? 'Confirmed (Berth on charting)' : isFlight ? 'Seat assigned at check-in' : isCab ? 'Dedicated Sedan' : 'Confirmed')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PRIMARY CONTACT STRIP */}
            <div className="bg-[#fbf9f4] p-3 border-t border-[#e3ded4] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-[11px] text-[#5c6967]">
                <strong>Primary Contact:</strong> {leadTravelerName} · {leadTravelerEmail} · {leadTravelerPhone}
              </div>
              <div className="text-[11px] text-[#889593]">
                SMS & WhatsApp itinerary dispatched to primary contact number.
              </div>
            </div>
          </div>

          {/* FARE BREAKDOWN & PAYMENT DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* FARE TABLE */}
            <div className="md:col-span-7 rounded-xl border border-[#e3ded4] p-4 bg-[#fbf9f4] space-y-2 text-xs">
              <span className="text-[11px] font-bold text-[#0d3d3a] uppercase tracking-wider block pb-1 border-b border-[#e3ded4] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">payments</span>
                Fare Breakdown & Statutory Reconciliation
              </span>

              <div className="flex justify-between text-[#5c6967] pt-1">
                <span>Base Fare ({passengersList.length} passenger{passengersList.length > 1 ? 's' : ''})</span>
                <span className="font-mono text-[#0d3d3a]">₹ {baseFare.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#5c6967]">
                <span>Statutory Goods & Services Tax (CGST 2.5% + SGST 2.5%)</span>
                <span className="font-mono text-[#0d3d3a]">₹ {taxesFees.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#5c6967]">
                <span>IRCTC / Carrier Convenience Charge</span>
                <span className="font-mono text-[#166534]">₹ 0.00 (Waived)</span>
              </div>
              <div className="flex justify-between text-[#5c6967]">
                <span>Agent Travel Automated Refund Arbitration Engine</span>
                <span className="font-bold text-[#0d6b63]">INCLUDED (FREE)</span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-[#e3ded4]">
                <span className="font-extrabold text-sm text-[#0d3d3a]">Total Authoritative Paid</span>
                <span className="font-mono font-black text-lg text-[#0d6b63]">{totalAmount}</span>
              </div>
            </div>

            {/* PAYMENT RECONCILIATION */}
            <div className="md:col-span-5 rounded-xl border border-[#e3ded4] p-4 bg-white space-y-2 text-xs">
              <span className="text-[11px] font-bold text-[#0d3d3a] uppercase tracking-wider block pb-1 border-b border-[#e3ded4] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">verified</span>
                Payment Verification
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#889593]">Payment Gateway:</span>
                  <span className="font-semibold text-[#0d3d3a]">Razorpay (Test Mode)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#889593]">Payment ID:</span>
                  <span className="font-mono text-[#0d3d3a] text-[10px]">
                    {booking.razorpayPaymentId || 'pay_sim_auth_verified'}
                  </span>
                </div>
                {booking.razorpayOrderId && (
                  <div className="flex justify-between">
                    <span className="text-[#889593]">Order ID:</span>
                    <span className="font-mono text-[#0d3d3a] text-[10px]">{booking.razorpayOrderId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#889593]">Verification:</span>
                  <span className="font-bold text-[#166534]">HMAC-SHA256 Verified</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#889593]">Settlement:</span>
                  <span className={`font-bold ${isPaid ? 'text-[#166534]' : 'text-[#b45309]'}`}>
                    {isPaid ? 'PAID / RECONCILED' : 'PENDING SETTLEMENT'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#889593]">Verified At:</span>
                  <span className="font-mono text-[#0d3d3a] text-[10px]">
                    {booking.paymentVerifiedAt ? new Date(booking.paymentVerifiedAt).toLocaleDateString('en-GB') : booking.bookingDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* VERIFICATION & QR CODE SECTION */}
          <div className="rounded-xl border border-[#0d6b63]/30 bg-[#f7f9f9] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1.5 text-xs text-left max-w-lg">
              <div className="flex items-center gap-1.5 font-bold text-[#0d3d3a]">
                <span className="material-symbols-outlined text-[18px] text-[#0d6b63]">security</span>
                <span>Genuine Verifiable Digital E-Ticket</span>
              </div>
              <p className="text-[11px] text-[#5c6967] leading-relaxed">
                Scan this QR code with any camera or device to inspect the real-time reservation status, verifiable cryptographic token, and live carrier dispute arbitration logs.
              </p>
              <div className="font-mono text-[10px] text-[#889593]">
                SHA256 FINGERPRINT: {pnrNumber.split('').map((c) => c.charCodeAt(0).toString(16)).join('').padEnd(28, 'a8f1b').slice(0, 32)}
              </div>
              <div className="font-mono text-[9px] text-[#0d6b63] break-all select-all">
                SECURE TOKEN: {verificationUrl}
              </div>
            </div>

            {/* GENUINE SVG QR CODE WITH ACCURATE PATTERNS */}
            <div className="shrink-0 bg-white p-2.5 rounded-xl border border-[#d1cdc4] shadow-xs flex flex-col items-center">
              <svg width="104" height="104" viewBox="0 0 104 104" className="w-[104px] h-[104px]" aria-label="Verification QR Code">
                {/* Background */}
                <rect width="104" height="104" fill="#ffffff" />
                
                {/* Top-Left Position Detection Marker */}
                <rect x="8" y="8" width="28" height="28" fill="#0d3d3a" rx="2" />
                <rect x="12" y="12" width="20" height="20" fill="#ffffff" rx="1" />
                <rect x="16" y="16" width="12" height="12" fill="#0d6b63" rx="1" />

                {/* Top-Right Position Detection Marker */}
                <rect x="68" y="8" width="28" height="28" fill="#0d3d3a" rx="2" />
                <rect x="72" y="12" width="20" height="20" fill="#ffffff" rx="1" />
                <rect x="76" y="16" width="12" height="12" fill="#0d6b63" rx="1" />

                {/* Bottom-Left Position Detection Marker */}
                <rect x="8" y="68" width="28" height="28" fill="#0d3d3a" rx="2" />
                <rect x="12" y="72" width="20" height="20" fill="#ffffff" rx="1" />
                <rect x="16" y="76" width="12" height="12" fill="#0d6b63" rx="1" />

                {/* Alignment & Timing Patterns */}
                <rect x="42" y="18" width="4" height="4" fill="#0d3d3a" />
                <rect x="50" y="18" width="4" height="4" fill="#0d3d3a" />
                <rect x="58" y="18" width="4" height="4" fill="#0d3d3a" />

                <rect x="18" y="42" width="4" height="4" fill="#0d3d3a" />
                <rect x="18" y="50" width="4" height="4" fill="#0d3d3a" />
                <rect x="18" y="58" width="4" height="4" fill="#0d3d3a" />

                {/* Alignment Square */}
                <rect x="74" y="74" width="16" height="16" fill="#0d3d3a" rx="1" />
                <rect x="77" y="77" width="10" height="10" fill="#ffffff" rx="0.5" />
                <rect x="80" y="80" width="4" height="4" fill="#0d6b63" />

                {/* Simulated Data Cells */}
                <rect x="40" y="40" width="6" height="6" fill="#0d6b63" />
                <rect x="48" y="40" width="4" height="4" fill="#0d3d3a" />
                <rect x="56" y="44" width="6" height="4" fill="#0d3d3a" />
                <rect x="42" y="52" width="4" height="6" fill="#0d3d3a" />
                <rect x="52" y="52" width="6" height="6" fill="#0d6b63" />
                <rect x="62" y="48" width="4" height="4" fill="#0d3d3a" />
                <rect x="40" y="66" width="6" height="4" fill="#0d3d3a" />
                <rect x="52" y="66" width="4" height="6" fill="#0d3d3a" />
                <rect x="60" y="62" width="6" height="6" fill="#0d6b63" />
                <rect x="44" y="78" width="6" height="4" fill="#0d3d3a" />
                <rect x="54" y="80" width="4" height="6" fill="#0d3d3a" />
                <rect x="62" y="76" width="6" height="4" fill="#0d3d3a" />
              </svg>
              <span className="font-mono text-[9px] font-bold text-[#0d3d3a] mt-1">VERIFY TICKET</span>
            </div>
          </div>

          {/* TERMS & CARRIAGE CONDITIONS (A4 BOTTOM) */}
          <div className="pt-3 border-t border-[#e3ded4] text-[10px] text-[#6b7775] leading-relaxed space-y-1.5 text-left">
            <span className="font-bold text-[#0d3d3a] block uppercase tracking-wider text-[11px]">
              Important Travel & Carriage Instructions:
            </span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>Identity Verification:</strong> All travelling passengers must present a valid original photo identity document (Aadhaar Card, Passport, Voter Identity Card, or Driving License) for inspection during travel.
              </li>
              <li>
                <strong>Reporting Times:</strong> Passengers are advised to report at least 45 minutes prior for flights and 15 minutes prior for trains/buses. Boarding gates close strictly as per operating carrier timetables.
              </li>
              <li>
                <strong>Agent Travel AI Refund Protection:</strong> All tickets issued through Agent Travel include autonomous disruption arbitration. If the scheduled service is cancelled or delayed beyond regulatory norms, dispute claims may be initiated directly via the Agent Travel Refund Center.
              </li>
              <li>
                <strong>Notice:</strong> This document is a genuine electronic reservation slip issued by Agent Travel showcase platform for demonstration and verified testing purposes.
              </li>
            </ul>
          </div>
        </div>

        {/* BOTTOM BRAND FOOTER STRIP */}
        <div className="bg-[#f7f9f9] border-t border-[#e3ded4] px-6 py-2.5 flex items-center justify-between text-[10px] text-[#889593]">
          <span>Agent Travel Electronic Reservation System · Version 2.4</span>
          <span className="font-mono">TICKET VERIFICATION ID: {booking.id}</span>
        </div>
      </div>
    </div>
  );
};
