// ── Toast System ─────────────────────────────────────────────────────────────
const showToast = (message, type = 'info', duration = 3500) => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// ── Device ID — One Account = One Device ─────────────────────────────────────
/**
 * Returns the persistent device fingerprint for this browser.
 * Generated ONCE using crypto.randomUUID() and stored in localStorage forever.
 * This ID is the primary identity key — never cleared, never changed.
 *
 * fss_device_id is intentionally excluded from clearAuth() so that
 * the device binding survives logout and token expiry.
 */
const getDeviceId = () => {
  const KEY = 'fss_device_id';
  let id = localStorage.getItem(KEY);

  if (!id) {
    // crypto.randomUUID() is supported in all modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+)
    // and is available on HTTPS origins (which both Railway and Vercel are).
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }

  return id;
};

// ── API Base URL ──────────────────────────────────────────────────────────────
const RAILWAY_URL = 'https://farewell-seat-system-production.up.railway.app';

const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const API_BASE = isLocal ? '' : RAILWAY_URL;

// ── API Helper ────────────────────────────────────────────────────────────────
// x-device-id is automatically sent on EVERY request — no manual passing needed.
const api = async (method, path, body = null, token = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-device-id': getDeviceId(),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('Invalid server response');
    }

    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }

    return data;

  } catch (err) {
    console.error('API Error:', err.message);
    throw err;
  }
};

// ── Auth Helpers ─────────────────────────────────────────────────────────────
const getToken   = () => localStorage.getItem('fss_token');
const getStudent = () => {
  try { return JSON.parse(localStorage.getItem('fss_student')) || null; }
  catch { return null; }
};

const setAuth = (token, student) => {
  localStorage.setItem('fss_token', token);
  localStorage.setItem('fss_student', JSON.stringify(student));
};

const clearAuth = () => {
  localStorage.removeItem('fss_token');
  localStorage.removeItem('fss_student');
  // ⚠️ DO NOT remove fss_device_id — the device binding must survive logout
};

const isLoggedIn = () => !!getToken();

// ── Route Guards ─────────────────────────────────────────────────────────────
const requireAuth = () => {
  if (!isLoggedIn()) window.location.href = '/login.html';
};

const requireGuest = () => {
  if (isLoggedIn()) window.location.href = '/';
};