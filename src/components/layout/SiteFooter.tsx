import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const SiteFooter: React.FC = () => {
  const [isReviewer] = useState(() => {
    try {
      const rawUser = sessionStorage.getItem('agent_travel_user') || localStorage.getItem('agent_travel_user');
      if (!rawUser) return false;
      const user: unknown = JSON.parse(rawUser);
      return typeof user === 'object' && user !== null &&
        Reflect.get(user, 'signedIn') === true && Reflect.get(user, 'role') === 'reviewer';
    } catch {
      return false;
    }
  });

  return (
    <footer className="w-full bg-[#f1ebe1] border-t border-[#e3ded4] text-left text-[#42504e] mt-auto">
      {/* Top Disclaimer Banner */}
      <div className="border-b border-[#e3ded4] py-3.5 bg-[#eae4d8]/40">
        <div className="site-container text-xs text-[#6b7775] leading-relaxed">
          Refund eligibility and amounts depend on your booking, applicable policies and provider decisions. Offers are subject to provider terms.
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="site-container py-10 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand info */}
          <div className="col-span-2 space-y-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="w-7 h-7 rounded bg-[#0d6b63] text-white flex items-center justify-center font-bold text-xs tracking-tight">
                AT
              </span>
              <span className="text-[#0d3d3a] font-bold text-base tracking-tight">
                Agent Travel
              </span>
            </Link>
            <p className="text-xs text-[#6b7775]">
              Travel smarter. Journey safer.
            </p>
            <p className="text-xs text-[#6b7775] max-w-sm leading-relaxed">
              Unified travel booking for flights, hotels, trains, buses and cabs, backed by automated AI refund assistance when travel plans change.
            </p>
            <div className="pt-2 text-xs text-[#889593]">
              © {new Date().getFullYear()} Agent Travel. All rights reserved.
            </div>
          </div>

          {/* Explore Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0d3d3a]">
              Explore
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/flights" className="hover:text-[#0d6b63] transition-colors">
                  Flights
                </Link>
              </li>
              <li>
                <Link to="/hotels" className="hover:text-[#0d6b63] transition-colors">
                  Hotels
                </Link>
              </li>
              <li>
                <Link to="/trains" className="hover:text-[#0d6b63] transition-colors">
                  Trains
                </Link>
              </li>
              <li>
                <Link to="/buses" className="hover:text-[#0d6b63] transition-colors">
                  Buses
                </Link>
              </li>
              <li>
                <Link to="/cabs" className="hover:text-[#0d6b63] transition-colors">
                  Cabs
                </Link>
              </li>
              <li>
                <Link to="/holidays" className="hover:text-[#0d6b63] transition-colors">
                  Holidays
                </Link>
              </li>
            </ul>
          </div>

          {/* Help Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0d3d3a]">
              Help
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/refunds" className="font-semibold text-[#0d6b63] hover:underline flex items-center gap-1">
                  Refund centre
                  <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-[#0d6b63] transition-colors">
                  Contact us
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-[#0d6b63] transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link to="/bookings" className="hover:text-[#0d6b63] transition-colors">
                  Manage bookings
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0d3d3a]">
              Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/help" className="hover:text-[#0d6b63] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-[#0d6b63] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refunds" className="hover:text-[#0d6b63] transition-colors">
                  Cancellation policy
                </Link>
              </li>
              {isReviewer && (
                <li>
                  <Link to="/reviewer" className="text-[#0d6b63] font-semibold hover:underline">
                    Staff Reviewer Console
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};
