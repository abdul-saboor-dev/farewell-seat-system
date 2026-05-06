// ── Toast System ─────────────────────────────────────────────────────────────
const showToast = (message, type = 'info', duration = 3500) => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  toast.innerHTML = `
    <span>${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// ── API Base URL (FIXED + SAFE) ───────────────────────────────────────────────

// 🔥 IMPORTANT: ONLY correct Railway backend
const RAILWAY_URL = 'https://farewell-seat-system-production.up.railway.app';

// Decide environment safely
const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

// Final base URL
const API_BASE = isLocal ? '' : RAILWAY_URL;

// ── API Helper (FIXED STRUCTURE) ─────────────────────────────────────────────
const api = async (method, path, body = null, token = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}/api${path}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
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
const getToken = () => localStorage.getItem('fss_token');

const getStudent = () => {
  try {
    return JSON.parse(localStorage.getItem('fss_student')) || null;
  } catch {
    return null;
  }
};

const setAuth = (token, student) => {
  localStorage.setItem('fss_token', token);
  localStorage.setItem('fss_student', JSON.stringify(student));
};

const clearAuth = () => {
  localStorage.removeItem('fss_token');
  localStorage.removeItem('fss_student');
};

const isLoggedIn = () => !!getToken();

// ── Route Guards ─────────────────────────────────────────────────────────────
const requireAuth = () => {
  if (!isLoggedIn()) {
    window.location.href = '/login.html';
  }
};

const requireGuest = () => {
  if (isLoggedIn()) {
    window.location.href = '/';
  }
};