import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTravelBooking } from '../../context/TravelBookingContext';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface CoPassenger {
  name: string;
  age: string;
  gender: string;
}

type CheckoutStep = 'review' | 'passengers' | 'final_review' | 'confirmation';

export const BookingSummaryModal: React.FC = () => {
  const navigate = useNavigate();
  const { summaryModalTrip, closeBookingSummary, confirmBooking } = useTravelBooking();

  const [step, setStep] = useState<CheckoutStep>('review');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [sessionBookingId, setSessionBookingId] = useState<string>('');

  // Primary Passenger State
  const [primaryName, setPrimaryName] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryAge, setPrimaryAge] = useState('');
  const [primaryGender, setPrimaryGender] = useState('Male');

  // Co-passengers State
  const [coPassengers, setCoPassengers] = useState<CoPassenger[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Verified Payment Outcome
  const [confirmedPayment, setConfirmedPayment] = useState<{
    bookingId: string;
    paymentId: string;
    orderId: string;
    verifiedAt: string;
  } | null>(null);

  // Initialize and prefill passenger details when trip opens
  useEffect(() => {
    if (summaryModalTrip) {
      setStep('review');
      setSessionBookingId(`BK-${Date.now().toString().slice(-6)}`);
      setPaymentError(null);
      setConfirmedPayment(null);
      setFormErrors({});

      // Prefill user details if authenticated
      const storedUserRaw =
        sessionStorage.getItem('agent_travel_user') || localStorage.getItem('agent_travel_user');
      let currentUser: any = null;
      if (storedUserRaw) {
        try {
          currentUser = JSON.parse(storedUserRaw);
        } catch {}
      }

      setPrimaryName(currentUser?.name || '');
      setPrimaryEmail(currentUser?.email || '');
      setPrimaryPhone(currentUser?.phone || currentUser?.contact || '');
      setPrimaryAge('28');
      setPrimaryGender('Male');

      // Initialize co-passengers if passengerCount > 1
      const count = summaryModalTrip.passengerCount || 1;
      if (count > 1) {
        const list: CoPassenger[] = [];
        for (let i = 1; i < count; i++) {
          list.push({ name: '', age: '', gender: 'Male' });
        }
        setCoPassengers(list);
      } else {
        setCoPassengers([]);
      }
    }
  }, [summaryModalTrip?.id]);

  if (!summaryModalTrip) return null;

  const parsedDate = new Date(summaryModalTrip.departDate + 'T00:00:00');
  const formattedDate = !isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    : summaryModalTrip.departDate;

  const passengerCount = summaryModalTrip.passengerCount || 1;
  const unitFare = summaryModalTrip.baseRatePerUnit || Math.round(summaryModalTrip.fareAmount / passengerCount);
  const totalBaseFare = unitFare * passengerCount;

  const getServiceIcon = () => {
    switch (summaryModalTrip.serviceType) {
      case 'flights':
        return 'flight_takeoff';
      case 'trains':
        return 'train';
      case 'buses':
        return 'directions_bus';
      case 'hotels':
        return 'hotel';
      case 'cabs':
        return 'local_taxi';
      case 'holidays':
        return 'beach_access';
      default:
        return 'confirmation_number';
    }
  };

  const validatePassengerForm = () => {
    const errors: Record<string, string> = {};

    if (!primaryName.trim() || primaryName.trim().length < 3) {
      errors.primaryName = 'Full legal name is required (min 3 characters).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!primaryEmail.trim() || !emailRegex.test(primaryEmail.trim())) {
      errors.primaryEmail = 'A valid email address is required for booking receipt.';
    }

    const phoneDigits = primaryPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.primaryPhone = 'A valid 10-digit mobile number is required.';
    }

    coPassengers.forEach((cp, idx) => {
      if (!cp.name.trim() || cp.name.trim().length < 2) {
        errors[`coPassenger_${idx}`] = `Full name is required for passenger ${idx + 2}.`;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToPayment = async () => {
    if (isSubmitting || isVerifying) return;
    setIsSubmitting(true);
    setPaymentError(null);

    const bookingId = sessionBookingId || `BK-${Date.now().toString().slice(-6)}`;

    const storedToken =
      sessionStorage.getItem('agent_travel_token') || localStorage.getItem('agent_travel_token');

    const travelerDetails = {
      name: primaryName.trim(),
      email: primaryEmail.trim(),
      phone: primaryPhone.trim(),
      passengers: [
        { name: primaryName.trim(), age: primaryAge, gender: primaryGender },
        ...coPassengers.map((cp) => ({ name: cp.name.trim(), age: cp.age, gender: cp.gender })),
      ],
    };

    try {
      // 1. Backend Authoritative Order Creation
      let orderData: any = null;
      try {
        const orderRes = await fetch('/api/payment/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
          },
          body: JSON.stringify({
            bookingId,
            tripDetails: summaryModalTrip,
            travelerDetails,
          }),
        });

        const resJson = await orderRes.json().catch(() => null);

        if (!orderRes.ok || !resJson?.success) {
          const errMsg =
            resJson?.error ||
            resJson?.message ||
            `Backend rejected booking order creation (HTTP ${orderRes.status}).`;
          setIsSubmitting(false);
          setPaymentError(errMsg);
          return;
        }

        orderData = resJson;
      } catch (err: any) {
        setIsSubmitting(false);
        setPaymentError('Network connection to booking server failed: ' + err.message);
        return;
      }

      if (!orderData) {
        setIsSubmitting(false);
        setPaymentError('Invalid response from booking order service.');
        return;
      }

      // 2. Open Razorpay Standard Checkout
      if (typeof window !== 'undefined' && window.Razorpay) {
        const options: any = {
          key: orderData.keyId || 'rzp_test_Tjktt6Bs0TXxDk',
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Agent Travel',
          description: `Booking for ${summaryModalTrip.title || summaryModalTrip.route}`,
          ...(orderData.orderId && !orderData.orderId.includes('order_test_') && !orderData.orderId.includes('order_mock_')
            ? { order_id: orderData.orderId }
            : {}),
          handler: async function (response: any) {
            setIsSubmitting(false);
            setIsVerifying(true);
            try {
              // 3. Server-side payment signature verification
              let verifySuccessful = false;
              let verifyErrorMessage = '';

              try {
                const verifyRes = await fetch('/api/payment/verify', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
                  },
                  body: JSON.stringify({
                    bookingId,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                });
                const verifyJson = await verifyRes.json().catch(() => null);
                if (verifyRes.ok && verifyJson?.success) {
                  verifySuccessful = true;
                } else {
                  verifyErrorMessage = verifyJson?.error || 'Server signature verification rejected';
                }
              } catch (verifyErr: any) {
                verifyErrorMessage = 'Unable to reach backend verification server: ' + verifyErr.message;
              }

              if (!verifySuccessful) {
                throw new Error(verifyErrorMessage || 'Payment signature could not be verified by server.');
              }

              const verifiedTimestamp = new Date().toISOString();
              setConfirmedPayment({
                bookingId,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                verifiedAt: verifiedTimestamp,
              });

              // Persist to context and storage
              confirmBooking({
                bookingId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                paymentStatus: 'PAID',
                travelerDetails,
              });

              setIsVerifying(false);
              setStep('confirmation');
            } catch (err: any) {
              setIsVerifying(false);
              setPaymentError('Payment verification failed: ' + err.message);
            }
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
              setPaymentError('Payment window was dismissed. You can retry whenever you are ready.');
            },
          },
          prefill: {
            name: primaryName.trim() || 'Aarav Sharma',
            email: primaryEmail.trim() || 'aarav.sharma@example.com',
            contact: primaryPhone.trim() || '9876543210',
          },
          theme: {
            color: '#0d6b63',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setIsSubmitting(false);
          setPaymentError(
            `Payment attempt failed (${resp.error?.code || 'Declined'}): ${resp.error?.description || 'Transaction was not completed'}. Please retry.`
          );
        });
        rzp.open();
      } else {
        setIsSubmitting(false);
        setPaymentError(
          'Payment Gateway SDK (Razorpay) failed to load. Please check your internet connection or disable ad-blockers and try again.'
        );
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setPaymentError('Payment failed to initialize: ' + err.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto"
      onClick={() => {
        if (!isSubmitting && !isVerifying) closeBookingSummary();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl border border-[#C2EAE7] shadow-2xl overflow-hidden text-left flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#0a3635] via-[#0d6b63] to-[#0a3635] text-white p-5 flex items-center justify-between border-b border-[#134947] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#E8B86D]">
              <span className="material-symbols-outlined text-[24px]">{getServiceIcon()}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A2E2DC] bg-white/10 px-2 py-0.5 rounded">
                  {summaryModalTrip.serviceType.toUpperCase()} BOOKING
                </span>
                <span className="text-xs text-white/70 font-mono">#{sessionBookingId}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                {summaryModalTrip.title || summaryModalTrip.route}
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              if (!isSubmitting && !isVerifying) closeBookingSummary();
            }}
            disabled={isSubmitting || isVerifying}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close booking modal"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Step Indicator Bar */}
        {step !== 'confirmation' && (
          <div className="bg-[#EAF8F7] px-6 py-2.5 border-b border-[#C2EAE7] flex items-center justify-between text-xs font-semibold shrink-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 'review' ? 'bg-[#006D77] text-white' : 'bg-[#20B8B0]/30 text-[#006D77]'
                }`}
              >
                1
              </span>
              <span className={step === 'review' ? 'text-[#006D77] font-bold' : 'text-[#5A738E]'}>Journey</span>
            </div>

            <span className="text-[#A2E2DC]">•</span>

            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 'passengers' ? 'bg-[#006D77] text-white' : 'bg-[#20B8B0]/30 text-[#006D77]'
                }`}
              >
                2
              </span>
              <span className={step === 'passengers' ? 'text-[#006D77] font-bold' : 'text-[#5A738E]'}>Passengers</span>
            </div>

            <span className="text-[#A2E2DC]">•</span>

            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 'final_review' ? 'bg-[#006D77] text-white' : 'bg-[#20B8B0]/30 text-[#006D77]'
                }`}
              >
                3
              </span>
              <span className={step === 'final_review' ? 'text-[#006D77] font-bold' : 'text-[#5A738E]'}>Payment</span>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* STEP 1: JOURNEY REVIEW */}
          {step === 'review' && (
            <div className="space-y-4 animate-fade-in">
              {/* Trip Highlight Card */}
              <div className="bg-[#F8FCFB] rounded-2xl border border-[#C2EAE7] p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#EAF8F7]">
                  <div>
                    <span className="text-base font-extrabold text-[#17324D] block">
                      {summaryModalTrip.operator || summaryModalTrip.title}
                    </span>
                    <span className="text-xs text-[#5A738E] font-medium">
                      Code: <strong className="text-[#006D77]">{summaryModalTrip.code}</strong> · {summaryModalTrip.travelClass || 'Standard Class'}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EAF8F7] text-[#006D77] border border-[#BCE8E4]">
                    {summaryModalTrip.stops || 'Confirmed Schedule'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-[#5A738E] uppercase tracking-wider block">ROUTE</span>
                    <span className="font-bold text-[#17324D] mt-0.5 block">{summaryModalTrip.route}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[#5A738E] uppercase tracking-wider block">DATE</span>
                    <span className="font-bold text-[#17324D] mt-0.5 block">{formattedDate}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[#5A738E] uppercase tracking-wider block">TIMING</span>
                    <span className="font-bold text-[#006D77] mt-0.5 block">
                      {summaryModalTrip.departTime ? `${summaryModalTrip.departTime} → ${summaryModalTrip.arriveTime || 'Arrival'}` : 'Scheduled'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[#5A738E] uppercase tracking-wider block">DURATION</span>
                    <span className="font-semibold text-[#17324D] mt-0.5 block">{summaryModalTrip.duration || 'Direct'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[#5A738E] uppercase tracking-wider block">PASSENGERS</span>
                    <span className="font-semibold text-[#17324D] mt-0.5 block">{summaryModalTrip.passengers}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[#5A738E] uppercase tracking-wider block">REFUND POLICY</span>
                    <span className="font-semibold text-[#166534] mt-0.5 block">100% Refund Protected</span>
                  </div>
                </div>
              </div>

              {/* AI Disruption Protection Guarantee */}
              <div className="bg-[#EAF8F7] border border-[#BCE8E4] rounded-2xl p-4 flex items-start gap-3 text-xs text-[#006D77]">
                <span className="material-symbols-outlined text-[22px] text-[#20B8B0] shrink-0 mt-0.5">verified_user</span>
                <div className="leading-relaxed">
                  <strong className="block font-bold text-sm text-[#006D77]">Autonomous AI Refund Protection Guarantee</strong>
                  If this trip is cancelled, delayed beyond DGCA thresholds, or disrupted by the operator, our platform automatically verifies carrier records and expedites your refund claim.
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="p-4 rounded-2xl bg-[#F8FCFB] border border-[#C2EAE7] space-y-2 text-xs">
                <span className="font-bold text-sm text-[#17324D] block pb-1 border-b border-[#EAF8F7]">Fare Breakdown</span>
                <div className="flex justify-between text-[#5A738E]">
                  <span>Base Fare ({passengerCount} passenger{passengerCount > 1 ? 's' : ''} × ₹{unitFare.toLocaleString('en-IN')})</span>
                  <span className="font-semibold text-[#17324D]">₹ {totalBaseFare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#5A738E]">
                  <span>Statutory Taxes, Tolls & Port Charges</span>
                  <span className="font-semibold text-[#166534]">Included</span>
                </div>
                <div className="flex justify-between text-[#5A738E]">
                  <span>AI Refund Engine & Fraud Protection</span>
                  <span className="font-bold text-[#006D77]">FREE (Waived)</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-[#C2EAE7]">
                  <span className="font-extrabold text-sm text-[#17324D]">Total Authoritative Payable</span>
                  <span className="font-black text-xl text-[#006D77]">{summaryModalTrip.fareFormatted}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PASSENGER INFORMATION */}
          {step === 'passengers' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#C2EAE7]">
                <div>
                  <h3 className="font-bold text-base text-[#17324D]">Passenger Information</h3>
                  <p className="text-xs text-[#5A738E]">Enter passenger details as displayed on government-issued ID.</p>
                </div>
                <span className="text-xs font-bold text-[#006D77] bg-[#EAF8F7] px-2.5 py-1 rounded-full border border-[#BCE8E4]">
                  {passengerCount} Traveller{passengerCount > 1 ? 's' : ''}
                </span>
              </div>

              {/* Primary Passenger Card */}
              <div className="bg-[#F8FCFB] rounded-2xl border border-[#C2EAE7] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#006D77]">person</span>
                  <span className="text-xs font-bold text-[#17324D] uppercase tracking-wide">
                    Lead Passenger / Contact (Ticket Holder)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#17324D] block mb-1">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={primaryName}
                      onChange={(e) => {
                        setPrimaryName(e.target.value);
                        if (formErrors.primaryName) setFormErrors((prev) => ({ ...prev, primaryName: '' }));
                      }}
                      placeholder="e.g. Aarav Sharma"
                      className={`w-full p-2.5 rounded-xl border bg-white text-[#17324D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77] ${
                        formErrors.primaryName ? 'border-red-500 bg-red-50/30' : 'border-[#C2EAE7]'
                      }`}
                      required
                    />
                    {formErrors.primaryName && (
                      <span className="text-[11px] text-red-600 font-medium mt-1 block">{formErrors.primaryName}</span>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-[#17324D] block mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={primaryEmail}
                      onChange={(e) => {
                        setPrimaryEmail(e.target.value);
                        if (formErrors.primaryEmail) setFormErrors((prev) => ({ ...prev, primaryEmail: '' }));
                      }}
                      placeholder="e.g. aarav.sharma@example.com"
                      className={`w-full p-2.5 rounded-xl border bg-white text-[#17324D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77] ${
                        formErrors.primaryEmail ? 'border-red-500 bg-red-50/30' : 'border-[#C2EAE7]'
                      }`}
                      required
                    />
                    {formErrors.primaryEmail && (
                      <span className="text-[11px] text-red-600 font-medium mt-1 block">{formErrors.primaryEmail}</span>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-[#17324D] block mb-1">
                      Mobile Number (10 digits) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={primaryPhone}
                      onChange={(e) => {
                        setPrimaryPhone(e.target.value);
                        if (formErrors.primaryPhone) setFormErrors((prev) => ({ ...prev, primaryPhone: '' }));
                      }}
                      placeholder="e.g. 9876543210"
                      className={`w-full p-2.5 rounded-xl border bg-white text-[#17324D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77] ${
                        formErrors.primaryPhone ? 'border-red-500 bg-red-50/30' : 'border-[#C2EAE7]'
                      }`}
                      required
                    />
                    {formErrors.primaryPhone && (
                      <span className="text-[11px] text-red-600 font-medium mt-1 block">{formErrors.primaryPhone}</span>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-[#17324D] block mb-1">Age</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={primaryAge}
                      onChange={(e) => setPrimaryAge(e.target.value)}
                      placeholder="e.g. 28"
                      className="w-full p-2.5 rounded-xl border border-[#C2EAE7] bg-white text-[#17324D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#17324D] block mb-1">Gender</label>
                    <select
                      value={primaryGender}
                      onChange={(e) => setPrimaryGender(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#C2EAE7] bg-white text-[#17324D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77] cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Co-passengers if passengerCount > 1 */}
              {coPassengers.map((cp, idx) => (
                <div key={idx} className="bg-[#F8FCFB] rounded-2xl border border-[#C2EAE7] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#006D77]">person_add</span>
                    <span className="text-xs font-bold text-[#17324D] uppercase tracking-wide">
                      Passenger {idx + 2} Details
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="font-bold text-[#17324D] block mb-1">
                        Full Legal Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cp.name}
                        onChange={(e) => {
                          const updated = [...coPassengers];
                          updated[idx].name = e.target.value;
                          setCoPassengers(updated);
                          if (formErrors[`coPassenger_${idx}`]) {
                            setFormErrors((prev) => ({ ...prev, [`coPassenger_${idx}`]: '' }));
                          }
                        }}
                        placeholder="e.g. Priya Sharma"
                        className={`w-full p-2.5 rounded-xl border bg-white text-[#17324D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77] ${
                          formErrors[`coPassenger_${idx}`] ? 'border-red-500 bg-red-50/30' : 'border-[#C2EAE7]'
                        }`}
                        required
                      />
                      {formErrors[`coPassenger_${idx}`] && (
                        <span className="text-[11px] text-red-600 font-medium mt-1 block">
                          {formErrors[`coPassenger_${idx}`]}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="font-bold text-[#17324D] block mb-1">Age</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={cp.age}
                        onChange={(e) => {
                          const updated = [...coPassengers];
                          updated[idx].age = e.target.value;
                          setCoPassengers(updated);
                        }}
                        placeholder="e.g. 26"
                        className="w-full p-2.5 rounded-xl border border-[#C2EAE7] bg-white text-[#17324D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006D77]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 3: FINAL REVIEW & PRICE BREAKDOWN */}
          {step === 'final_review' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-[#EAF8F7] border border-[#BCE8E4] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#006D77] uppercase tracking-wider block">
                    Review Before Payment
                  </span>
                  <h3 className="text-base font-extrabold text-[#17324D]">
                    {summaryModalTrip.operator} ({summaryModalTrip.code})
                  </h3>
                  <p className="text-xs text-[#5A738E] mt-0.5">
                    {summaryModalTrip.route} · {formattedDate} ({summaryModalTrip.departTime || 'Scheduled'})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#5A738E] block">Payable Amount</span>
                  <span className="text-xl font-black text-[#006D77]">{summaryModalTrip.fareFormatted}</span>
                </div>
              </div>

              {/* Passengers Summary */}
              <div className="p-4 rounded-2xl bg-[#F8FCFB] border border-[#C2EAE7] space-y-2 text-xs">
                <span className="font-bold text-xs text-[#17324D] uppercase tracking-wider block pb-1 border-b border-[#EAF8F7]">
                  Confirmed Passengers ({passengerCount})
                </span>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[#17324D]">
                    <span className="font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#006D77]">check_circle</span>
                      1. {primaryName} ({primaryGender}, {primaryAge || 'Adult'}) - Lead Traveller
                    </span>
                    <span className="text-[#5A738E] text-[11px]">{primaryPhone}</span>
                  </div>
                  {coPassengers.map((cp, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[#17324D]">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#006D77]">check_circle</span>
                        {idx + 2}. {cp.name} ({cp.gender}, {cp.age || 'Adult'})
                      </span>
                      <span className="text-[#5A738E] text-[11px]">Co-passenger</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statutory Price & Protection Table */}
              <div className="p-4 rounded-2xl bg-[#F8FCFB] border border-[#C2EAE7] space-y-2 text-xs">
                <span className="font-bold text-xs text-[#17324D] uppercase tracking-wider block pb-1 border-b border-[#EAF8F7]">
                  Statutory Fare & Security Breakdown
                </span>
                <div className="flex justify-between text-[#5A738E]">
                  <span>Base Fare ({passengerCount} × ₹{unitFare.toLocaleString('en-IN')})</span>
                  <span className="font-semibold text-[#17324D]">₹ {totalBaseFare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#5A738E]">
                  <span>GST & Mandatory Regulatory Surcharges</span>
                  <span className="font-semibold text-[#166534]">Included</span>
                </div>
                <div className="flex justify-between text-[#5A738E]">
                  <span>Server-Verified HMAC-SHA256 Anti-Tamper Security</span>
                  <span className="font-bold text-[#006D77]">Enforced</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-[#C2EAE7]">
                  <span className="font-extrabold text-sm text-[#17324D]">Final Authoritative Payable</span>
                  <span className="font-black text-2xl text-[#006D77]">{summaryModalTrip.fareFormatted}</span>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-3.5 rounded-2xl bg-[#EAF8F7] border border-[#BCE8E4] text-[11px] text-[#006D77] flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#006D77] shrink-0">lock</span>
                <span>
                  <strong>Razorpay Test Mode Active:</strong> No real bank deductions will be made. Payment verification and booking authorization are cryptographically verified by the server.
                </span>
              </div>

              {/* Payment Error Alert */}
              {paymentError && (
                <div className="p-3 bg-[#fee2e2] border border-[#fecaca] rounded-2xl text-xs text-[#991b1b] flex items-start gap-2.5 animate-fade-in">
                  <span className="material-symbols-outlined text-[18px] text-[#dc2626] shrink-0 mt-0.5">error</span>
                  <div className="flex-1">
                    <span className="font-bold block">Payment Error</span>
                    <span className="leading-relaxed">{paymentError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: CONFIRMED BOOKING SCREEN */}
          {step === 'confirmation' && confirmedPayment && (
            <div className="space-y-4 animate-fade-in text-center py-2">
              <div className="w-16 h-16 rounded-full bg-[#ecfdf5] border-2 border-[#10b981] text-[#059669] flex items-center justify-center mx-auto shadow-md">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>

              <div>
                <span className="text-xs font-bold text-[#059669] uppercase tracking-wider bg-[#ecfdf5] px-3 py-1 rounded-full border border-[#a7f3d0]">
                  Payment Verified & Booking Confirmed
                </span>
                <h3 className="text-2xl font-black text-[#17324D] mt-2">
                  {summaryModalTrip.title || summaryModalTrip.route}
                </h3>
                <p className="text-xs text-[#5A738E] mt-1">
                  Confirmation sent to <strong className="text-[#17324D]">{primaryEmail}</strong>
                </p>
              </div>

              {/* Reference Badges Card */}
              <div className="p-4 rounded-2xl bg-[#F8FCFB] border border-[#C2EAE7] grid grid-cols-2 gap-3 text-left text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#5A738E] uppercase tracking-wider block">BOOKING REFERENCE</span>
                  <span className="font-mono text-sm font-extrabold text-[#006D77] block mt-0.5">
                    {confirmedPayment.bookingId}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#5A738E] uppercase tracking-wider block">RAZORPAY PAYMENT ID</span>
                  <span className="font-mono text-xs font-bold text-[#17324D] block mt-0.5 truncate">
                    {confirmedPayment.paymentId}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#5A738E] uppercase tracking-wider block">AMOUNT PAID</span>
                  <span className="font-bold text-sm text-[#166534] block mt-0.5">
                    {summaryModalTrip.fareFormatted} (PAID)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#5A738E] uppercase tracking-wider block">VERIFIED AT</span>
                  <span className="font-mono text-[11px] text-[#5A738E] block mt-0.5">
                    {new Date(confirmedPayment.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Protection Notice */}
              <div className="p-3 rounded-2xl bg-[#EAF8F7] border border-[#BCE8E4] text-xs text-[#006D77] text-left flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#20B8B0]">shield</span>
                <span>
                  <strong>Autonomous AI Refund Protection Active:</strong> Your journey is protected. In case of disruption, check eligibility via your bookings page.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-[#F8FCFB] border-t border-[#C2EAE7] flex items-center justify-between gap-3 shrink-0">
          {step === 'review' && (
            <>
              <button
                type="button"
                onClick={closeBookingSummary}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5A738E] hover:text-[#17324D] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('passengers')}
                className="bg-[#006D77] hover:bg-[#00565E] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Passenger Details</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </>
          )}

          {step === 'passengers' && (
            <>
              <button
                type="button"
                onClick={() => setStep('review')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5A738E] hover:text-[#17324D] hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validatePassengerForm()) {
                    setStep('final_review');
                  }
                }}
                className="bg-[#006D77] hover:bg-[#00565E] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Review Booking & Price</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </>
          )}

          {step === 'final_review' && (
            <>
              <button
                type="button"
                onClick={() => setStep('passengers')}
                disabled={isSubmitting || isVerifying}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5A738E] hover:text-[#17324D] hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Edit Passengers</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={isSubmitting || isVerifying}
                className="bg-gradient-to-r from-[#006D77] via-[#007b86] to-[#00565E] hover:from-[#00565E] hover:to-[#004349] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">verified</span>
                    <span>Verifying HMAC Signature...</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Launching Razorpay Checkout...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    <span>Pay with Razorpay ({summaryModalTrip.fareFormatted})</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === 'confirmation' && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const bId = confirmedPayment?.bookingId || summaryModalTrip?.id || 'BK-1';
                  closeBookingSummary();
                  navigate(`/ticket/${bId}`);
                }}
                className="px-4 py-2 rounded-xl border border-[#C2EAE7] bg-white text-[#006D77] text-xs font-bold hover:bg-[#EAF8F7] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Official E-Ticket</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    closeBookingSummary();
                    navigate('/bookings');
                  }}
                  className="bg-[#006D77] hover:bg-[#00565E] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                  <span>View in My Bookings</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
