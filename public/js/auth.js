// auth.js — Login page logic (Step 1: Register, Step 2: OTP Verify)
requireGuest(); // redirect if already logged in

let currentEmail = '';
let timerInterval = null;

const showStep = (step) => {
  document.querySelectorAll('.auth-step').forEach(el => el.classList.remove('active'));
  document.getElementById(`step-${step}`).classList.add('active');
};

const setLoading = (btnTextId, spinnerId, loading) => {
  document.getElementById(btnTextId).style.display = loading ? 'none' : 'inline';
  document.getElementById(spinnerId).style.display  = loading ? 'inline-block' : 'none';
};

// ── OTP Digit Navigation ──────────────────────────────────────────────────────
document.querySelectorAll('.otp-digit').forEach((input, idx, inputs) => {
  input.addEventListener('input', (e) => {
    const val = e.target.value.replace(/\D/g, '');
    e.target.value = val;
    e.target.classList.toggle('filled', val.length > 0);
    if (val && idx < 5) inputs[idx + 1].focus();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !e.target.value && idx > 0) inputs[idx - 1].focus();
  });
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    [...pasted].forEach((char, i) => {
      if (inputs[i]) { inputs[i].value = char; inputs[i].classList.add('filled'); }
    });
    if (inputs[Math.min(pasted.length, 5)]) inputs[Math.min(pasted.length, 5)].focus();
  });
});

const getOTPValue = () =>
  Array.from(document.querySelectorAll('.otp-digit')).map(i => i.value).join('');

const clearOTP = () =>
  document.querySelectorAll('.otp-digit').forEach(i => { i.value = ''; i.classList.remove('filled'); });

// ── Countdown Timer ───────────────────────────────────────────────────────────
const startTimer = (seconds = 300) => {
  clearInterval(timerInterval);
  const el = document.getElementById('timer-count');
  let remaining = seconds;
  const tick = () => {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    if (remaining <= 0) { clearInterval(timerInterval); el.textContent = 'Expired'; }
    remaining--;
  };
  tick();
  timerInterval = setInterval(tick, 1000);
};

// ── Step 1: Send OTP ──────────────────────────────────────────────────────────
document.getElementById('btn-send-otp').addEventListener('click', async () => {
  const name       = document.getElementById('inp-name').value.trim();
  const email      = document.getElementById('inp-email').value.trim();
  const rollNumber = document.getElementById('inp-roll').value.trim();

  if (!name || !email || !rollNumber) {
    showToast('Please fill in all fields', 'error'); return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    showToast('Please enter a valid email address', 'error'); return;
  }

  setLoading('send-otp-text', 'send-otp-spinner', true);
  try {
    await api('POST', '/auth/register', { name, email, rollNumber });
    currentEmail = email;
    document.getElementById('otp-email-display').textContent = email;
    clearOTP();
    startTimer(300);
    showStep('otp');
    document.getElementById('otp-0').focus();
    showToast('OTP sent! Check your email.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading('send-otp-text', 'send-otp-spinner', false);
  }
});

// ── Step 2: Verify OTP ────────────────────────────────────────────────────────
document.getElementById('btn-verify-otp').addEventListener('click', async () => {
  const otp = getOTPValue();
  if (otp.length !== 6) { showToast('Enter the complete 6-digit OTP', 'error'); return; }

  setLoading('verify-otp-text', 'verify-otp-spinner', true);
  try {
    const data = await api('POST', '/auth/verify-otp', { email: currentEmail, otp });
    setAuth(data.token, data.student);
    clearInterval(timerInterval);
    showToast('Login successful! Redirecting...', 'success');
    setTimeout(() => { window.location.href = '/'; }, 1200);
  } catch (err) {
    showToast(err.message, 'error');
    clearOTP();
    document.getElementById('otp-0').focus();
  } finally {
    setLoading('verify-otp-text', 'verify-otp-spinner', false);
  }
});

// ── Resend OTP ────────────────────────────────────────────────────────────────
document.getElementById('btn-resend-otp').addEventListener('click', async () => {
  if (!currentEmail) return;
  try {
    await api('POST', '/auth/resend-otp', { email: currentEmail });
    clearOTP();
    startTimer(300);
    document.getElementById('otp-0').focus();
    showToast('New OTP sent!', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ── Back Button ───────────────────────────────────────────────────────────────
document.getElementById('btn-back-to-register').addEventListener('click', (e) => {
  e.preventDefault();
  clearInterval(timerInterval);
  showStep('register');
});
