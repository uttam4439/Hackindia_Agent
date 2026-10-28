import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { useTravelBooking, StoredBooking } from '../context/TravelBookingContext';

type StatusTab = 'upcoming' | 'completed' | 'cancelled' | 'all';
type ServiceFilter = 'all' | 'flights' | 'hotels' | 'trains' | 'buses' | 'cabs' | 'holidays';

export const BookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userBookings, bookingSuccessAlert, clearBookingSuccessAlert, fetchBackendBookings } = useTravelBooking();
  const [activeTab, setActiveTab] = useState<StatusTab>('upcoming');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<StoredBooking | null>(null);

  React.useEffect(() => {
    fetchBackendBookings();
  }, []);

  const isPastBooking = (b: StoredBooking) => {
    if (b.status === 'Completed') return true;
    const dateDetail = b.details.find(
      (d) => d.label === 'DATE' || d.label === 'CHECK-IN' || d.label === 'START DATE'
    );
    if (dateDetail) {
      const d = new Date(dateDetail.value);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d < today;
      }
    }
    return false;
  };

  const upcomingCount = userBookings.filter((b) => !isPastBooking(b) && !b.status.includes('Cancelled')).length;
  const completedCount = userBookings.filter((b) => isPastBooking(b) && !b.status.includes('Cancelled')).length;
  const cancelledCount = userBookings.filter((b) => b.status.includes('Cancelled')).length;
  const cancelledBooking = userBookings.find((b) => b.hasRefundAlert || b.status.includes('Cancelled'));

  const filteredBookings = userBookings.filter((b) => {
    // Status tab filter
    if (activeTab === 'cancelled' && !b.status.includes('Cancelled')) return false;
    if (activeTab === 'upcoming' && (isPastBooking(b) || b.status.includes('Cancelled'))) return false;
    if (activeTab === 'completed' && (!isPastBooking(b) || b.status.includes('Cancelled'))) return false;

    // Service mode filter
    if (serviceFilter === 'flights' && b.serviceType !== 'FLIGHT') return false;
    if (serviceFilter === 'hotels' && b.serviceType !== 'HOTEL') return false;
    if (serviceFilter === 'trains' && b.serviceType !== 'TRAIN') return false;
    if (serviceFilter === 'buses' && b.serviceType !== 'BUS') return false;
    if (serviceFilter === 'cabs' && b.serviceType !== 'CAB') return false;
    if (serviceFilter === 'holidays' && b.serviceType !== 'HOLIDAY') return false;

    return true;
  });

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <SiteHeader activeTab="bookings" />

      <main className="flex-1 w-full site-container py-8 text-left">
        {/* Breadcrumb */}
        <div className="text-xs text-[#6b7775] mb-2 flex items-center gap-1.5">
          <Link to="/" className="hover:text-[#0d3d3a]">Home</Link>
          <span>›</span>
          <span className="text-[#0d3d3a] font-medium">My Bookings</span>
        </div>

        {/* Title Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#e3ded4] gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0d3d3a] tracking-tight">
              My bookings
            </h1>
            <p className="text-sm text-[#5c6967] mt-1">
              Flights, hotels, trains, buses and cabs, all in one place.
            </p>
          </div>

          <Link
            to="/"
            className="self-start sm:self-auto bg-[#0d6b63] text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm"
          >
            Book a new trip
          </Link>
        </div>

        {/* Booking Success Banner */}
        {bookingSuccessAlert && (
          <div className="my-4 bg-[#ecfdf5] border border-[#bbf7d0] rounded-xl p-4 flex items-center justify-between text-xs sm:text-sm text-[#166534] shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#166534]">check_circle</span>
              <span className="font-semibold">{bookingSuccessAlert}</span>
            </div>
            <button
              onClick={clearBookingSuccessAlert}
              className="text-[#166534] hover:text-[#064e3b] font-bold p-1"
              aria-label="Dismiss alert"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* CANCELLATION DISRUPTION ALERT BANNER (Page 8) */}
        {cancelledBooking && (
          <div className="my-6 bg-[#fffbeb] border border-[#fde68a] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[22px] text-[#b45309] shrink-0 mt-0.5">
                warning
              </span>
              <div className="text-xs sm:text-sm text-[#92400e] leading-relaxed">
                <strong>Your {cancelledBooking.title} was cancelled by the carrier.</strong> Our AI can help you check refund eligibility and track your claim.
              </div>
            </div>

            <Link
              to={`/refunds/${cancelledBooking.refundCaseId || 'RF12345'}`}
              className="shrink-0 bg-[#0d6b63] text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors whitespace-nowrap shadow-sm"
            >
              Check Refund Eligibility →
            </Link>
          </div>
        )}

        {/* Status Tabs (Upcoming, Completed, Cancelled, All) */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-[#e3ded4]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-[#0d6b63] text-white'
                  : 'text-[#42504e] hover:bg-[#eae4d8]'
              }`}
            >
              Upcoming ({upcomingCount})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'completed'
                  ? 'bg-[#0d6b63] text-white'
                  : 'text-[#42504e] hover:bg-[#eae4d8]'
              }`}
            >
              Completed {completedCount > 0 ? `(${completedCount})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'cancelled'
                  ? 'bg-[#0d6b63] text-white'
                  : 'text-[#42504e] hover:bg-[#eae4d8]'
              }`}
            >
              Cancelled {cancelledCount > 0 ? `(${cancelledCount})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-[#0d6b63] text-white'
                  : 'text-[#42504e] hover:bg-[#eae4d8]'
              }`}
            >
              All ({userBookings.length})
            </button>
          </div>

          {/* Service Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {(['all', 'flights', 'hotels', 'trains', 'buses', 'cabs', 'holidays'] as ServiceFilter[]).map(
              (svc) => (
                <button
                  key={svc}
                  onClick={() => setServiceFilter(svc)}
                  className={`px-3 py-1 rounded-md capitalize transition-colors font-medium ${
                    serviceFilter === svc
                      ? 'bg-white border border-[#0d6b63] text-[#0d3d3a] font-semibold'
                      : 'text-[#6b7775] hover:text-[#0d3d3a]'
                  }`}
                >
                  {svc}
                </button>
              )
            )}
          </div>
        </div>

        {/* BOOKING CARDS LIST (Page 8) */}
        <div className="py-6 space-y-4">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-xl border border-[#e3ded4] p-5 shadow-sm hover:border-[#0d6b63]/50 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#f0ebe1]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#6b7775] font-medium">
                    {b.refLabel}
                  </span>
                  <span className="text-[#889593]">•</span>
                  <span className="text-xs font-bold text-[#0d3d3a]">{b.serviceType}</span>
                  {b.paymentStatus === 'PAID' && (
                    <>
                      <span className="text-[#889593]">•</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0d6b63] bg-[#e8f2f0] px-2 py-0.5 rounded-full border border-[#d0dfd3]">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        Razorpay Paid
                      </span>
                    </>
                  )}
                </div>

                <span
                  className={`self-start sm:self-auto text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    b.statusColor === 'error'
                      ? 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]'
                      : 'bg-[#ecfdf5] text-[#166534] border-[#bbf7d0]'
                  }`}
                >
                  {b.status}
                </span>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#0d3d3a]">
                    {b.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-xs">
                    {b.details.map((d) => (
                      <div key={d.label} className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#889593] uppercase tracking-wider">
                          {d.label}
                        </span>
                        <span className="font-medium text-[#192524] mt-0.5">
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-2 lg:pt-0">
                  {b.hasRefundAlert ? (
                    <Link
                      to={`/refunds/${b.refundCaseId}`}
                      className="bg-[#0d6b63] text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm"
                    >
                      Check Refund Eligibility
                    </Link>
                  ) : (
                    <button
                      onClick={() => setSelectedBookingDetails(b)}
                      className="bg-white border border-[#0d6b63] text-[#0d6b63] px-4 py-2 rounded-md text-xs font-semibold hover:bg-[#e8f2f0] transition-colors cursor-pointer"
                    >
                      Manage booking
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedBookingDetails(b)}
                    className="text-[#6b7775] hover:text-[#0d3d3a] px-3 py-2 text-xs font-medium cursor-pointer"
                  >
                    View details
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredBookings.length === 0 && (
            <div className="bg-white rounded-xl border border-[#e3ded4] p-12 text-center text-[#6b7775]">
              <span className="material-symbols-outlined text-[36px] text-[#889593] mb-2 block">
                inbox
              </span>
              <p className="text-sm font-semibold text-[#0d3d3a]">No bookings found</p>
              <p className="text-xs text-[#6b7775] mt-1">Try switching tabs or book a new trip above.</p>
            </div>
          )}
        </div>

        {/* BOTTOM HELPFUL CARDS (Page 8) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 pb-8">
          {/* AI Refund Assistance Card */}
          <div className="bg-[#f0ebe1] rounded-xl border border-[#e3ded4] p-5 sm:p-6 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#0d3d3a]">
                AI-powered refund assistance
              </h3>
              <p className="text-xs text-[#5c6967] leading-relaxed">
                If any booking is cancelled or disrupted, our AI helps you check refund
                eligibility, understand applicable policies and track your claim.
              </p>
              <p className="text-[11px] text-[#889593]">
                Refund eligibility and amounts depend on your booking, applicable policies and provider decisions.
              </p>
            </div>

            <Link
              to="/refunds"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0d6b63] hover:underline pt-2"
            >
              Check Refund Eligibility →
            </Link>
          </div>

          {/* Need To Make Changes Card */}
          <div className="bg-white rounded-xl border border-[#e3ded4] p-5 sm:p-6 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#0d3d3a]">
                Need to make changes?
              </h3>
              <p className="text-xs text-[#5c6967] leading-relaxed">
                Manage your trip, change dates or review cancellation options for any booking.
                Our team and AI assistant are available 24/7.
              </p>
            </div>

            <div>
              <Link
                to="/help"
                className="inline-block bg-white border border-[#e3ded4] text-[#0d3d3a] px-4 py-2 rounded-md text-xs font-semibold hover:bg-[#f7f4ed] transition-colors"
              >
                Visit help centre
              </Link>
            </div>
          </div>
        </div>

        {/* Modal for Booking Details */}
        {selectedBookingDetails && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-[#e3ded4] p-6 space-y-4 shadow-2xl animate-fade-in text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[#e3ded4]">
                <div>
                  <span className="font-mono text-xs text-[#6b7775]">
                    {selectedBookingDetails.refLabel}
                  </span>
                  <h3 className="text-lg font-bold text-[#0d3d3a]">
                    {selectedBookingDetails.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBookingDetails(null)}
                  className="text-[#6b7775] hover:text-black p-1"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {selectedBookingDetails.details.map((d) => (
                  <div key={d.label} className="flex justify-between py-1 border-b border-[#f0ebe1]">
                    <span className="text-[#889593]">{d.label}</span>
                    <span className="font-semibold text-[#0d3d3a]">{d.value}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1 border-b border-[#f0ebe1]">
                  <span className="text-[#889593]">Status</span>
                  <span className="font-semibold text-[#166534]">{selectedBookingDetails.status}</span>
                </div>
                {selectedBookingDetails.paymentStatus && (
                  <div className="flex justify-between py-1 border-b border-[#f0ebe1]">
                    <span className="text-[#889593]">Payment Status</span>
                    <span className="font-semibold text-[#0d6b63]">{selectedBookingDetails.paymentStatus}</span>
                  </div>
                )}
                {selectedBookingDetails.razorpayPaymentId && (
                  <div className="flex justify-between py-1 border-b border-[#f0ebe1]">
                    <span className="text-[#889593]">Razorpay Payment ID</span>
                    <span className="font-mono text-[#0d3d3a]">{selectedBookingDetails.razorpayPaymentId}</span>
                  </div>
                )}
                {selectedBookingDetails.razorpayOrderId && (
                  <div className="flex justify-between py-1 border-b border-[#f0ebe1]">
                    <span className="text-[#889593]">Razorpay Order ID</span>
                    <span className="font-mono text-[#0d3d3a]">{selectedBookingDetails.razorpayOrderId}</span>
                  </div>
                )}
                {selectedBookingDetails.paymentVerifiedAt && (
                  <div className="flex justify-between py-1 border-b border-[#f0ebe1]">
                    <span className="text-[#889593]">Verified At</span>
                    <span className="font-mono text-[#0d3d3a]">
                      {new Date(selectedBookingDetails.paymentVerifiedAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                )}
                {selectedBookingDetails.traveler && (
                  <div className="pt-2 pb-1 border-b border-[#f0ebe1] space-y-1">
                    <span className="font-bold text-[#0d3d3a] block">Primary Passenger:</span>
                    <div className="text-[11px] text-[#42504e] space-y-0.5">
                      <div>Name: <span className="font-semibold text-[#0d3d3a]">{selectedBookingDetails.traveler.name}</span></div>
                      <div>Email: <span className="font-semibold text-[#0d3d3a]">{selectedBookingDetails.traveler.email}</span></div>
                      {selectedBookingDetails.traveler.phone && (
                        <div>Phone: <span className="font-semibold text-[#0d3d3a]">{selectedBookingDetails.traveler.phone}</span></div>
                      )}
                    </div>
                    {selectedBookingDetails.traveler.passengers && selectedBookingDetails.traveler.passengers.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] font-bold text-[#5c6967] block">Co-Travellers:</span>
                        <div className="space-y-0.5 mt-0.5">
                          {selectedBookingDetails.traveler.passengers.map((p, idx) => (
                            <div key={idx} className="text-[11px] text-[#42504e]">
                              • {p.name} {p.age ? `(${p.age} yrs, ${p.gender || 'N/A'})` : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const bId = selectedBookingDetails.id;
                      setSelectedBookingDetails(null);
                      navigate(`/ticket/${bId}?print=true`);
                    }}
                    className="border border-[#0d6b63] text-[#0d6b63] bg-white px-3.5 py-1.5 rounded-md text-xs font-semibold hover:bg-[#e8f2f0] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Generate and print dedicated travel ticket / receipt"
                  >
                    <span className="material-symbols-outlined text-[15px]">print</span>
                    <span>Print Ticket</span>
                  </button>
                  <Link
                    to={selectedBookingDetails.refundCaseId ? `/refunds/${selectedBookingDetails.refundCaseId}` : '/refunds'}
                    className="border border-[#b45309] text-[#b45309] bg-[#fffbeb] px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-[#fef3c7] transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">gavel</span>
                    Dispute / Refund
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBookingDetails(null)}
                  className="bg-[#0d6b63] text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
};
