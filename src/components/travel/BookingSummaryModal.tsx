import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTravelBooking } from '../../context/TravelBookingContext';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export const BookingSummaryModal: React.FC = () => {
  const navigate = useNavigate();
  const { summaryModalTrip, closeBookingSummary, confirmBooking } = useTravelBooking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [sessionBookingId, setSessionBookingId] = useState<string>('');

  // Anchor stable bookingId per modal session to allow backend order deduplication across payment retries
  useEffect(() => {
    if (summaryModalTrip) {
      setSessionBookingId(`BK-${Date.now().toString().slice(-6)}`);
      setPaymentError(null);
    }
  }, [summaryModalTrip?.id]);

  if (!summaryModalTrip) return null;

  const parsedDate = new Date(summaryModalTrip.departDate + 'T00:00:00');
  const formattedDate = !isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    : summaryModalTrip.departDate;

  const handleProceedToPayment = async () => {
    if (isSubmitting || isVerifying) return;
    setIsSubmitting(true);
    setPaymentError(null);

    // Reuse sessionBookingId across payment retries in the same modal session
    const bookingId = sessionBookingId || `BK-${Date.now().toString().slice(-6)}`;

    const storedToken =
      sessionStorage.getItem('agent_travel_token') || localStorage.getItem('agent_travel_token');
    const storedUserRaw =
      sessionStorage.getItem('agent_travel_user') || localStorage.getItem('agent_travel_user');
    let currentUser: any = null;
    if (storedUserRaw) {
      try {
        currentUser = JSON.parse(storedUserRaw);
      } catch {}
    }

    try {
      // 1. Request backend to create authoritative Razorpay Order
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
            travelerDetails: {
              name: currentUser?.name || 'Aarav Sharma',
              email: currentUser?.email || 'aarav.sharma@example.com',
              contact: currentUser?.contact || '9876543210',
              userId: currentUser?.id || 'usr_traveler_local',
            },
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
          // CRITICAL: Only attach order_id if it is a real Razorpay-generated order ID.
          // Passing a dummy or local fallback order_id causes Razorpay to reject with "Oops! Something went wrong".
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

              confirmBooking({
                bookingId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                paymentStatus: 'PAID',
              });
              setIsVerifying(false);
              navigate('/bookings');
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
            name: currentUser?.name || 'Aarav Sharma',
            email: currentUser?.email || 'aarav.sharma@example.com',
            contact: currentUser?.contact || '9876543210',
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
        // Honest error handling when Razorpay CDN is unavailable
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={closeBookingSummary}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-[#e3ded4] shadow-2xl overflow-hidden text-left flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0a3635] text-white p-5 flex items-center justify-between border-b border-[#134947]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0d6b63] border border-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[22px]">{getServiceIcon()}</span>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9fc2be] block">
                Booking Review & Confirmation
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {summaryModalTrip.title || summaryModalTrip.route}
              </h2>
            </div>
          </div>
          <button
            onClick={closeBookingSummary}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close summary modal"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Trip Summary Card */}
          <div className="bg-[#f7f4ed] rounded-xl border border-[#e3ded4] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#e3ded4]">
              <span className="font-bold text-[#0d3d3a] text-sm">
                {summaryModalTrip.operator || summaryModalTrip.title}
              </span>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white text-[#0d6b63] border border-[#e3ded4]">
                {summaryModalTrip.code}
              </span>
            </div>

            {summaryModalTrip.serviceType === 'hotels' ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#889593] uppercase tracking-wider block">
                    CHECK-IN
                  </span>
                  <span className="font-semibold text-[#0d3d3a] mt-0.5 block">
                    {formattedDate}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#889593] uppercase tracking-wider block">
                    CHECK-OUT
                  </span>
                  <span className="font-semibold text-[#0d3d3a] mt-0.5 block">
                    {summaryModalTrip.returnDate
                      ? new Date(summaryModalTrip.returnDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Scheduled'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#889593] uppercase tracking-wider block">
                    STAY DURATION
                  </span>
                  <span className="font-semibold text-[#0d6b63] mt-0.5 block">
                    {summaryModalTrip.nights || 1} Night{(summaryModalTrip.nights || 1) > 1 ? 's' : ''} ({summaryModalTrip.rooms || 1} Room{(summaryModalTrip.rooms || 1) > 1 ? 's' : ''})
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#889593] uppercase tracking-wider block">
                    GUESTS
                  </span>
                  <span className="font-semibold text-[#0d3d3a] mt-0.5 block">
                    {summaryModalTrip.passengers}
                  </span>
                </div>

                <div className="col-span-2 pt-1 border-t border-[#e3ded4]">
                  <span className="text-[10px] font-bold text-[#889593] uppercase tracking-wider block">
                    PROPERTY LOCATION
                  </span>
                  <span className="font-semibold text-[#0d3d3a] mt-0.5 block">
                    {summaryModalTrip.route}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#889593] uppercase tracking-wider block">
                    TRAVEL DATE
                  </span>
                  <span className="font-semibold text-[#0d3d3a] mt-0.5 block">
                    {formattedDate}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#889593] uppercase tracking-wider block">
                    TRAVELLERS / SEATS
                  </span>
                  <span className="font-semibold text-[#0d3d3a] mt-0.5 block">
                    {summaryModalTrip.passengers}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#889593] uppercase tracking-wider block">
                    ROUTE / SECTOR
                  </span>
                  <span className="font-semibold text-[#0d3d3a] mt-0.5 block">
                    {summaryModalTrip.route}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#889593] uppercase tracking-wider block">
                    SCHEDULE
                  </span>
                  <span className="font-semibold text-[#0d3d3a] mt-0.5 block">
                    {summaryModalTrip.departTime ? `${summaryModalTrip.departTime} → ${summaryModalTrip.arriveTime || 'Arrival'}` : 'Scheduled Departure'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* AI Refund Protection Banner */}
          <div className="bg-[#e8f2f0] border border-[#d0dfd3] rounded-xl p-3.5 flex items-start gap-3 text-xs text-[#0d6b63]">
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5 text-[#0d6b63]">
              verified_user
            </span>
            <div className="leading-relaxed">
              <strong className="block font-bold">100% Autonomous AI Refund Protection Included</strong>
              {summaryModalTrip.serviceType === 'hotels'
                ? 'Free cancellation and automated refund handling in case of emergency or property disruption.'
                : 'If your trip is delayed, grounded, or cancelled by the carrier, our engine automatically verifies evidence and expedites your claim under DGCA CAR & carrier policies.'}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 pt-2 border-t border-[#e3ded4] text-xs">
            {summaryModalTrip.serviceType === 'hotels' ? (
              <>
                <div className="flex justify-between text-[#5c6967]">
                  <span>
                    Room Charge ({summaryModalTrip.nights || 1} Night{(summaryModalTrip.nights || 1) > 1 ? 's' : ''}
                    {(summaryModalTrip.rooms || 1) > 1 ? ` × ${summaryModalTrip.rooms} Rooms` : ''} × ₹{' '}
                    {(
                      summaryModalTrip.baseRatePerUnit ||
                      Math.round(summaryModalTrip.fareAmount / ((summaryModalTrip.nights || 1) * (summaryModalTrip.rooms || 1)))
                    ).toLocaleString('en-IN')})
                  </span>
                  <span className="font-medium text-[#192524]">{summaryModalTrip.fareFormatted}</span>
                </div>
                <div className="flex justify-between text-[#5c6967]">
                  <span>GST & Hospitality Taxes (12%)</span>
                  <span className="font-medium text-[#192524]">Included</span>
                </div>
                <div className="flex justify-between text-[#5c6967]">
                  <span>AI Stay Protection & Instant Rebooking</span>
                  <span className="font-bold text-[#0d6b63]">FREE (Waived)</span>
                </div>
              </>
            ) : summaryModalTrip.serviceType === 'flights' ? (
              <>
                <div className="flex justify-between text-[#5c6967]">
                  <span>Base Airfare ({summaryModalTrip.passengerCount || 1} Traveller{(summaryModalTrip.passengerCount || 1) > 1 ? 's' : ''} × ₹ {(summaryModalTrip.baseRatePerUnit || summaryModalTrip.fareAmount).toLocaleString('en-IN')})</span>
                  <span className="font-medium text-[#192524]">{summaryModalTrip.fareFormatted}</span>
                </div>
                <div className="flex justify-between text-[#5c6967]">
                  <span>Aviation Taxes, UDF & Fuel Surcharges</span>
                  <span className="font-medium text-[#192524]">Included</span>
                </div>
                <div className="flex justify-between text-[#5c6967]">
                  <span>AI Autonomous Dispute Protection</span>
                  <span className="font-bold text-[#0d6b63]">FREE (Waived)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-[#5c6967]">
                  <span>Base Fare & Carrier Charges</span>
                  <span className="font-medium text-[#192524]">{summaryModalTrip.fareFormatted}</span>
                </div>
                <div className="flex justify-between text-[#5c6967]">
                  <span>Applicable Taxes & Tolls</span>
                  <span className="font-medium text-[#192524]">Included</span>
                </div>
                <div className="flex justify-between text-[#5c6967]">
                  <span>AI Travel Protection</span>
                  <span className="font-bold text-[#0d6b63]">FREE (Waived)</span>
                </div>
              </>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-[#e3ded4]">
              <span className="text-sm font-bold text-[#0d3d3a]">Total Authoritative Payable</span>
              <span className="text-xl font-bold text-[#0d6b63]">{summaryModalTrip.fareFormatted}</span>
            </div>
          </div>

          {/* Payment Error / Dismissal Alert */}
          {paymentError && (
            <div className="p-3 bg-[#fee2e2] border border-[#fecaca] rounded-xl text-xs text-[#991b1b] flex items-start gap-2.5 animate-fade-in">
              <span className="material-symbols-outlined text-[18px] text-[#dc2626] shrink-0 mt-0.5">error</span>
              <div className="flex-1">
                <span className="font-bold block">Payment Notice</span>
                <span className="leading-relaxed">{paymentError}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-[#f7f4ed] border-t border-[#e3ded4] flex items-center justify-between sm:justify-end gap-3">
          <button
            type="button"
            onClick={closeBookingSummary}
            disabled={isSubmitting || isVerifying}
            className="px-4 py-2 rounded-md text-xs font-semibold text-[#5c6967] hover:text-[#0d3d3a] hover:bg-[#eae4d8] transition-colors disabled:opacity-50"
          >
            Cancel / Edit
          </button>

          <button
            type="button"
            onClick={handleProceedToPayment}
            disabled={isSubmitting || isVerifying}
            className="bg-[#0d6b63] text-white px-5 py-2.5 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isVerifying ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">verified</span>
                <span>Verifying Payment...</span>
              </>
            ) : isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>Opening Razorpay Checkout...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Pay with Razorpay ({summaryModalTrip.fareFormatted})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
