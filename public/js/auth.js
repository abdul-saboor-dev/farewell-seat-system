// auth.js — Device-first authentication with incognito support
// Returning devices → auto-login instantly (no form shown)
// Incognito / new browser → email + rollNumber → credentials login
// New users → name + email + rollNumber → create account → login
requireGuest();

// ── UI State Helpers ──────────────────────────────────────────────────────────
const showPanel = (id) => {
  ['panel-checking', 'panel-register'].forEach(p => {
    document.getElementById(p).style.display = p === id ? 'flex' : 'none';
  });
};

const setLoading = (loading) => {
  document.getElementById('login-btn-text').style.display = loading ? 'none' : 'inline';
  document.getElementById('login-spinner').style.display  = loading ? 'inline-block' : 'none';
  document.getElementById('btn-login').disabled = loading;
};

// ── Phase 1: Auto device check on page load ───────────────────────────────────
const runDeviceCheck = async () => {
  showPanel('panel-checking');

  try {
    // Send device ID only — auto-logins if device is known
    const data = await api('POST', '/auth/login', {});

    if (data.newDevice) {
      // Unknown device → show the form
      showPanel('panel-register');
      document.getElementById('inp-email').focus();
      return;
    }

    // Known device → auto-login complete
    setAuth(data.token, data.student);
    showToast(`Welcome back, ${data.student.name}! ✨`, 'success');
    setTimeout(() => { window.location.href = '/'; }, 1000);

  } catch (err) {
    showPanel('panel-register');
    showToast('Device check failed. Please enter your details.', 'info');
    document.getElementById('inp-email').focus();
  }
};

// ── Phase 2: Form submit ──────────────────────────────────────────────────────
document.getElementById('btn-login').addEventListener('click', async () => {
  const name       = document.getElementById('inp-name').value.trim();
  const email      = document.getElementById('inp-email').value.trim();
  const rollNumber = document.getElementById('inp-roll').value.trim();

  if (!name || !email || !rollNumber) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }

  setLoading(true);

  try {
    const data = await api('POST', '/auth/login', { name, email, rollNumber });

    setAuth(data.token, data.student);
    showToast('Account created! Redirecting...', 'success');
    setTimeout(() => { window.location.href = '/'; }, 1200);

  } catch (err) {
    if (err.message.includes('incognito') || err.message.includes('Security Alert')) {
      alert(err.message);
    } else {
      showToast(err.message, 'error');
    }
  } finally {
    setLoading(false);
  }
});

// ── Enter key submits form ────────────────────────────────────────────────────
['inp-name', 'inp-email', 'inp-roll'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-login').click();
  });
});

// ── Kick off device check on page load ───────────────────────────────────────
runDeviceCheck();
