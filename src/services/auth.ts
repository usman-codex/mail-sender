import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null =
  typeof window !== 'undefined' ? sessionStorage.getItem('gmail_oauth_token') : null;

export const isAuthOrSessionExpiredError = (error: any): boolean => {
  if (!error) return false;
  const msg = (typeof error === 'string' ? error : error.message || '').toLowerCase();
  return (
    msg.includes('401') ||
    msg.includes('authentication expired') ||
    msg.includes('unauthorized') ||
    msg.includes('token expired') ||
    msg.includes('invalid credentials') ||
    msg.includes('invalid_grant') ||
    msg.includes('re-authenticate') ||
    msg.includes('session expired')
  );
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (reason?: string) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const storedToken = cachedAccessToken || sessionStorage.getItem('gmail_oauth_token');
      const tokenExpiry = sessionStorage.getItem('gmail_oauth_token_expiry');
      const isExpired = tokenExpiry ? Date.now() > parseInt(tokenExpiry, 10) : false;

      if (storedToken && !isExpired) {
        cachedAccessToken = storedToken;
        if (onAuthSuccess) onAuthSuccess(user, storedToken);
      } else if (!isSigningIn) {
        // Token is missing or expired - trigger clean auto-logout
        await logout();
        if (onAuthFailure) onAuthFailure('Your session has expired. Please sign in with Google again.');
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('gmail_oauth_token');
        sessionStorage.removeItem('gmail_oauth_token_expiry');
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Workspace access token. Please re-authorize.');
    }

    cachedAccessToken = credential.accessToken;
    const expiresInMs = 3500 * 1000; // ~58 minutes
    const expiresAt = Date.now() + expiresInMs;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('gmail_oauth_token', credential.accessToken);
      sessionStorage.setItem('gmail_oauth_token_expiry', expiresAt.toString());
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  if (typeof window !== 'undefined') {
    const tokenExpiry = sessionStorage.getItem('gmail_oauth_token_expiry');
    if (tokenExpiry && Date.now() > parseInt(tokenExpiry, 10)) {
      return null;
    }
  }
  return cachedAccessToken || (typeof window !== 'undefined' ? sessionStorage.getItem('gmail_oauth_token') : null);
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('gmail_oauth_token', token);
      sessionStorage.setItem('gmail_oauth_token_expiry', (Date.now() + 3500 * 1000).toString());
    } else {
      sessionStorage.removeItem('gmail_oauth_token');
      sessionStorage.removeItem('gmail_oauth_token_expiry');
    }
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch {}
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('gmail_oauth_token');
    sessionStorage.removeItem('gmail_oauth_token_expiry');
  }
};
