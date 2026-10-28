import React, { createContext, useContext, useState } from 'react';

export type ServiceType = 'flights' | 'hotels' | 'trains' | 'buses' | 'cabs' | 'holidays';

export interface SelectedTrip {
  id: string;
  catalogTripId?: string;
  serviceType: ServiceType;
  title: string;
  operator: string;
  code: string;
  route: string;
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  departTime?: string;
  arriveTime?: string;
  duration?: string;
  travelClass?: string;
  passengers: string;
  passengerCount?: number;
  nights?: number;
  rooms?: number;
  baseRatePerUnit?: number;
  taxAmount?: number;
  fareFormatted: string;
  fareAmount: number;
  refundable: boolean;
  stops?: string;
  notes?: string;
  isCatalogDemo?: boolean;
}

export interface StoredBooking {
  id: string;
  refLabel: string;
  serviceType: 'FLIGHT' | 'HOTEL' | 'TRAIN' | 'BUS' | 'CAB' | 'HOLIDAY';
  title: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled by airline' | 'Cancelled by carrier' | 'Payment Pending' | 'Payment Failed';
  statusColor: 'success' | 'error' | 'warning';
  hasRefundAlert?: boolean;
  refundCaseId?: string;
  bookingDate: string;
  details: { label: string; value: string }[];
  paymentStatus?: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paymentVerifiedAt?: string;
  fareAmount?: number;
  traveler?: {
    name: string;
    email: string;
    phone?: string;
    passengers?: Array<{ name: string; age?: string; gender?: string }>;
  };
  tripDetails?: {
    origin?: string;
    destination?: string;
    departDate?: string;
    returnDate?: string;
    departTime?: string;
    arriveTime?: string;
    duration?: string;
    operator?: string;
    code?: string;
    travelClass?: string;
    passengerCount?: number;
    baseRatePerUnit?: number;
    taxAmount?: number;
    notes?: string;
  };
}

export interface TravelSearchCriteria {
  serviceType: ServiceType;
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  passengers: string;
  travelClass?: string;
  tripType?: 'oneWay' | 'roundTrip';
  rooms?: number;
  adults?: number;
  children?: number;
}

interface TravelBookingContextType {
  searchCriteria: TravelSearchCriteria;
  setSearchCriteria: (criteria: Partial<TravelSearchCriteria>) => void;
  selectedTrip: SelectedTrip | null;
  setSelectedTrip: (trip: SelectedTrip | null) => void;
  userBookings: StoredBooking[];
  addBooking: (
    trip: SelectedTrip,
    paymentData?: {
      bookingId?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      paymentStatus?: 'PAID' | 'PENDING' | 'FAILED';
      travelerDetails?: {
        name: string;
        email: string;
        phone?: string;
        passengers?: Array<{ name: string; age?: string; gender?: string }>;
      };
    }
  ) => StoredBooking;
  summaryModalTrip: SelectedTrip | null;
  openBookingSummary: (trip: SelectedTrip) => void;
  closeBookingSummary: () => void;
  confirmBooking: (paymentData?: {
    bookingId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paymentStatus?: 'PAID' | 'PENDING' | 'FAILED';
    travelerDetails?: {
      name: string;
      email: string;
      phone?: string;
      passengers?: Array<{ name: string; age?: string; gender?: string }>;
    };
  }) => void;
  bookingSuccessAlert: string | null;
  clearBookingSuccessAlert: () => void;
  fetchBackendBookings: () => Promise<void>;
}

const defaultCriteria: TravelSearchCriteria = {
  serviceType: 'flights',
  origin: 'Delhi (DEL)',
  destination: 'Mumbai (BOM)',
  departDate: '2026-12-21',
  returnDate: '2026-12-28',
  passengers: '1 Traveller · Economy',
  travelClass: 'Economy',
};

