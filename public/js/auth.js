// auth.js — Single-step login (no OTP, device-bound auth)
requireGuest(); // redirect if already logged in

const setLoading = (btnTextId, spinnerId, loading) => {
  document.getElementById(btnTextId).style.display = loading ? 'none' : 'inline';
  document.getElementById(spinnerId).style.display = loading ? 'inline-block' : 'none';
};

// ── Login Form Submit ─────────────────────────────────────────────────────────
document.getElementById('btn-login').addEventListener('click', async () => {
  const name       = document.getElementById('inp-name').value.trim();
  const email      = document.getElementById('inp-email').value.trim();
  const rollNumber = document.getElementById('inp-roll').value.trim();

  // ── Client-side validation ──────────────────────────────────────────────
  if (!name || !email || !rollNumber) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }

  setLoading('login-btn-text', 'login-spinner', true);

  try {
    // Step 1 — ensure account exists (register is idempotent)
    await api('POST', '/auth/register', { name, email, rollNumber });

    // Step 2 — login with device binding (X-Device-ID sent automatically by api())
    const data = await api('POST', '/auth/login', { name, email, rollNumber });

    setAuth(data.token, data.student);
    showToast('Login successful! Redirecting...', 'success');
    setTimeout(() => { window.location.href = '/'; }, 1200);

  } catch (err) {
    // Surface the exact backend message (device mismatch, not found, etc.)
    showToast(err.message, 'error');
  } finally {
    setLoading('login-btn-text', 'login-spinner', false);
  }
});

// ── Enter key support ─────────────────────────────────────────────────────────
['inp-name', 'inp-email', 'inp-roll'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-login').click();
  });
});
