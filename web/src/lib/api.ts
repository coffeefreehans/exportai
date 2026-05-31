'use client';

/**
 * API client for ExportAI backend.
 *
 * When NEXT_PUBLIC_API_URL is set, requests go directly to the backend.
 * When empty (Docker/proxy mode), requests use relative /api/* paths
 * which are proxied to the backend via Next.js rewrites.
 */

const API_BASE = '';

interface ApiResponse<T> {
  code: number;
  data: T | null;
  message: string;
}

interface AuthData {
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
}

interface MembershipData {
  id: string | null;
  planType: string | null;
  status: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  isMember: boolean;
}

/**
 * Make an API request with automatic token refresh on 401.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const accessToken = localStorage.getItem('exportai_access_token');
  const refreshToken = localStorage.getItem('exportai_refresh_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (response.status === 401 && refreshToken) {
    const refreshResult = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshResult.ok) {
      const refreshData: ApiResponse<TokenData> = await refreshResult.json();
      if (refreshData.data) {
        localStorage.setItem('exportai_access_token', refreshData.data.accessToken);
        localStorage.setItem('exportai_refresh_token', refreshData.data.refreshToken);

        // Retry original request with new token
        headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
        response = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
        });
      }
    } else {
      // Refresh failed, clear tokens
      localStorage.removeItem('exportai_access_token');
      localStorage.removeItem('exportai_refresh_token');
      localStorage.removeItem('exportai_user_info');
      localStorage.removeItem('exportai_membership');
      window.location.href = '/login';
    }
  }

  const data = await response.json();
  return data;
}

/**
 * Sync auth tokens to chrome.storage so extension popup can read them.
 */
function syncToChromeStorage() {
  try {
    const c = (window as any).chrome;
    if (c?.storage?.local) {
      const obj: Record<string, string> = {};
      const at = localStorage.getItem('exportai_access_token');
      const rt = localStorage.getItem('exportai_refresh_token');
      const ui = localStorage.getItem('exportai_user_info');
      if (at) obj.exportai_access_token = at;
      if (rt) obj.exportai_refresh_token = rt;
      if (ui) obj.exportai_user_info = ui;
      if (Object.keys(obj).length) {
        c.storage.local.remove(['exportai_auth_logout_at']);
        c.storage.local.set(obj);
      }
    }
  } catch (_) {}
}

function clearChromeStorage() {
  try {
    const c = (window as any).chrome;
    if (c?.storage?.local) {
      c.storage.local.set({ exportai_auth_logout_at: new Date().toISOString() });
      c.storage.local.remove(['exportai_access_token', 'exportai_refresh_token', 'exportai_user_info', 'exportai_membership']);
    }
  } catch (_) {}
}

function syncMembershipToChromeStorage(membership: unknown) {
  try {
    localStorage.setItem('exportai_membership', JSON.stringify(membership || { isMember: false }));
    const c = (window as any).chrome;
    if (c?.storage?.local) {
      c.storage.local.set({ exportai_membership: membership || { isMember: false } });
    }
  } catch (_) {}
}

/**
 * Register a new user.
 */
export async function register(email: string, password: string): Promise<ApiResponse<AuthData>> {
  const result = await apiRequest<AuthData>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.data) {
    localStorage.setItem('exportai_access_token', result.data.accessToken);
    localStorage.setItem('exportai_refresh_token', result.data.refreshToken);
    localStorage.setItem('exportai_user_info', JSON.stringify(result.data.user));
    syncToChromeStorage();
  }

  return result;
}

/**
 * Login with email and password.
 */
export async function login(email: string, password: string): Promise<ApiResponse<AuthData>> {
  const result = await apiRequest<AuthData>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.data) {
    localStorage.setItem('exportai_access_token', result.data.accessToken);
    localStorage.setItem('exportai_refresh_token', result.data.refreshToken);
    localStorage.setItem('exportai_user_info', JSON.stringify(result.data.user));
    syncToChromeStorage();
  }

  return result;
}

/**
 * Logout the current user.
 */
export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('exportai_refresh_token');
  if (refreshToken) {
    await apiRequest('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }
  localStorage.removeItem('exportai_access_token');
  localStorage.removeItem('exportai_refresh_token');
  localStorage.removeItem('exportai_user_info');
  localStorage.removeItem('exportai_membership');
  clearChromeStorage();
}

/**
 * Request password reset email.
 */
export async function forgotPassword(email: string): Promise<ApiResponse<null>> {
  return apiRequest<null>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Reset password with token.
 */
export async function resetPassword(token: string, password: string): Promise<ApiResponse<null>> {
  return apiRequest<null>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

/**
 * Get current user info.
 */
export async function getMe(): Promise<ApiResponse<{ id: string; email: string; isActive: boolean; createdAt: string }>> {
  return apiRequest('/api/auth/me', {
    method: 'GET',
  });
}

/**
 * Check if user is logged in.
 */
export function isLoggedIn(): boolean {
  return !!localStorage.getItem('exportai_access_token');
}

/**
 * Get stored user info.
 */
export function getStoredUser(): { id: string; email: string; createdAt: string } | null {
  const stored = localStorage.getItem('exportai_user_info');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Get current user's membership status.
 */
export async function getMembership(): Promise<ApiResponse<{
  id: string | null;
  planType: string | null;
  status: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  isMember: boolean;
}>> {
  const result = await apiRequest<{
    id: string | null;
    planType: string | null;
    status: string | null;
    expiresAt: string | null;
    cancelledAt: string | null;
    isMember: boolean;
  }>('/api/membership', {
    method: 'GET',
  });
  if (result.data) {
    syncMembershipToChromeStorage(result.data);
  }
  return result;
}

/**
 * Verify a successful Stripe Checkout Session and sync membership status.
 */
export async function syncCheckoutSession(sessionId: string): Promise<ApiResponse<MembershipData>> {
  const result = await apiRequest<MembershipData>('/api/membership/sync-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
  if (result.data) {
    syncMembershipToChromeStorage(result.data);
  }
  return result;
}

/**
 * Create a Stripe Checkout session for a plan.
 */
export async function createCheckout(planType: string): Promise<ApiResponse<{
  sessionId: string;
  url: string;
}>> {
  return apiRequest('/api/membership/checkout', {
    method: 'POST',
    body: JSON.stringify({ planType }),
  });
}

/**
 * Create a Stripe billing portal session.
 */
export async function createPortalSession(): Promise<ApiResponse<{
  url: string;
}>> {
  return apiRequest('/api/membership/portal', {
    method: 'GET',
  });
}
