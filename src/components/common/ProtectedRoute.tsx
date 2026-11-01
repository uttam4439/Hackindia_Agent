import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { SiteHeader } from '../layout/SiteHeader';
import { SiteFooter } from '../layout/SiteFooter';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireReviewer?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireReviewer = false }) => {
  const location = useLocation();

  // Retrieve user session from sessionStorage or localStorage
  const getUser = () => {
    try {
      const sessionUser = sessionStorage.getItem('agent_travel_user');
      if (sessionUser) return JSON.parse(sessionUser);
      const localUser = localStorage.getItem('agent_travel_user');
      if (localUser) return JSON.parse(localUser);
    } catch {}
    return null;
  };

  const currentUser = getUser();

  // 1. Unauthenticated: Redirect to /signin
  if (!currentUser || !currentUser.signedIn) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  // 2. Requires Reviewer Privileges: Check role
  if (requireReviewer && currentUser.role !== 'reviewer') {
    return (
      <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
        <SiteHeader />
        <main className="flex-1 w-full site-container py-14 flex items-center justify-center text-left">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#e3ded4] p-8 sm:p-10 shadow-sm space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#fee2e2] text-[#991b1b] flex items-center justify-center mx-auto text-2xl font-bold">
              <span className="material-symbols-outlined text-[32px]">shield_lock</span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#b45309] uppercase tracking-wider bg-[#fffbeb] px-3 py-1 rounded-full border border-[#fde68a]">
                Internal Staff Security
              </span>
              <h1 className="text-2xl font-bold text-[#0d3d3a] tracking-tight">
                Reviewer Access Restricted
              </h1>
              <p className="text-xs sm:text-sm text-[#5c6967] leading-relaxed">
                This console is reserved for authorized Agent Travel claims adjudicators and fraud auditors.
                Your current account (<strong>{currentUser.email}</strong>) has the <strong>{currentUser.role || 'traveler'}</strong> role.
              </p>
            </div>

            <div className="p-3 bg-[#fbf9f4] border border-[#e3ded4] rounded-lg text-xs text-[#5c6967] text-left space-y-1">
              <div className="font-semibold text-[#0d3d3a]">Need staff access?</div>
              <div>Sign in using authorized staff reviewer credentials provisioned by your system administrator.</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/"
                className="flex-1 py-2.5 px-4 rounded-md text-xs font-semibold text-[#0d3d3a] bg-white border border-[#e3ded4] hover:bg-[#fbf9f4] transition-colors"
              >
                Return to Traveller View
              </Link>
              <Link
                to="/signin"
                className="flex-1 py-2.5 px-4 rounded-md text-xs font-semibold text-white bg-[#0d6b63] hover:bg-[#0a534d] transition-colors shadow-sm"
              >
                Switch Account
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
