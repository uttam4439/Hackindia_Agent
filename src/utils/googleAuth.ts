/**
 * src/utils/googleAuth.ts
 * Google OAuth 2.0 / Google Identity Services (GIS) Client Integration.
 * 
 * Implements official Google Account Chooser with prompt: "select_account"
 * to allow users to pick from multiple signed-in accounts or select "Use another account".
 * Integrates with existing Agent Travel session management and persistent user store.
 */

export interface GoogleAuthUser {
  id: string;
  email: string;
  name: string;
  role: 'traveler' | 'reviewer' | 'admin';
  phone?: string;
  picture?: string;
}

export interface GoogleAuthResult {
  success: boolean;
  token: string;
  user: GoogleAuthUser;
  isNewUser?: boolean;
}

let cachedClientId: string | null = null;

/**
 * Resolves the Google OAuth Client ID from Vite environment or backend endpoint.
 */
export async function getGoogleClientId(): Promise<string> {
  if (cachedClientId) {
    return cachedClientId;
  }

  // 1. Check Vite frontend environment variable
  const envId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID?.trim();
  if (envId) {
    cachedClientId = envId;
    return envId;
  }

  // 2. Query backend configuration endpoint (/api/config/auth)
  try {
    const res = await fetch('/api/config/auth');
    if (res.ok) {
      const data = await res.json();
      if (data.googleClientId && typeof data.googleClientId === 'string') {
        const id = data.googleClientId.trim();
        if (id) {
          cachedClientId = id;
          return id;
        }
      }
    }
  } catch (err) {
    console.warn('[GOOGLE AUTH] Failed to retrieve Google Client ID from backend:', err);
  }

  return '';
}

/**
 * Ensures Google Identity Services (GIS) SDK script is loaded and initialized.
 */
export async function loadGoogleIdentityScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Already initialized in window
  if ((window as any).google?.accounts?.oauth2) {
    return true;
  }

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      if ((window as any).google?.accounts?.oauth2) {
        return resolve(true);
      }
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      // Safety timeout
      setTimeout(() => resolve(!!(window as any).google?.accounts?.oauth2), 2500);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);

    // Safety timeout
    setTimeout(() => resolve(!!(window as any).google?.accounts?.oauth2), 3000);
  });
}

/**
 * Initiates the official Google OAuth account selection flow.
 * - Opens official Google OAuth account chooser modal / popup.
 * - Forces prompt: "select_account" so user sees account list and "Use another account".
 * - Transmits verified access token to backend for cryptographic verification and session creation.
 */
export async function triggerGoogleSignIn({
  onStart,
  onSuccess,
  onError,
  keepSignedIn = true,
}: {
  onStart?: () => void;
  onSuccess: (result: GoogleAuthResult) => void;
  onError: (errorMessage: string) => void;
  keepSignedIn?: boolean;
}): Promise<void> {
  try {
    onStart?.();

    // 1. Resolve Client ID
    const clientId = await getGoogleClientId();
    if (!clientId) {
      onError(
        'Google Sign-In is not configured. Please configure VITE_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID in your .env file.'
      );
      return;
    }

    // 2. Ensure Google Identity Services SDK is ready
    const isLoaded = await loadGoogleIdentityScript();
    if (!isLoaded || !(window as any).google?.accounts?.oauth2) {
      // Fallback: If GIS script blocked, open standard OAuth popup
      openOAuthPopupFallback(clientId, onSuccess, onError, keepSignedIn);
      return;
    }

    // 3. Initialize Google Identity Services OAuth 2.0 Token Client with prompt: "select_account"
    const google = (window as any).google;
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: async (tokenResponse: any) => {
        if (!tokenResponse) {
          onError('Google authentication was cancelled.');
          return;
        }

        if (tokenResponse.error) {
          if (tokenResponse.error === 'access_denied') {
            onError('Google account selection was cancelled by the user.');
          } else if (tokenResponse.error === 'popup_closed_by_user') {
            onError('Google Sign-In window was closed before completing authentication.');
          } else {
            onError(`Google Sign-In error: ${tokenResponse.error_description || tokenResponse.error}`);
          }
          return;
        }

        if (!tokenResponse.access_token) {
          onError('No access token returned from Google.');
          return;
        }

        // 4. Verify token with backend
        await exchangeTokenWithBackend(tokenResponse.access_token, keepSignedIn, onSuccess, onError);
      },
      error_callback: (error: any) => {
        if (error.type === 'popup_closed') {
          onError('Google Sign-In window was closed before selecting an account.');
        } else if (error.type === 'popup_failed_to_open') {
          onError(
            'Google Sign-In popup was blocked by your browser. Please allow popups for localhost or this site.'
          );
        } else {
          onError(`Google Sign-In error: ${error.message || error.type || 'Authentication failed'}`);
        }
      },
    });

    // 4. Request Access Token with prompt: "select_account"
    client.requestAccessToken({ prompt: 'select_account' });
  } catch (err: any) {
    console.error('[GOOGLE AUTH] Failed to trigger Google sign-in:', err);
    onError(err.message || 'An unexpected error occurred while launching Google Sign-In.');
  }
}

/**
 * Exchanges Google access token with Agent Travel backend /api/auth/google,
 * persists the session, and triggers onSuccess callback.
 */
async function exchangeTokenWithBackend(
  accessToken: string,
  keepSignedIn: boolean,
  onSuccess: (result: GoogleAuthResult) => void,
  onError: (errorMessage: string) => void
) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Backend failed to verify Google authentication credentials.');
    }

    const sessionPayload = {
      ...data.user,
      signedIn: true,
      token: data.token,
      timestamp: new Date().toISOString(),
    };

    // Store in session storage
    sessionStorage.setItem('agent_travel_user', JSON.stringify(sessionPayload));
    sessionStorage.setItem('agent_travel_token', data.token);

    // Store in local storage if requested
    if (keepSignedIn) {
      localStorage.setItem('agent_travel_user', JSON.stringify(sessionPayload));
      localStorage.setItem('agent_travel_token', data.token);
    }

    onSuccess(data);
  } catch (err: any) {
    onError(err.message || 'Failed to complete authentication with backend.');
  }
}

/**
 * Fallback popup handler if GIS client script fails to load.
 * Opens Google's standard OAuth2 authorization endpoint with prompt=select_account.
 */
function openOAuthPopupFallback(
  clientId: string,
  onSuccess: (result: GoogleAuthResult) => void,
  onError: (errorMessage: string) => void,
  keepSignedIn: boolean
) {
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  oauthUrl.searchParams.set('client_id', clientId);
  oauthUrl.searchParams.set('redirect_uri', redirectUri);
  oauthUrl.searchParams.set('response_type', 'token');
  oauthUrl.searchParams.set('scope', 'openid email profile');
  oauthUrl.searchParams.set('prompt', 'select_account');

  const width = 500;
  const height = 650;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popup = window.open(
    oauthUrl.toString(),
    'google_oauth_popup',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,status=no`
  );

  if (!popup) {
    onError('Google Sign-In popup was blocked. Please allow popups for this site.');
    return;
  }

  // Listen for message from popup redirect
  const handleMessage = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === 'GOOGLE_AUTH_CALLBACK') {
      window.removeEventListener('message', handleMessage);
      if (event.data.error) {
        onError(event.data.error);
      } else if (event.data.accessToken) {
        await exchangeTokenWithBackend(event.data.accessToken, keepSignedIn, onSuccess, onError);
      }
    }
  };

  window.addEventListener('message', handleMessage);
}