const initialSampleBookings: StoredBooking[] = [
  {
    id: 'BK-1',
    refLabel: 'PNR · ABC123',
    serviceType: 'FLIGHT',
    title: 'Delhi → Mumbai',
    status: 'Cancelled by airline',
    statusColor: 'error',
    hasRefundAlert: true,
    refundCaseId: 'RF12345',
    bookingDate: '18 Oct 2026',
    paymentStatus: 'PAID',
    fareAmount: 4872,
    razorpayPaymentId: 'pay_sim_fl_89123',
    razorpayOrderId: 'order_fl_89123',
    paymentVerifiedAt: '2026-10-18T10:14:22Z',
    traveler: {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      phone: '+91 98765 43210',
      passengers: [{ name: 'Aarav Sharma', age: '29', gender: 'Male' }],
    },
    tripDetails: {
      origin: 'Delhi (DEL)',
      destination: 'Mumbai (BOM)',
      departDate: '2026-10-24',
      departTime: '06:10',
      arriveTime: '08:25',
      duration: '2h 15m',
      operator: 'Air India',
      code: 'AI-805',
      travelClass: 'Economy',
      passengerCount: 1,
      notes: 'Non-stop · Terminal 3 · Gate 14B',
    },
    details: [
      { label: 'FLIGHT', value: 'AI-805' },
      { label: 'TRAVELLER', value: '1 · Economy' },
      { label: 'DATE', value: '24 Oct 2026' },
      { label: 'DEPARTS', value: '06:10' },
      { label: 'TOTAL', value: '₹ 4,872' },
    ],
  },
  {
    id: 'BK-2',
    refLabel: 'Booking ID · HTL456',
    serviceType: 'HOTEL',
    title: 'Goa Beach Resort',
    status: 'Confirmed',
    statusColor: 'success',
    bookingDate: '15 Oct 2026',
    paymentStatus: 'PAID',
    fareAmount: 14850,
    razorpayPaymentId: 'pay_sim_htl_55102',
    paymentVerifiedAt: '2026-10-15T14:32:10Z',
    traveler: {
      name: 'Rohan Verma',
      email: 'rohan.verma@example.com',
      phone: '+91 98111 22334',
      passengers: [
        { name: 'Rohan Verma', age: '32', gender: 'Male' },
        { name: 'Ananya Verma', age: '28', gender: 'Female' },
      ],
    },
    tripDetails: {
      destination: 'Goa Beach Resort, Calangute, Goa 403516',
      departDate: '2026-12-12',
      returnDate: '2026-12-16',
      operator: 'Goa Beach Resort & Spa',
      travelClass: 'Deluxe Sea View Room',
      passengerCount: 2,
      notes: '4 Nights · Breakfast Included · Free WiFi',
    },
    details: [
      { label: 'STAY', value: 'Goa Beach Resort & Spa' },
      { label: 'CHECK-IN', value: '12 Dec 2026' },
      { label: 'CHECK-OUT', value: '16 Dec 2026' },
      { label: 'GUESTS', value: '2 Guests · 1 Room' },
      { label: 'TOTAL', value: '₹ 14,850' },
    ],
  },
  {
    id: 'BK-3',
    refLabel: 'PNR · 4521896307',
    serviceType: 'TRAIN',
    title: 'New Delhi → Jaipur',
    status: 'Confirmed',
    statusColor: 'success',
    bookingDate: '14 Oct 2026',
    paymentStatus: 'PAID',
    fareAmount: 1890,
    razorpayPaymentId: 'pay_sim_tr_77192',
    razorpayOrderId: 'order_tr_77192',
    paymentVerifiedAt: '2026-10-14T09:12:44Z',
    traveler: {
      name: 'Priya Patel',
      email: 'priya.patel@example.com',
      phone: '+91 99201 54321',
      passengers: [
        { name: 'Priya Patel', age: '31', gender: 'Female' },
        { name: 'Vikram Patel', age: '34', gender: 'Male' },
      ],
    },
    tripDetails: {
      origin: 'New Delhi (NDLS)',
      destination: 'Jaipur Junction (JP)',
      departDate: '2026-11-02',
      departTime: '06:05',
      arriveTime: '10:35',
      duration: '4h 30m',
      operator: 'Ajmer Shatabdi Express',
      code: '12015',
      travelClass: 'AC Chair Car (CC)',
      passengerCount: 2,
      notes: 'Direct · Runs Daily · Complimentary Breakfast',
    },
    details: [
      { label: 'TRAIN', value: 'Ajmer Shatabdi (12015)' },
      { label: 'DATE', value: '02 Nov 2026' },
      { label: 'PASSENGERS', value: '2 · Chair Car' },
      { label: 'DEPARTS', value: '06:05' },
      { label: 'TOTAL', value: '₹ 1,890' },
    ],
  },
  {
    id: 'BK-4',
    refLabel: 'Ticket · BUS78231',
    serviceType: 'BUS',
    title: 'Bengaluru → Goa',
    status: 'Confirmed',
    statusColor: 'success',
    bookingDate: '16 Oct 2026',
    paymentStatus: 'PAID',
    fareAmount: 1450,
    razorpayPaymentId: 'pay_sim_bus_33918',
    paymentVerifiedAt: '2026-10-16T18:05:00Z',
    traveler: {
      name: 'Sameer Khan',
      email: 'sameer.khan@example.com',
      phone: '+91 98450 12345',
      passengers: [{ name: 'Sameer Khan', age: '27', gender: 'Male' }],
    },
    tripDetails: {
      origin: 'Bengaluru (Majestic / Anand Rao Circle)',
      destination: 'Goa (Panaji Bus Stand)',
      departDate: '2026-11-06',
      departTime: '21:30',
      arriveTime: '08:00',
      duration: '10h 30m',
      operator: 'IntrCity SmartBus',
      code: 'BUS-402',
      travelClass: 'AC Sleeper (2+1)',
      passengerCount: 1,
      notes: 'Seat: Lower berth, L4 · Air Conditioned · Live GPS',
    },
    details: [
      { label: 'BUS', value: 'IntrCity SmartBus (BUS-402)' },
      { label: 'DATE', value: '06 Nov 2026' },
      { label: 'SEAT', value: 'Lower berth, L4' },
      { label: 'DEPARTS', value: '21:30' },
      { label: 'TOTAL', value: '₹ 1,450' },
    ],
  },
  {
    id: 'BK-5',
    refLabel: 'Booking · CAB55102',
    serviceType: 'CAB',
    title: 'Delhi Airport → Connaught Place',
    status: 'Confirmed',
    statusColor: 'success',
    bookingDate: '16 Oct 2026',
    paymentStatus: 'PAID',
    fareAmount: 950,
    razorpayPaymentId: 'pay_sim_cab_10294',
    paymentVerifiedAt: '2026-10-16T11:20:15Z',
    traveler: {
      name: 'Devendra Joshi',
      email: 'devendra.j@example.com',
      phone: '+91 97110 98765',
    },
    tripDetails: {
      origin: 'Delhi Airport (DEL T3 Arrival Pillar 4)',
      destination: 'Connaught Place, Central Delhi',
      departDate: '2026-10-24',
      departTime: '08:30',
      operator: 'Agent Travel Premium Cabs',
      code: 'CAB-55102',
      travelClass: 'Dedicated Sedan',
      passengerCount: 1,
      notes: 'Chauffeur Driven · Clean Air-Conditioned Sedan',
    },
    details: [
      { label: 'VEHICLE', value: 'Dedicated Sedan' },
      { label: 'PICKUP', value: '08:30' },
      { label: 'DATE', value: '24 Oct 2026' },
      { label: 'TOTAL', value: '₹ 950' },
    ],
  },
];

