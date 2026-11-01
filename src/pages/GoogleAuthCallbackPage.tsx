/**
 * src/pages/GoogleAuthCallbackPage.tsx
 * Handles Google OAuth redirect callbacks (both popup callback and direct redirect).
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const GoogleAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState('Completing Google authentication...');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function processCallback() {
      try {
        // Parse access_token or error from hash or query string
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(window.location.search);

        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        const error = hashParams.get('error') || searchParams.get('error');
        const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');

        // If in a popup, notify opener
        if (window.opener && window.opener !== window) {
          if (error) {
            window.opener.postMessage(
              {
                type: 'GOOGLE_AUTH_CALLBACK',
                error: errorDesc || error,
              },
              window.location.origin
            );
          } else if (accessToken) {
            window.opener.postMessage(
              {
                type: 'GOOGLE_AUTH_CALLBACK',
                accessToken,
              },
              window.location.origin
            );
          }
          window.close();
          return;
        }

        // Direct full-page redirect flow
        if (error) {
          setIsError(true);
          setStatusMessage(`Google Sign-In failed: ${errorDesc || error}`);
          return;
        }

        if (!accessToken) {
          setIsError(true);
          setStatusMessage('No authentication token received from Google.');
          return;
        }

        // Exchange with backend
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Backend failed to verify Google credentials');
        }

        const sessionPayload = {
          ...data.user,
          signedIn: true,
          token: data.token,
          timestamp: new Date().toISOString(),
        };

        sessionStorage.setItem('agent_travel_user', JSON.stringify(sessionPayload));
        sessionStorage.setItem('agent_travel_token', data.token);
        localStorage.setItem('agent_travel_user', JSON.stringify(sessionPayload));
        localStorage.setItem('agent_travel_token', data.token);

        if (data.user?.role === 'reviewer') {
          navigate('/reviewer');
        } else {
          navigate('/bookings');
        }
      } catch (err: any) {
        setIsError(true);
        setStatusMessage(err.message || 'Authentication error occurred.');
      }
    }

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e3ded4] p-8 shadow-sm space-y-4">
        {isError ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <h2 className="text-lg font-bold text-[#0d3d3a]">Authentication Failed</h2>
            <p className="text-xs text-[#5c6967]">{statusMessage}</p>
            <button
              onClick={() => navigate('/signin')}
              className="mt-4 px-4 py-2 bg-[#0d6b63] text-white text-xs font-semibold rounded-md hover:bg-[#0a534d]"
            >
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-3 border-[#0d6b63] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-base font-bold text-[#0d3d3a]">Signing you in with Google</h2>
            <p className="text-xs text-[#5c6967]">{statusMessage}</p>
          </>
        )}
      </div>
    </div>
  );
};
