import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { useTravelBooking } from '../context/TravelBookingContext';

type ServiceType = 'flights' | 'hotels' | 'holidays' | 'bus' | 'trains' | 'cabs';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { searchCriteria, setSearchCriteria } = useTravelBooking();

  const [activeService, setActiveService] = useState<ServiceType>(() => {
    if (searchCriteria.serviceType === 'buses') return 'bus';
    if (searchCriteria.serviceType === 'trains') return 'trains';
    if (searchCriteria.serviceType === 'hotels') return 'hotels';
    if (searchCriteria.serviceType === 'cabs') return 'cabs';
    if (searchCriteria.serviceType === 'holidays') return 'holidays';
    return 'flights';
  });

  // Flight form state
  const [flightTripType, setFlightTripType] = useState<'oneway' | 'roundtrip'>('oneway');
  const [fromCity, setFromCity] = useState(searchCriteria.origin || 'Delhi (DEL)');
  const [toCity, setToCity] = useState(searchCriteria.destination || 'Mumbai (BOM)');
  const [departDate, setDepartDate] = useState(searchCriteria.departDate || '2026-12-21');
  const [returnDate, setReturnDate] = useState(searchCriteria.returnDate || '2026-12-28');
  const [flightPassengers, setFlightPassengers] = useState(1);
  const [flightClass, setFlightClass] = useState('Economy');

  // Hotel form state
  const [hotelCity, setHotelCity] = useState(searchCriteria.destination?.includes('Goa') ? searchCriteria.destination : 'Goa, India');
  const [checkIn, setCheckIn] = useState('2026-12-21');
  const [checkOut, setCheckOut] = useState('2026-12-24');
  const [guests, setGuests] = useState('2 Guests · 1 Room');

  // Train form state
  const [trainFrom, setTrainFrom] = useState(searchCriteria.origin?.includes('Delhi') ? searchCriteria.origin : 'New Delhi (NDLS)');
  const [trainTo, setTrainTo] = useState(searchCriteria.destination?.includes('Jaipur') ? searchCriteria.destination : 'Jaipur (JP)');
  const [trainDate, setTrainDate] = useState(searchCriteria.departDate || '2026-11-02');
  const [trainPassengers, setTrainPassengers] = useState(1);
  const [trainClass, setTrainClass] = useState(searchCriteria.travelClass || 'All Classes');

  // Bus form state
  const [busFrom, setBusFrom] = useState('Bengaluru');
  const [busTo, setBusTo] = useState('Goa');
  const [busDate, setBusDate] = useState(searchCriteria.departDate || '2026-11-06');
  const [busPassengers, setBusPassengers] = useState(1);
  const [busAcPref, setBusAcPref] = useState<'Any' | 'AC' | 'Non-AC'>('Any');
  const [busSeatPref, setBusSeatPref] = useState<'Any' | 'Sleeper' | 'Seater'>('Any');

  // Cab form state
  const [cabPickup, setCabPickup] = useState('Delhi Airport (DEL)');
  const [cabDrop, setCabDrop] = useState('Connaught Place');
  const [cabDate, setCabDate] = useState('2026-10-24 08:30');

  // Holiday form state
  const [holidayFrom, setHolidayFrom] = useState('Delhi');
  const [holidayDest, setHolidayDest] = useState('Kashmir');

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSwapCities = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
    setValidationError(null);
  };

  const handleSwapTrainStations = () => {
    const temp = trainFrom;
    setTrainFrom(trainTo);
    setTrainTo(temp);
    setValidationError(null);
  };

  const handleSwapBusStations = () => {
    const temp = busFrom;
    setBusFrom(busTo);
    setBusTo(temp);
    setValidationError(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (activeService === 'flights') {
      const o = fromCity.trim();
      const d = toCity.trim();
      if (!o || !d) {
        setValidationError('Please specify both origin and destination for your flight.');
        return;
      }
      if (o.toLowerCase() === d.toLowerCase()) {
        setValidationError('Origin and destination cannot be the same city.');
        return;
      }
      if (!departDate) {
        setValidationError('Please select a valid departure date.');
        return;
      }
      if (flightTripType === 'roundtrip' && returnDate && returnDate < departDate) {
        setValidationError('Return date must be on or after the departure date.');
        return;
      }
      setSearchCriteria({
        serviceType: 'flights',
        origin: o,
        destination: d,
        departDate,
        returnDate: flightTripType === 'roundtrip' ? returnDate : undefined,
        tripType: flightTripType === 'oneway' ? 'oneWay' : 'roundTrip',
        travelClass: flightClass,
        passengers: `${flightPassengers} Traveller${flightPassengers > 1 ? 's' : ''} · ${flightClass}`,
      });
      navigate('/flights');
    } else if (activeService === 'trains') {
      const from = trainFrom.trim();
      const to = trainTo.trim();
      if (!from || !to) {
        setValidationError('Please specify both departure and arrival train stations.');
        return;
      }
      if (from.toLowerCase() === to.toLowerCase()) {
        setValidationError('Departure and arrival stations cannot be the same.');
        return;
      }
      if (!trainDate) {
        setValidationError('Please select a journey date for your train.');
        return;
      }
      setSearchCriteria({
        serviceType: 'trains',
        origin: from,
        destination: to,
        departDate: trainDate,
        travelClass: trainClass,
        passengers: `${trainPassengers} Passenger${trainPassengers > 1 ? 's' : ''}`,
      });
      navigate('/trains');
    } else if (activeService === 'bus') {
      const from = busFrom.trim();
      const to = busTo.trim();
      if (!from || !to) {
        setValidationError('Please specify both origin and destination for your bus.');
        return;
      }
      if (from.toLowerCase() === to.toLowerCase()) {
        setValidationError('Origin and destination cannot be the same.');
        return;
      }
      if (!busDate) {
        setValidationError('Please select a date of journey for your bus.');
        return;
      }
      setSearchCriteria({
        serviceType: 'buses',
        origin: from,
        destination: to,
        departDate: busDate,
        passengers: `${busPassengers} Passenger${busPassengers > 1 ? 's' : ''}`,
      });
      navigate('/buses');
    } else if (activeService === 'hotels') {
      const c = hotelCity.trim();
      if (!c) {
        setValidationError('Please enter a destination city or hotel.');
        return;
      }
      if (!checkIn || !checkOut) {
        setValidationError('Please select both check-in and check-out dates.');
        return;
      }
      const inTime = new Date(checkIn + 'T00:00:00').getTime();
      const outTime = new Date(checkOut + 'T00:00:00').getTime();
      if (outTime <= inTime) {
        setValidationError('Check-out date must be later than check-in date.');
        return;
      }
      setSearchCriteria({
        serviceType: 'hotels',
        destination: c,
        departDate: checkIn,
        returnDate: checkOut,
        passengers: guests,
      });
      navigate('/hotels');
    } else if (activeService === 'cabs') {
      setSearchCriteria({
        serviceType: 'cabs',
        origin: cabPickup,
        destination: cabDrop,
        departDate: cabDate.split(' ')[0] || '2026-10-24',
      });
      navigate('/cabs');
    } else if (activeService === 'holidays') {
      setSearchCriteria({
        serviceType: 'holidays',
        origin: holidayFrom,
        destination: holidayDest,
      });
      navigate('/holidays');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <SiteHeader />

      <main className="flex-1 w-full text-left">
        {/* HERO SECTION (Page 1) */}
        <section className="site-container pt-8 pb-10 sm:pt-12 sm:pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f2f0] border border-[#d0dfd3] text-[#0d6b63] text-xs font-bold tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-[#0d6b63]"></span>
                AI-Powered Travel Refund Assistance
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold text-[#0d3d3a] tracking-tight leading-[1.12]">
                Your Journey, Made <br className="hidden sm:inline" />
                Simpler.
              </h1>

              <p className="text-[#5c6967] text-base sm:text-lg leading-relaxed max-w-2xl">
                Book flights, hotels, trains, buses and more in one place. If your
                booking is cancelled or disrupted, our AI helps you check refund
                eligibility, understand applicable policies and track your claim.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/refunds"
                  className="bg-[#0d6b63] text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-[#0a534d] transition-colors shadow-sm flex items-center gap-1.5"
                >
                  Check Refund Eligibility
                </Link>
                <a
                  href="#booking-panel"
                  className="border border-[#0d6b63] text-[#0d6b63] bg-white/60 px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-[#e8f2f0] transition-colors"
                >
                  Explore Travel
                </a>
              </div>

              <p className="text-xs text-[#889593] leading-relaxed pt-1 max-w-xl">
                Refund eligibility and amounts depend on your booking, applicable policies and provider decisions.
              </p>
            </div>

            {/* Right Hero Image (Kashmir photo from PDF mockup) */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-[#e3ded4] shadow-md bg-white aspect-[4/3] sm:aspect-[16/11] lg:h-[360px] xl:h-[400px]">
                <img
                  src="https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80"
                  alt="Kashmir Dal Lake and mountains"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-5">
                  <div className="text-white">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#d0dfd3] block">
                      Featured Destination
                    </span>
                    <h3 className="text-xl font-bold tracking-tight">Kashmir · Valley of Lakes</h3>
                    <p className="text-xs text-white/80 mt-0.5">Explore serene waters, snow-capped ridges and shikara stays</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* UNIVERSAL BOOKING PANEL (Page 1) */}
        <section id="booking-panel" className="site-container pb-14">
          <div className="bg-white rounded-xl border border-[#e3ded4] shadow-sm overflow-hidden">
            {/* Service Tabs */}
            <div className="flex items-center overflow-x-auto border-b border-[#e3ded4] bg-[#fbf9f4] px-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveService('flights')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  activeService === 'flights'
                    ? 'border-[#0d6b63] text-[#0d3d3a] bg-white rounded-t-lg'
                    : 'border-transparent text-[#6b7775] hover:text-[#0d3d3a]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">flight</span>
                Flights
              </button>

              <button
                type="button"
                onClick={() => setActiveService('trains')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                  activeService === 'trains'
                    ? 'border-[#0d6b63] text-[#0d3d3a] bg-white rounded-t-lg'
                    : 'border-transparent text-[#6b7775] hover:text-[#0d3d3a]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">train</span>
                Trains
              </button>

              <button
                type="button"
                onClick={() => setActiveService('bus')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                  activeService === 'bus'
                    ? 'border-[#0d6b63] text-[#0d3d3a] bg-white rounded-t-lg'
                    : 'border-transparent text-[#6b7775] hover:text-[#0d3d3a]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">directions_bus</span>
                Buses
              </button>

              <div className="h-5 w-px bg-[#e3ded4] mx-2 hidden sm:block" />

              <button
                type="button"
                onClick={() => setActiveService('hotels')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                  activeService === 'hotels'
                    ? 'border-[#0d6b63] text-[#0d3d3a] bg-white rounded-t-lg'
                    : 'border-transparent text-[#889593] hover:text-[#0d3d3a]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">hotel</span>
                Hotels
              </button>

              <button
                type="button"
                onClick={() => setActiveService('holidays')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                  activeService === 'holidays'
                    ? 'border-[#0d6b63] text-[#0d3d3a] bg-white rounded-t-lg'
                    : 'border-transparent text-[#889593] hover:text-[#0d3d3a]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">beach_access</span>
                Holidays
              </button>

              <button
                type="button"
                onClick={() => setActiveService('cabs')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                  activeService === 'cabs'
                    ? 'border-[#0d6b63] text-[#0d3d3a] bg-white rounded-t-lg'
                    : 'border-transparent text-[#889593] hover:text-[#0d3d3a]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">local_taxi</span>
                Cabs
              </button>
            </div>

            {/* Tab Form Content */}
            <form onSubmit={handleSearch} className="p-5 sm:p-6 space-y-4">
              {validationError && (
                <div className="p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-xs font-semibold flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{validationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValidationError(null)}
                    className="text-[#991b1b] hover:opacity-75 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              {/* Flights Form */}
              {activeService === 'flights' && (
                <div className="space-y-4">
                  {/* Trip Type Selector & Disruption Protection Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f0ebe1]">
                    <div className="flex items-center gap-4 text-xs font-semibold text-[#0d3d3a]">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="flightTripType"
                          value="oneway"
                          checked={flightTripType === 'oneway'}
                          onChange={() => setFlightTripType('oneway')}
                          className="accent-[#0d6b63] cursor-pointer"
                        />
                        <span>One-Way</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="flightTripType"
                          value="roundtrip"
                          checked={flightTripType === 'roundtrip'}
                          onChange={() => setFlightTripType('roundtrip')}
                          className="accent-[#0d6b63] cursor-pointer"
                        />
                        <span>Round-Trip</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0d6b63] bg-[#e8f2f0] px-2.5 py-1 rounded-full">
                      <span className="material-symbols-outlined text-[15px]">verified_user</span>
                      <span>DGCA CAR Passenger Refund Protection Included</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end">
                    {/* From City / Airport */}
                    <div className="lg:col-span-2 border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors relative">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                          From (City / Airport)
                        </label>
                        <button
                          type="button"
                          onClick={handleSwapCities}
                          title="Swap Cities"
                          className="text-[#0d6b63] hover:text-[#0a534d] cursor-pointer text-[11px] font-bold flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                          <span>Swap</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={fromCity}
                        onChange={(e) => {
                          setFromCity(e.target.value);
                          setValidationError(null);
                        }}
                        placeholder="e.g. Delhi (DEL)"
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5"
                        required
                      />
                    </div>

                    {/* To City / Airport */}
                    <div className="lg:col-span-2 border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                        To (City / Airport)
                      </label>
                      <input
                        type="text"
                        value={toCity}
                        onChange={(e) => {
                          setToCity(e.target.value);
                          setValidationError(null);
                        }}
                        placeholder="e.g. Mumbai (BOM)"
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5"
                        required
                      />
                    </div>

                    {/* Departure Date */}
                    <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                        Departure
                      </label>
                      <input
                        type="date"
                        value={departDate}
                        onChange={(e) => {
                          setDepartDate(e.target.value);
                          setValidationError(null);
                        }}
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-xs focus:outline-none pt-0.5 cursor-pointer"
                        required
                      />
                    </div>

                    {/* Return Date (Round Trips) */}
                    <div className={`border rounded-lg p-2.5 transition-colors ${
                      flightTripType === 'roundtrip'
                        ? 'border-[#e3ded4] bg-[#fbf9f4]/60 hover:border-[#0d6b63]'
                        : 'border-[#eae4d8] bg-[#f0ebe1]/40 opacity-60'
                    }`}>
                      <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                        Return
                      </label>
                      <input
                        type="date"
                        value={returnDate}
                        disabled={flightTripType !== 'roundtrip'}
                        min={departDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-xs focus:outline-none pt-0.5 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Search Flights Button */}
                    <div>
                      <button
                        type="submit"
                        className="w-full h-[52px] bg-[#0d6b63] text-white font-semibold rounded-lg hover:bg-[#0a534d] transition-colors flex items-center justify-center gap-1.5 shadow-sm text-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">search</span>
                        <span>Search Flights</span>
                      </button>
                    </div>
                  </div>

                  {/* Passengers & Travel Class Selection Strip */}
                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                    <div className="flex items-center gap-2">
                      <label className="text-[#6b7775] font-semibold">Passengers:</label>
                      <select
                        value={flightPassengers}
                        onChange={(e) => setFlightPassengers(Number(e.target.value))}
                        className="px-2.5 py-1.5 border border-[#e3ded4] rounded-md font-semibold text-[#0d3d3a] bg-white cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <option key={num} value={num}>
                            {num} Passenger{num > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[#6b7775] font-semibold">Travel Class:</label>
                      <select
                        value={flightClass}
                        onChange={(e) => setFlightClass(e.target.value)}
                        className="px-2.5 py-1.5 border border-[#e3ded4] rounded-md font-semibold text-[#0d3d3a] bg-white cursor-pointer"
                      >
                        <option value="Economy">Economy</option>
                        <option value="Premium Economy">Premium Economy</option>
                        <option value="Business">Business</option>
                        <option value="First Class">First Class</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Train Booking Form */}
              {activeService === 'trains' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#f0ebe1] text-xs">
                    <span className="font-semibold text-[#0d3d3a] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">train</span>
                      IRCTC Verified Passenger Booking with Automated TDR Assistance
                    </span>
                    <span className="text-[11px] text-[#0d6b63] font-semibold bg-[#e8f2f0] px-2 py-0.5 rounded-full">
                      Zero UPI Convenience Fees
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                    {/* From Station */}
                    <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                          From Station
                        </label>
                        <button
                          type="button"
                          onClick={handleSwapTrainStations}
                          title="Swap Stations"
                          className="text-[#0d6b63] hover:text-[#0a534d] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={trainFrom}
                        onChange={(e) => setTrainFrom(e.target.value)}
                        placeholder="e.g. New Delhi (NDLS)"
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5"
                        required
                      />
                    </div>

                    {/* To Station */}
                    <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                        To Station
                      </label>
                      <input
                        type="text"
                        value={trainTo}
                        onChange={(e) => setTrainTo(e.target.value)}
                        placeholder="e.g. Mumbai Central (MMCT)"
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5"
                        required
                      />
                    </div>

                    {/* Journey Date */}
                    <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                        Journey Date
                      </label>
                      <input
                        type="date"
                        value={trainDate}
                        onChange={(e) => setTrainDate(e.target.value)}
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-xs focus:outline-none pt-0.5 cursor-pointer"
                        required
                      />
                    </div>

                    {/* Passenger Count */}
                    <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                        Passengers
                      </label>
                      <select
                        value={trainPassengers}
                        onChange={(e) => setTrainPassengers(Number(e.target.value))}
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-xs focus:outline-none pt-0.5 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <option key={num} value={num}>
                            {num} Passenger{num > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Travel Class */}
                    <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                        Travel Class
                      </label>
                      <select
                        value={trainClass}
                        onChange={(e) => setTrainClass(e.target.value)}
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-xs focus:outline-none pt-0.5 cursor-pointer"
                      >
                        <option value="All Classes">All Classes</option>
                        <option value="AC Chair Car (CC)">AC Chair Car (CC)</option>
                        <option value="Executive Chair Car (EC)">Executive Chair (EC)</option>
                        <option value="3A AC 3 Tier">3AC (3A)</option>
                        <option value="2A AC 2 Tier">2AC (2A)</option>
                        <option value="1A AC First Class">1AC (1A)</option>
                        <option value="Sleeper (SL)">Sleeper (SL)</option>
                      </select>
                    </div>

                    {/* Search Trains Button */}
                    <div>
                      <button
                        type="submit"
                        className="w-full h-[52px] bg-[#0d6b63] text-white font-semibold rounded-lg hover:bg-[#0a534d] transition-colors flex items-center justify-center gap-1.5 shadow-sm text-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">search</span>
                        <span>Search Trains</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bus Booking Form */}
              {activeService === 'bus' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#f0ebe1] text-xs">
                    <span className="font-semibold text-[#0d3d3a] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">directions_bus</span>
                      Intercity Volvo & Sleeper Buses with GPS Live Tracking Guarantee
                    </span>
                    <span className="text-[11px] text-[#0d6b63] font-semibold bg-[#e8f2f0] px-2 py-0.5 rounded-full">
                      Verified Operators
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                    {/* From City */}
                    <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                          From City
                        </label>
                        <button
                          type="button"
                          onClick={handleSwapBusStations}
                          title="Swap Cities"
                          className="text-[#0d6b63] hover:text-[#0a534d] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={busFrom}
                        onChange={(e) => setBusFrom(e.target.value)}
                        placeholder="e.g. Delhi"
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5"
                        required
                      />
                    </div>

                    {/* To City */}
                    <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                        To City
                      </label>
                      <input
                        type="text"
                        value={busTo}
                        onChange={(e) => setBusTo(e.target.value)}
                        placeholder="e.g. Manali"
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5"
                        required
                      />
                    </div>

                    {/* Journey Date */}
                    <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                        Journey Date
                      </label>
                      <input
                        type="date"
                        value={busDate}
                        onChange={(e) => setBusDate(e.target.value)}
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-xs focus:outline-none pt-0.5 cursor-pointer"
                        required
                      />
                    </div>

                    {/* Passenger Count */}
                    <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                        Passenger Count
                      </label>
                      <select
                        value={busPassengers}
                        onChange={(e) => setBusPassengers(Number(e.target.value))}
                        className="w-full bg-transparent font-semibold text-[#0d3d3a] text-xs focus:outline-none pt-0.5 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <option key={num} value={num}>
                            {num} Seat{num > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* AC / Non-AC & Seater / Sleeper preferences */}
                    <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                      <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">
                        Bus Preference
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={busAcPref}
                          onChange={(e) => setBusAcPref(e.target.value as any)}
                          className="bg-transparent font-semibold text-[#0d3d3a] text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="Any">Any AC/Non-AC</option>
                          <option value="AC">AC Only</option>
                          <option value="Non-AC">Non-AC</option>
                        </select>
                      </div>
                    </div>

                    {/* Search Buses Button */}
                    <div>
                      <button
                        type="submit"
                        className="w-full h-[52px] bg-[#0d6b63] text-white font-semibold rounded-lg hover:bg-[#0a534d] transition-colors flex items-center justify-center gap-1.5 shadow-sm text-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">search</span>
                        <span>Search Buses</span>
                      </button>
                    </div>
                  </div>

                  {/* Seater / Sleeper Preference Pills */}
                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <span className="text-[#6b7775] font-semibold">Seat Preference:</span>
                    {(['Any', 'Sleeper', 'Seater'] as const).map((seat) => (
                      <button
                        key={seat}
                        type="button"
                        onClick={() => setBusSeatPref(seat)}
                        className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                          busSeatPref === seat
                            ? 'bg-[#0d6b63] text-white'
                            : 'bg-white border border-[#e3ded4] text-[#6b7775] hover:text-[#0d3d3a]'
                        }`}
                      >
                        {seat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hotels Form */}
              {activeService === 'hotels' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 items-end">
                  <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                    <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">City or Hotel</label>
                    <input
                      type="text"
                      value={hotelCity}
                      onChange={(e) => setHotelCity(e.target.value)}
                      placeholder="e.g. Goa, India"
                      className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5"
                    />
                  </div>
                  <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                    <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">Check-in</label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full bg-transparent font-semibold text-[#0d3d3a] text-xs focus:outline-none pt-0.5 cursor-pointer"
                    />
                  </div>
                  <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                    <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">Check-out</label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full bg-transparent font-semibold text-[#0d3d3a] text-xs focus:outline-none pt-0.5 cursor-pointer"
                    />
                  </div>
                  <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60 hover:border-[#0d6b63] transition-colors">
                    <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">Guests & Rooms</label>
                    <input
                      type="text"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full bg-transparent font-semibold text-[#0d3d3a] text-xs focus:outline-none pt-0.5"
                    />
                  </div>
                </div>
              )}

              {/* Cabs Form */}
              {activeService === 'cabs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 items-end">
                  <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60">
                    <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">Pickup Location</label>
                    <input type="text" value={cabPickup} onChange={(e) => setCabPickup(e.target.value)} className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5" />
                  </div>
                  <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60">
                    <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">Drop Location</label>
                    <input type="text" value={cabDrop} onChange={(e) => setCabDrop(e.target.value)} className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5" />
                  </div>
                  <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60">
                    <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">Date & Time</label>
                    <input type="text" value={cabDate} onChange={(e) => setCabDate(e.target.value)} className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5" />
                  </div>
                  <div>
                    <button type="submit" className="w-full h-[52px] bg-[#0d6b63] text-white font-semibold rounded-lg hover:bg-[#0a534d] transition-colors flex items-center justify-center gap-2 text-sm shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">search</span>
                      Search cabs
                    </button>
                  </div>
                </div>
              )}

              {/* Holidays Form */}
              {activeService === 'holidays' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 items-end">
                  <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60">
                    <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">Departing From</label>
                    <input type="text" value={holidayFrom} onChange={(e) => setHolidayFrom(e.target.value)} className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5" />
                  </div>
                  <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60">
                    <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">Going To</label>
                    <input type="text" value={holidayDest} onChange={(e) => setHolidayDest(e.target.value)} className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5" />
                  </div>
                  <div className="border border-[#e3ded4] rounded-lg p-2.5 bg-[#fbf9f4]/60">
                    <label className="text-[11px] font-bold text-[#6b7775] uppercase tracking-wider block">Duration</label>
                    <select className="w-full bg-transparent font-semibold text-[#0d3d3a] text-sm focus:outline-none pt-0.5">
                      <option>5 – 6 nights</option>
                      <option>3 – 4 nights</option>
                      <option>7+ nights</option>
                    </select>
                  </div>
                  <div>
                    <button type="submit" className="w-full h-[52px] bg-[#0d6b63] text-white font-semibold rounded-lg hover:bg-[#0a534d] transition-colors flex items-center justify-center gap-2 text-sm shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">search</span>
                      Explore packages
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </section>

        {/* POPULAR DESTINATIONS (Page 1) */}
        <section className="site-container pb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0d3d3a] tracking-tight">
              Popular destinations
            </h2>
            <Link
              to="/destinations"
              className="text-sm font-semibold text-[#0d6b63] hover:text-[#0a534d] flex items-center gap-1 group"
            >
              See all
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Goa */}
            <Link
              to="/destinations"
              className="group bg-white rounded-xl border border-[#e3ded4] overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="h-52 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80"
                  alt="Goa beach"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-md text-xs font-bold text-[#0d3d3a] shadow-sm">
                  From ₹ 3,299
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[#0d3d3a] text-base group-hover:text-[#0d6b63] transition-colors">
                  Goa
                </h3>
                <p className="text-xs text-[#6b7775] mt-0.5">Beaches · Nightlife</p>
              </div>
            </Link>

            {/* Kashmir */}
            <Link
              to="/destinations"
              className="group bg-white rounded-xl border border-[#e3ded4] overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="h-52 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=600&q=80"
                  alt="Kashmir lake"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-md text-xs font-bold text-[#0d3d3a] shadow-sm">
                  From ₹ 4,899
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[#0d3d3a] text-base group-hover:text-[#0d6b63] transition-colors">
                  Kashmir
                </h3>
                <p className="text-xs text-[#6b7775] mt-0.5">Lakes · Scenic views</p>
              </div>
            </Link>

            {/* Manali */}
            <Link
              to="/destinations"
              className="group bg-white rounded-xl border border-[#e3ded4] overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="h-52 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80"
                  alt="Manali mountains"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-md text-xs font-bold text-[#0d3d3a] shadow-sm">
                  From ₹ 3,699
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[#0d3d3a] text-base group-hover:text-[#0d6b63] transition-colors">
                  Manali
                </h3>
                <p className="text-xs text-[#6b7775] mt-0.5">Mountains · Adventure</p>
              </div>
            </Link>

            {/* Jaipur */}
            <Link
              to="/destinations"
              className="group bg-white rounded-xl border border-[#e3ded4] overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="h-52 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80"
                  alt="Jaipur heritage"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-md text-xs font-bold text-[#0d3d3a] shadow-sm">
                  From ₹ 6,999
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[#0d3d3a] text-base group-hover:text-[#0d6b63] transition-colors">
                  Jaipur
                </h3>
                <p className="text-xs text-[#6b7775] mt-0.5">Heritage · Culture</p>
              </div>
            </Link>
          </div>
        </section>

        {/* TRAVEL DEALS & OFFERS PREVIEW (Page 2) */}
        <section className="site-container pb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0d3d3a] tracking-tight">
              Travel deals & offers
            </h2>
            <Link
              to="/offers"
              className="text-sm font-semibold text-[#0d6b63] hover:text-[#0a534d] flex items-center gap-1 group"
            >
              All offers
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Flights Offer */}
            <div className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0d6b63] block">
                Flights
              </span>
              <h3 className="text-base font-bold text-[#0d3d3a]">
                Up to 20% off domestic flights
              </h3>
              <p className="text-xs text-[#6b7775]">Valid till 31 Oct 2026</p>
              <div className="pt-2 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-[#f3eee5] text-[#0d3d3a] border border-[#e3ded4]">
                  FLYINTRA
                </span>
                <Link
                  to="/offers"
                  className="text-xs font-semibold text-[#0d6b63] hover:underline"
                >
                  View details →
                </Link>
              </div>
            </div>

            {/* Hotels Offer */}
            <div className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0d6b63] block">
                Hotels
              </span>
              <h3 className="text-base font-bold text-[#0d3d3a]">
                Flat 30% off hotel bookings
              </h3>
              <p className="text-xs text-[#6b7775]">Valid till 15 Nov 2026</p>
              <div className="pt-2 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-[#f3eee5] text-[#0d3d3a] border border-[#e3ded4]">
                  STAYMORE
                </span>
                <Link
                  to="/offers"
                  className="text-xs font-semibold text-[#0d6b63] hover:underline"
                >
                  View details →
                </Link>
              </div>
            </div>

            {/* Holidays Offer */}
            <div className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0d6b63] block">
                Holidays
              </span>
              <h3 className="text-base font-bold text-[#0d3d3a]">
                ₹5,000 off holiday packages
              </h3>
              <p className="text-xs text-[#6b7775]">Valid till 30 Nov 2026</p>
              <div className="pt-2 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-[#f3eee5] text-[#0d3d3a] border border-[#e3ded4]">
                  HOLIDAY5K
                </span>
                <Link
                  to="/offers"
                  className="text-xs font-semibold text-[#0d6b63] hover:underline"
                >
                  View details →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* AI-POWERED REFUND ASSISTANCE SECTION (Page 1 & 5) */}
        <section className="site-container pb-16">
          <div className="bg-[#f0ebe1] rounded-2xl border border-[#e3ded4] p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Left Column */}
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e9f0ea] border border-[#d0dfd3] text-[#2d5650] text-xs font-bold tracking-wide uppercase">
                  AI-Powered Refund Assistance
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-[#0d3d3a] tracking-tight leading-snug">
                  If your plans change, we help you understand your options.
                </h2>

                <p className="text-sm sm:text-base text-[#5c6967] leading-relaxed">
                  You pay for your bookings as usual. If a booking is cancelled or disrupted,
                  our AI helps you check eligibility, understand the applicable policies and
                  track your claim.
                </p>

                <div className="pt-2">
                  <Link
                    to="/refunds"
                    className="inline-flex items-center gap-2 bg-[#0d6b63] text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-[#0a534d] transition-colors shadow-sm"
                  >
                    Check Refund Eligibility
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>

                <p className="text-xs text-[#889593] leading-relaxed">
                  Refund eligibility and amounts depend on your booking, applicable policies and provider decisions.
                </p>
              </div>

              {/* Right Column: Interactive Sample Preview Card (From Page 1 & 10 Mockup) */}
              <div className="lg:col-span-6">
                <div className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#e3ded4]">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#0d3d3a] block">
                        Case #RF12345
                      </span>
                      <span className="text-xs text-[#6b7775]">Delhi → Mumbai · 24 Oct 2026</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] text-xs font-semibold border border-[#fde68a]">
                      Under review
                    </span>
                  </div>

                  {/* Stepper Progress */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px] py-1">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-[#0d6b63] text-white flex items-center justify-center font-bold text-[10px]">
                        ✓
                      </div>
                      <span className="font-semibold text-[#0d3d3a]">Submitted</span>
                      <span className="text-[#889593] text-[10px]">18 Oct</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-[#0d6b63] text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-[#0d6b63]/20">
                        2
                      </div>
                      <span className="font-semibold text-[#0d6b63]">AI review</span>
                      <span className="text-[#889593] text-[10px]">20 Oct</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-[#f3eee5] text-[#889593] flex items-center justify-center font-bold text-[10px]">
                        3
                      </div>
                      <span className="text-[#889593]">Decision</span>
                      <span className="text-[#889593] text-[10px]">Pending</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-[#f3eee5] text-[#889593] flex items-center justify-center font-bold text-[10px]">
                        4
                      </div>
                      <span className="text-[#889593]">Completed</span>
                      <span className="text-[#889593] text-[10px]">—</span>
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2 pt-2 bg-[#fbf9f4] rounded-lg p-3 border border-[#e3ded4] text-xs">
                    <div className="flex items-center gap-2 text-[#0d3d3a]">
                      <span className="text-[#166534] font-bold">✓</span>
                      <span>Booking details verified</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0d3d3a]">
                      <span className="text-[#166534] font-bold">✓</span>
                      <span>Cancellation notice found</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#6b7775]">
                      <span className="text-[#0d6b63] animate-pulse font-bold">…</span>
                      <span>Policy check in progress</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#889593] pt-1">
                    <span>Sample preview. The provider makes the final decision.</span>
                    <Link to="/refunds/RF12345" className="font-semibold text-[#0d6b63] hover:underline">
                      View full case →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};