const TravelBookingContext = createContext<TravelBookingContextType | undefined>(undefined);

export const TravelBookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved state from sessionStorage if available to survive refresh and backward/forward navigation
  const [searchCriteria, setSearchCriteriaState] = useState<TravelSearchCriteria>(() => {
    try {
      const saved = sessionStorage.getItem('agent_travel_search');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultCriteria;
  });

  const [selectedTrip, setSelectedTripState] = useState<SelectedTrip | null>(() => {
    try {
      const saved = sessionStorage.getItem('agent_travel_selected_trip');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [userBookings, setUserBookings] = useState<StoredBooking[]>(() => {
    try {
      const saved = sessionStorage.getItem('agent_travel_user_bookings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialSampleBookings;
  });

  const [summaryModalTrip, setSummaryModalTrip] = useState<SelectedTrip | null>(null);
  const [bookingSuccessAlert, setBookingSuccessAlert] = useState<string | null>(null);

  // Synchronize search criteria changes with sessionStorage and revalidate selection if needed
  const setSearchCriteria = (newCriteria: Partial<TravelSearchCriteria>) => {
    setSearchCriteriaState((prev) => {
      const updated = { ...prev, ...newCriteria };
      try {
        sessionStorage.setItem('agent_travel_search', JSON.stringify(updated));
      } catch {}

      // If departure date or transport mode changed, invalidate incompatible selected trip
      if (
        (newCriteria.departDate && newCriteria.departDate !== prev.departDate) ||
        (newCriteria.serviceType && newCriteria.serviceType !== prev.serviceType)
      ) {
        if (selectedTrip) {
          if (
            newCriteria.serviceType !== selectedTrip.serviceType ||
            newCriteria.departDate !== selectedTrip.departDate
          ) {
            setSelectedTripState(null);
            try {
              sessionStorage.removeItem('agent_travel_selected_trip');
            } catch {}
          }
        }
      }

      return updated;
    });
  };

  const setSelectedTrip = (trip: SelectedTrip | null) => {
    setSelectedTripState(trip);
    try {
      if (trip) {
        sessionStorage.setItem('agent_travel_selected_trip', JSON.stringify(trip));
      } else {
        sessionStorage.removeItem('agent_travel_selected_trip');
      }
    } catch {}
  };

  const openBookingSummary = (trip: SelectedTrip) => {
    // Ensure the date of the trip matches the authoritative date before opening summary
    const reconciledTrip = {
      ...trip,
      departDate: searchCriteria.departDate || trip.departDate,
    };
    setSelectedTrip(reconciledTrip);
    setSummaryModalTrip(reconciledTrip);
  };

  const closeBookingSummary = () => {
    setSummaryModalTrip(null);
  };

  const fetchBackendBookings = async () => {
    const token =
      sessionStorage.getItem('agent_travel_token') || localStorage.getItem('agent_travel_token');
    if (!token) return;

    try {
      const res = await fetch('/api/bookings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.bookings)) {
        setUserBookings((prev) => {
          const map = new Map<string, StoredBooking>();
          // Existing local bookings
          prev.forEach((b) => map.set(b.id, b));
          // Merge server bookings
          data.bookings.forEach((sb: any) => {
            const rawService = (sb.bookingDetails?.serviceType || 'flights').toUpperCase();
            const serviceType =
              rawService === 'TRAINS' ? 'TRAIN' :
              rawService === 'BUSES' ? 'BUS' :
              rawService === 'HOTELS' ? 'HOTEL' :
              rawService === 'CABS' ? 'CAB' :
              rawService === 'HOLIDAYS' ? 'HOLIDAY' : 'FLIGHT';

            const serverItem: StoredBooking = {
              id: sb.id,
              refLabel: `PNR · ${sb.id.replace('BK-', '')}`,
              serviceType,
              title: sb.bookingDetails?.title || sb.bookingDetails?.route || 'Travel Itinerary',
              status: sb.paymentStatus === 'PAID' ? 'Confirmed' : 'Payment Pending',
              statusColor: sb.paymentStatus === 'PAID' ? 'success' : 'warning',
              bookingDate: sb.createdAt ? new Date(sb.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
              details: [
                { label: 'ROUTE', value: sb.bookingDetails?.route || `${sb.bookingDetails?.origin} → ${sb.bookingDetails?.destination}` || 'Direct' },
                { label: 'DATE', value: sb.bookingDetails?.departDate || 'Scheduled' },
                { label: 'PASSENGERS', value: `${sb.passengerCount || 1} Traveller(s)` },
                { label: 'TOTAL', value: sb.amount ? `₹ ${Number(sb.amount).toLocaleString('en-IN')}` : '₹ 0' },
              ],
              paymentStatus: sb.paymentStatus,
              razorpayOrderId: sb.razorpayOrderId,
              razorpayPaymentId: sb.razorpayPaymentId,
              razorpaySignature: sb.razorpaySignature,
              paymentVerifiedAt: sb.paymentVerifiedAt,
              fareAmount: sb.amount,
              traveler: {
                name: sb.customerName || 'Traveler',
                email: sb.customerEmail || '',
              },
            };
            map.set(sb.id, serverItem);
          });
          const merged = Array.from(map.values());
          try {
            sessionStorage.setItem('agent_travel_user_bookings', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch (err) {
      console.warn('[BOOKINGS] Failed to fetch server bookings:', err);
    }
  };

  React.useEffect(() => {
    fetchBackendBookings();
  }, []);

  const addBooking = (
    trip: SelectedTrip,
    paymentData?: {
      bookingId?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      paymentStatus?: 'PAID' | 'PENDING' | 'FAILED';
      travelerDetails?: {
        name: string;
        email: string;
        phone?: string;
        passengers?: Array<{ name: string; age?: string; gender?: string }>;
      };
    }
  ): StoredBooking => {
    const randomPnr = Math.floor(100000 + Math.random() * 900000).toString();
    const serviceTypeMap: Record<ServiceType, StoredBooking['serviceType']> = {
      flights: 'FLIGHT',
      hotels: 'HOTEL',
      trains: 'TRAIN',
      buses: 'BUS',
      cabs: 'CAB',
      holidays: 'HOLIDAY',
    };

    // Format human-readable date e.g. "24 Oct 2026"
    const parsedDate = new Date(trip.departDate + 'T00:00:00');
    const formattedDate = !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : trip.departDate;

    const details: { label: string; value: string }[] = [];

    if (trip.serviceType === 'flights') {
      details.push(
        { label: 'FLIGHT', value: trip.code },
        { label: 'DATE', value: formattedDate },
        { label: 'DEPARTS', value: trip.departTime || '08:15' },
        { label: 'PASSENGERS', value: trip.passengers },
        { label: 'TOTAL', value: trip.fareFormatted }
      );
    } else if (trip.serviceType === 'hotels') {
      const returnParsed = trip.returnDate ? new Date(trip.returnDate + 'T00:00:00') : null;
      const formattedReturn = returnParsed && !isNaN(returnParsed.getTime())
        ? returnParsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : trip.returnDate || '';
      details.push(
        { label: 'STAY', value: trip.operator },
        { label: 'CHECK-IN', value: formattedDate },
        { label: 'CHECK-OUT', value: formattedReturn },
        { label: 'DURATION', value: `${trip.nights || 1} Night${(trip.nights || 1) > 1 ? 's' : ''}` },
        { label: 'GUESTS', value: trip.passengers || '2 Guests' },
        { label: 'TOTAL', value: trip.fareFormatted }
      );
    } else if (trip.serviceType === 'trains') {
      details.push(
        { label: 'TRAIN', value: trip.operator },
        { label: 'DATE', value: formattedDate },
        { label: 'DEPARTS', value: trip.departTime || '06:05' },
        { label: 'TOTAL', value: trip.fareFormatted }
      );
    } else if (trip.serviceType === 'buses') {
      details.push(
        { label: 'BUS', value: trip.operator },
        { label: 'DATE', value: formattedDate },
        { label: 'DEPARTS', value: trip.departTime || '21:30' },
        { label: 'TOTAL', value: trip.fareFormatted }
      );
    } else if (trip.serviceType === 'cabs') {
      details.push(
        { label: 'VEHICLE', value: trip.title },
        { label: 'DATE', value: formattedDate },
        { label: 'PICKUP', value: trip.departTime || '08:30' },
        { label: 'TOTAL', value: trip.fareFormatted }
      );
    } else {
      details.push(
        { label: 'PACKAGE', value: trip.title },
        { label: 'START DATE', value: formattedDate },
        { label: 'TRAVELLERS', value: trip.passengers },
        { label: 'TOTAL', value: trip.fareFormatted }
      );
    }

    const newBooking: StoredBooking = {
      id: paymentData?.bookingId || `BK-${Date.now().toString().slice(-6)}`,
      refLabel: `PNR · ${randomPnr}`,
      serviceType: serviceTypeMap[trip.serviceType] || 'FLIGHT',
      title: trip.route || trip.title,
      status: paymentData?.paymentStatus === 'PAID' ? 'Confirmed' : paymentData?.paymentStatus === 'FAILED' ? 'Payment Failed' : 'Confirmed',
      statusColor: paymentData?.paymentStatus === 'FAILED' ? 'error' : 'success',
      bookingDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      details,
      paymentStatus: paymentData?.paymentStatus || 'PAID',
      razorpayOrderId: paymentData?.razorpayOrderId,
      razorpayPaymentId: paymentData?.razorpayPaymentId,
      razorpaySignature: paymentData?.razorpaySignature,
      paymentVerifiedAt: paymentData?.paymentStatus === 'PAID' ? new Date().toISOString() : undefined,
      fareAmount: trip.fareAmount,
      traveler: paymentData?.travelerDetails,
      tripDetails: {
        origin: trip.origin,
        destination: trip.destination,
        departDate: trip.departDate,
        returnDate: trip.returnDate,
        departTime: trip.departTime,
        arriveTime: trip.arriveTime,
        duration: trip.duration,
        operator: trip.operator,
        code: trip.code,
        travelClass: trip.travelClass,
        passengerCount: trip.passengerCount,
        baseRatePerUnit: trip.baseRatePerUnit,
        taxAmount: trip.taxAmount,
        notes: trip.notes,
      },
    };

    setUserBookings((prev) => {
      const updated = [newBooking, ...prev];
      try {
        sessionStorage.setItem('agent_travel_user_bookings', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    return newBooking;
  };

  const confirmBooking = (paymentData?: {
    bookingId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paymentStatus?: 'PAID' | 'PENDING' | 'FAILED';
    travelerDetails?: {
      name: string;
      email: string;
      phone?: string;
      passengers?: Array<{ name: string; age?: string; gender?: string }>;
    };
  }) => {
    if (!summaryModalTrip) return;
    const booking = addBooking(summaryModalTrip, paymentData);
    const paymentLabel = paymentData?.razorpayPaymentId ? ` (Payment ID: ${paymentData.razorpayPaymentId})` : '';
    setBookingSuccessAlert(
      `${summaryModalTrip.title || summaryModalTrip.route} confirmed under ${booking.refLabel}!${paymentLabel} Autonomous AI Refund Protection activated.`
    );
    closeBookingSummary();
  };

  const clearBookingSuccessAlert = () => {
    setBookingSuccessAlert(null);
  };

  return (
    <TravelBookingContext.Provider
      value={{
        searchCriteria,
        setSearchCriteria,
        selectedTrip,
        setSelectedTrip,
        userBookings,
        addBooking,
        summaryModalTrip,
        openBookingSummary,
        closeBookingSummary,
        confirmBooking,
        bookingSuccessAlert,
        clearBookingSuccessAlert,
        fetchBackendBookings,
      }}
    >
      {children}
    </TravelBookingContext.Provider>
  );
};

export const useTravelBooking = () => {
  const context = useContext(TravelBookingContext);
  if (!context) {
    throw new Error('useTravelBooking must be used within a TravelBookingProvider');
  }
  return context;
};
