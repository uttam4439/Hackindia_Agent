import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SiteHeaderProps {
  activeTab?: string;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({ activeTab }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [serviceNavOpen, setServiceNavOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role?: string } | null>(() => {
    try {
      const raw = sessionStorage.getItem('agent_travel_user') || localStorage.getItem('agent_travel_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const handleSignOut = () => {
    sessionStorage.removeItem('agent_travel_user');
    sessionStorage.removeItem('agent_travel_token');
    localStorage.removeItem('agent_travel_user');
    localStorage.removeItem('agent_travel_token');
    setCurrentUser(null);
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  };

  const isActive = (path: string) => {
    if (activeTab && path.includes(activeTab)) return true;
    return location.pathname === path;
  };

  return (
    <header className="w-full bg-[#f7f4ed] border-b border-[#e3ded4] sticky top-0 z-50">
      <div className="site-container h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/" className="flex items-center gap-2.5 text-decoration-none group">
            <span className="w-8 h-8 rounded-md bg-[#0d6b63] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm group-hover:bg-[#0a534d] transition-colors">
              AT
            </span>
            <div className="flex flex-col text-left">
              <span className="text-[#0d3d3a] font-bold text-base leading-tight tracking-tight">
                Agent Travel
              </span>
              <span className="text-[#6b7775] text-[11px] leading-tight font-normal">
                Travel smarter. Journey safer.
              </span>
            </div>
          </Link>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-0 xl:gap-2">
          {/* Explore with quick services popover */}
          <div className="relative">
            <button
              onClick={() => setServiceNavOpen(!serviceNavOpen)}
              onBlur={() => setTimeout(() => setServiceNavOpen(false), 200)}
              className={`px-2 lg:px-1 xl:px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors flex items-center gap-1 ${
                location.pathname === '/' || serviceNavOpen
                  ? 'text-[#0d3d3a] font-semibold bg-[#eae4d8]/60'
                  : 'text-[#42504e] hover:text-[#0d3d3a] hover:bg-[#eae4d8]/40'
              }`}
            >
              Explore
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {serviceNavOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-[#e3ded4] rounded-lg shadow-lg py-1 z-50 animate-fade-in text-left">
                <Link
                  to="/flights"
                  className="px-3.5 py-2 text-xs font-medium text-[#192524] hover:bg-[#f7f4ed] hover:text-[#0d6b63] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">flight</span>
                  Flights
                </Link>
                <Link
                  to="/hotels"
                  className="px-3.5 py-2 text-xs font-medium text-[#192524] hover:bg-[#f7f4ed] hover:text-[#0d6b63] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">hotel</span>
                  Hotels
                </Link>
                <Link
                  to="/trains"
                  className="px-3.5 py-2 text-xs font-medium text-[#192524] hover:bg-[#f7f4ed] hover:text-[#0d6b63] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">train</span>
                  Trains
                </Link>
                <Link
                  to="/buses"
                  className="px-3.5 py-2 text-xs font-medium text-[#192524] hover:bg-[#f7f4ed] hover:text-[#0d6b63] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">directions_bus</span>
                  Buses
                </Link>
                <Link
                  to="/cabs"
                  className="px-3.5 py-2 text-xs font-medium text-[#192524] hover:bg-[#f7f4ed] hover:text-[#0d6b63] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">local_taxi</span>
                  Cabs
                </Link>
                <Link
                  to="/holidays"
                  className="px-3.5 py-2 text-xs font-medium text-[#192524] hover:bg-[#f7f4ed] hover:text-[#0d6b63] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#0d6b63]">beach_access</span>
                  Holidays
                </Link>
              </div>
            )}
          </div>

          <Link
            to="/destinations"
            className={`px-2 lg:px-1 xl:px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              isActive('/destinations')
                ? 'text-[#0d3d3a] font-semibold bg-[#eae4d8]/60'
                : 'text-[#42504e] hover:text-[#0d3d3a] hover:bg-[#eae4d8]/40'
            }`}
          >
            Destinations
          </Link>

          <Link
            to="/offers"
            className={`px-2 lg:px-1 xl:px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              isActive('/offers')
                ? 'text-[#0d3d3a] font-semibold bg-[#eae4d8]/60'
                : 'text-[#42504e] hover:text-[#0d3d3a] hover:bg-[#eae4d8]/40'
            }`}
          >
            Offers
          </Link>

          <Link
            to="/bookings"
            className={`px-2 lg:px-1 xl:px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              isActive('/bookings')
                ? 'text-[#0d3d3a] font-semibold bg-[#eae4d8]/60'
                : 'text-[#42504e] hover:text-[#0d3d3a] hover:bg-[#eae4d8]/40'
            }`}
          >
            My Bookings
          </Link>

          <Link
            to="/refunds"
            className={`px-2 lg:px-1 xl:px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors flex items-center gap-1.5 ${
              isActive('/refunds') || location.pathname.startsWith('/refunds')
                ? 'text-[#0d3d3a] font-semibold bg-[#eae4d8]/60'
                : 'text-[#42504e] hover:text-[#0d3d3a] hover:bg-[#eae4d8]/40'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0d6b63]"></span>
            Refunds
          </Link>

          <Link
            to="/help"
            className={`px-2 lg:px-1 xl:px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              isActive('/help')
                ? 'text-[#0d3d3a] font-semibold bg-[#eae4d8]/60'
                : 'text-[#42504e] hover:text-[#0d3d3a] hover:bg-[#eae4d8]/40'
            }`}
          >
            Help
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser?.role === 'reviewer' && (
            <Link
              to="/reviewer"
              className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#0d6b63]/30 bg-[#e8f2f0] text-[#0d6b63] text-[11px] font-semibold hover:bg-[#0d6b63] hover:text-white transition-colors"
              title="Open internal staff reviewer console"
            >
              <span className="material-symbols-outlined text-[13px]">shield_person</span>
              Reviewer console
            </Link>
          )}

          {currentUser ? (
            <div className="flex items-center gap-2">
              <Link
                to="/account"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f2f0] border border-[#d0dfd3] hover:border-[#0d6b63] transition-colors"
                title={currentUser.email}
              >
                <span className="w-5 h-5 rounded-full bg-[#0d6b63] text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </span>
                <span className="text-xs font-semibold text-[#0d3d3a] hidden sm:inline max-w-[120px] truncate">
                  {currentUser.name}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[12px] font-medium text-[#6b7775] hover:text-[#991b1b] px-2 py-1 transition-colors"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/signin"
                className="hidden md:inline-flex text-[13px] font-medium text-[#42504e] hover:text-[#0d3d3a] px-2.5 py-1.5 rounded-md transition-colors"
              >
                Sign in
              </Link>

              <Link
                to="/signup"
                className="hidden md:inline-flex bg-[#0d6b63] text-white text-[13px] font-semibold px-4 py-1.5 rounded-md hover:bg-[#0a534d] transition-colors shadow-sm"
              >
                Sign up
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-md text-[#42504e] hover:text-[#0d3d3a] hover:bg-[#eae4d8]/60"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e3ded4] bg-[#f7f4ed] px-4 pt-2 pb-4 space-y-1 text-left">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-[#42504e] hover:bg-[#eae4d8]"
          >
            Explore
          </Link>
          <div className="pl-4 space-y-1">
            <Link
              to="/flights"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-1.5 rounded-md text-xs font-medium text-[#6b7775] hover:text-[#0d3d3a]"
            >
              • Flights
            </Link>
            <Link
              to="/hotels"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-1.5 rounded-md text-xs font-medium text-[#6b7775] hover:text-[#0d3d3a]"
            >
              • Hotels
            </Link>
            <Link
              to="/trains"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-1.5 rounded-md text-xs font-medium text-[#6b7775] hover:text-[#0d3d3a]"
            >
              • Trains
            </Link>
            <Link
              to="/buses"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-1.5 rounded-md text-xs font-medium text-[#6b7775] hover:text-[#0d3d3a]"
            >
              • Buses
            </Link>
            <Link
              to="/cabs"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-1.5 rounded-md text-xs font-medium text-[#6b7775] hover:text-[#0d3d3a]"
            >
              • Cabs
            </Link>
            <Link
              to="/holidays"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-1.5 rounded-md text-xs font-medium text-[#6b7775] hover:text-[#0d3d3a]"
            >
              • Holidays
            </Link>
          </div>
          <Link
            to="/destinations"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-[#42504e] hover:bg-[#eae4d8]"
          >
            Destinations
          </Link>
          <Link
            to="/offers"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-[#42504e] hover:bg-[#eae4d8]"
          >
            Offers
          </Link>
          <Link
            to="/bookings"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-[#42504e] hover:bg-[#eae4d8]"
          >
            My Bookings
          </Link>
          <Link
            to="/refunds"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-[#0d6b63] font-semibold hover:bg-[#eae4d8]"
          >
            Refund center
          </Link>
          <Link
            to="/help"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-[#42504e] hover:bg-[#eae4d8]"
          >
            Help
          </Link>
          <Link
            to="/account"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-[#42504e] hover:bg-[#eae4d8]"
          >
            Profile & settings
          </Link>
          {currentUser?.role === 'reviewer' && (
            <Link
              to="/reviewer"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-semibold text-[#0d6b63] bg-[#e8f2f0] mt-2"
            >
              Reviewer Console (Staff)
            </Link>
          )}

          {currentUser ? (
            <div className="pt-2 border-t border-[#e3ded4] flex items-center justify-between px-3 py-2 text-xs">
              <span className="font-semibold text-[#0d3d3a] truncate mr-2">
                {currentUser.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
                className="text-[#991b1b] font-bold shrink-0"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#e3ded4] flex items-center gap-2 px-3 py-2">
              <Link
                to="/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-1.5 text-center text-xs font-semibold text-[#0d3d3a] bg-white border border-[#e3ded4] rounded-md"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-1.5 text-center text-xs font-semibold text-white bg-[#0d6b63] rounded-md"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
