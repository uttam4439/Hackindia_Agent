import React, { createContext, useContext, useState, useEffect } from 'react';

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
  notes?: string;
  isCatalogDemo?: boolean;
}

export interface StoredBooking {
  id: string;
  refLabel: string;
  serviceType: 'FLIGHT' | 'HOTEL' | 'TRAIN' | 'BUS' | 'CAB' | 'HOLIDAY';
  title: string;
  status: 'Confirmed' | 'Cancelled by airline' | 'Cancelled by carrier' | 'Payment Pending' | 'Payment Failed';
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
  }) => void;
  bookingSuccessAlert: string | null;
  clearBookingSuccessAlert: () => void;
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
    return [];
  });

  const [summaryModalTrip, setSummaryModalTrip] = useState<SelectedTrip | null>(null);
  const [bookingSuccessAlert, setBookingSuccessAlert] = useState<string | null>(null);

  // Sync real bookings from backend when authenticated session exists
  useEffect(() => {
    const fetchLiveBookings = async () => {
      try {
        const token = sessionStorage.getItem('agent_travel_token') || localStorage.getItem('agent_travel_token');
        if (!token) return;

        const res = await fetch('/api/bookings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.bookings) && data.bookings.length > 0) {
            const mapped: StoredBooking[] = data.bookings.map((b: any) => ({
              id: b.id,
              refLabel: `PNR · ${b.pnr || b.bookingDetails?.code || b.id.replace('BK-', '')}`,
              serviceType: (b.bookingDetails?.serviceType?.toUpperCase()?.replace(/S$/, '') || 'FLIGHT') as any,
              title: b.bookingDetails?.route || b.bookingDetails?.title || `${b.bookingDetails?.origin || 'Origin'} → ${b.bookingDetails?.destination || 'Destination'}`,
              status: b.paymentStatus === 'PAID' ? 'Confirmed' : b.paymentStatus === 'FAILED' ? 'Payment Failed' : 'Payment Pending',
              statusColor: b.paymentStatus === 'PAID' ? 'success' : 'error',
              bookingDate: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
              paymentStatus: b.paymentStatus,
              razorpayOrderId: b.razorpayOrderId,
              razorpayPaymentId: b.razorpayPaymentId,
              razorpaySignature: b.razorpaySignature,
              paymentVerifiedAt: b.paymentVerifiedAt,
              details: [
                { label: 'OPERATOR', value: b.bookingDetails?.operator || 'Carrier' },
                { label: 'DATE', value: b.bookingDetails?.departDate || 'Confirmed' },
                { label: 'AMOUNT', value: `₹ ${(b.amount || 0).toLocaleString('en-IN')}` },
              ],
            }));

            setUserBookings((prev) => {
              const backendIds = new Set(mapped.map((m) => m.id));
              const uniqueSession = prev.filter((p) => !backendIds.has(p.id));
              const merged = [...uniqueSession, ...mapped];
              try {
                sessionStorage.setItem('agent_travel_user_bookings', JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        }
      } catch {}
    };

    fetchLiveBookings();
  }, []);

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

  const addBooking = (
    trip: SelectedTrip,
    paymentData?: {
      bookingId?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      paymentStatus?: 'PAID' | 'PENDING' | 'FAILED';
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
        { label: 'DEPARTS', value: trip.departTime || '06:05' }
      );
    } else if (trip.serviceType === 'buses') {
      details.push(
        { label: 'BUS', value: trip.operator },
        { label: 'DATE', value: formattedDate },
        { label: 'DEPARTS', value: trip.departTime || '21:30' }
      );
    } else if (trip.serviceType === 'cabs') {
      details.push(
        { label: 'VEHICLE', value: trip.title },
        { label: 'DATE', value: formattedDate },
        { label: 'PICKUP', value: trip.departTime || '08:30' }
      );
    } else {
      details.push(
        { label: 'PACKAGE', value: trip.title },
        { label: 'START DATE', value: formattedDate },
        { label: 'TRAVELLERS', value: trip.passengers }
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
