import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailOrPhone.trim(),
          password: password,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      const authData = data;

      const sessionPayload = {
        ...authData.user,
        signedIn: true,
        token: authData.token,
        timestamp: new Date().toISOString(),
      };

      sessionStorage.setItem('agent_travel_user', JSON.stringify(sessionPayload));
      sessionStorage.setItem('agent_travel_token', authData.token);

      if (keepSignedIn) {
        localStorage.setItem('agent_travel_user', JSON.stringify(sessionPayload));
        localStorage.setItem('agent_travel_token', authData.token);
      }

      // Role-based redirection: Reviewers go directly to /reviewer, travelers to /bookings
      if (authData.user.role === 'reviewer') {
        navigate('/reviewer');
      } else {
        navigate('/bookings');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <SiteHeader />

      <main className="flex-1 w-full site-container py-10 sm:py-14 text-left flex justify-center items-center">
        <div className="w-full max-w-5xl bg-white rounded-2xl border border-[#e3ded4] overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
          {/* Left Dark Teal Brand Column (Page 14) */}
          <div className="md:col-span-5 bg-[#0d3d3a] text-white p-8 sm:p-10 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#d0dfd3] bg-white/10 px-2.5 py-1 rounded inline-block">
                AI-Powered Refund Assistance
              </span>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Welcome back.
              </h1>

              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Manage your flights, hotels, trains, buses and cabs, and track your refund claims in one place.
              </p>
            </div>

            <div className="pt-6 border-t border-white/15">
              <p className="text-[11px] text-[#a4c7c3] leading-relaxed">
                Refund eligibility and amounts depend on your booking, applicable policies and provider decisions.
              </p>
            </div>
          </div>

          {/* Right Form Column (Page 14) */}
          <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-6">
            {/* Top Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-[#f0ebe1]">
              <div>
                <h2 className="text-xl font-bold text-[#0d3d3a]">
                  Sign in to your account
                </h2>
                <p className="text-xs text-[#6b7775] mt-0.5">
                  Use your email or phone number.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-[#f0ebe1] p-1 rounded-lg text-xs font-semibold">
                <span className="px-3 py-1 rounded bg-white text-[#0d3d3a] shadow-sm">
                  Sign in
                </span>
                <Link
                  to="/signup"
                  className="px-3 py-1 text-[#6b7775] hover:text-[#0d3d3a] transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#0d3d3a] block">
                  Email or phone number
                </label>
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  className="w-full border border-[#e3ded4] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#0d6b63]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="font-bold text-[#0d3d3a]">Password</label>
                  <a href="#forgot" className="text-[#0d6b63] font-semibold hover:underline">
                    Forgot password?
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#e3ded4] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#0d6b63]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="keepSignedIn"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-4 h-4 accent-[#0d6b63] cursor-pointer"
                />
                <label htmlFor="keepSignedIn" className="text-[#42504e] cursor-pointer">
                  Keep me signed in
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0d6b63] text-white py-2.5 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Verifying session...</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            {/* Social Logins */}
            <div className="space-y-3 pt-2">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-[#e3ded4] w-full"></div>
                <span className="bg-white px-3 text-[11px] text-[#889593] absolute">
                  or continue with
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/bookings')}
                  className="border border-[#e3ded4] rounded-md py-2 px-3 text-xs font-semibold text-[#0d3d3a] hover:bg-[#fbf9f4] transition-colors flex items-center justify-center gap-2"
                >
                  <span className="font-bold text-red-500">G</span> Google
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/bookings')}
                  className="border border-[#e3ded4] rounded-md py-2 px-3 text-xs font-semibold text-[#0d3d3a] hover:bg-[#fbf9f4] transition-colors flex items-center justify-center gap-2"
                >
                  <span className="font-bold text-blue-500">M</span> Microsoft
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-[#6b7775] pt-2">
              New to Agent Travel?{' '}
              <Link to="/signup" className="text-[#0d6b63] font-bold hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};
