// ── Toast System ─────────────────────────────────────────────────────────────
const showToast = (message, type = 'info', duration = 3500) => {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 280);
  }, duration);
};

// ── API Helper ────────────────────────────────────────────────────────────────
const api = async (method, path, body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};

// ── Auth Helpers ──────────────────────────────────────────────────────────────
const getToken   = () => localStorage.getItem('fss_token');
const getStudent = () => JSON.parse(localStorage.getItem('fss_student') || 'null');
const setAuth    = (token, student) => {
  localStorage.setItem('fss_token', token);
  localStorage.setItem('fss_student', JSON.stringify(student));
};
const clearAuth  = () => {
  localStorage.removeItem('fss_token');
  localStorage.removeItem('fss_student');
};
const isLoggedIn = () => !!getToken();

// Redirect guards
const requireAuth = () => { if (!isLoggedIn()) { window.location.href = '/login.html'; } };
const requireGuest = () => { if (isLoggedIn()) { window.location.href = '/'; } };
