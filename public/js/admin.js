// admin.js — Admin panel logic
let adminPassword = '';

// Expose switchTab globally so inline onclick attributes in HTML can call it
// ── Admin Login ───────────────────────────────────────────────────────────────
document.getElementById('btn-admin-login').addEventListener('click', async () => {
  const pwd = document.getElementById('admin-pwd-input').value.trim();
  if (!pwd) { showToast('Enter the admin password', 'error'); return; }

  document.getElementById('admin-login-text').style.display    = 'none';
  document.getElementById('admin-login-spinner').style.display = 'inline-block';

  try {
    // Test credentials by calling a protected endpoint
    await apiAdmin('GET', '/admin/bookings', null, pwd);
    adminPassword = pwd;
    document.getElementById('admin-login-overlay').classList.remove('open');
    showToast('Welcome, Admin!', 'success');
    loadDashboard();
  } catch (err) {
    showToast(err.message || 'Invalid password', 'error');
  } finally {
    document.getElementById('admin-login-text').style.display    = 'inline';
    document.getElementById('admin-login-spinner').style.display = 'none';
  }
});

// Allow Enter key on password input
document.getElementById('admin-pwd-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-admin-login').click();
});

// ── Admin API Helper ──────────────────────────────────────────────────────────
const apiAdmin = async (method, path, body = null, pwd = null) => {
  const password = pwd || adminPassword;
  const headers  = { 'Content-Type': 'application/json', 'X-Admin-Password': password };
  const res = await fetch(`${API_BASE}/api${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};

// ── Load Dashboard ────────────────────────────────────────────────────────────
const loadDashboard = async () => {
  try {
    const [bookingsData, studentsData, seatsData] = await Promise.all([
      apiAdmin('GET', '/admin/bookings'),
      apiAdmin('GET', '/admin/students'),
      fetch(`${API_BASE}/api/seats`).then(r => r.json()),
    ]);

    document.getElementById('admin-stat-students').textContent = studentsData.totalStudents;
    document.getElementById('admin-stat-booked').textContent   = bookingsData.totalBookings;
    document.getElementById('admin-stat-available').textContent = seatsData.summary?.available ?? '—';

    renderBookings(bookingsData.bookings);
    renderStudents(studentsData.students);
  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
};

// ── Render Bookings Table ─────────────────────────────────────────────────────
const renderBookings = (bookings) => {
  const tbody = document.getElementById('bookings-tbody');
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">🪑</div><p>No bookings yet</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td><strong>#${b.seatNumber}</strong></td>
      <td><span class="badge badge-purple">${b.side}</span></td>
      <td>${b.bookedBy?.name || '—'}</td>
      <td style="color:var(--text-secondary);font-size:0.82rem;">${b.bookedBy?.email || '—'}</td>
      <td>${b.bookedBy?.rollNumber || '—'}</td>
      <td style="color:var(--text-secondary);font-size:0.82rem;">${b.bookedAt ? new Date(b.bookedAt).toLocaleString() : '—'}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.seatNumber})">Cancel</button>
      </td>
    </tr>
  `).join('');
};

const renderStudents = (students) => {
  const tbody = document.getElementById('students-tbody');
  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">👥</div><p>No students yet</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td style="color:var(--text-2);font-size:0.82rem;">${s.email}</td>
      <td>${s.rollNumber}</td>
      <td>
        <span class="badge ${s.isVerified ? 'badge-green' : 'badge-red'}">
          ${s.isVerified ? '✅ Verified' : '⏳ Pending'}
        </span>
      </td>
      <td>${s.bookedSeat ? `<span class="badge badge-indigo">Seat #${s.bookedSeat.seatNumber}</span>` : '<span style="color:var(--text-3)">None</span>'}</td>
      <td style="color:var(--text-2);font-size:0.82rem;">${new Date(s.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s._id}', '${s.name}')">🗑 Delete</button>
      </td>
    </tr>
  `).join('');
};

// ── Cancel Booking ────────────────────────────────────────────────────────────
const cancelBooking = async (seatNumber) => {
  if (!confirm(`Cancel booking for Seat #${seatNumber}?`)) return;
  try {
    const data = await apiAdmin('DELETE', `/admin/booking/${seatNumber}`);
    showToast(data.message, 'success');
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ── Delete Student Completely ─────────────────────────────────────────────────
const deleteStudent = async (studentId, studentName) => {
  if (!confirm(`Completely delete "${studentName}"?\n\nThis will:\n• Remove their seat booking\n• Delete their OTP records\n• Remove their registration\n\nThey will need to register again from scratch.`)) return;
  try {
    const data = await apiAdmin('DELETE', `/admin/student/${studentId}`);
    showToast(data.message, 'success');
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ── Reset All ─────────────────────────────────────────────────────────────────
document.getElementById('btn-reset-all').addEventListener('click', () => {
  document.getElementById('reset-modal').classList.add('open');
});
document.getElementById('btn-reset-cancel').addEventListener('click', () => {
  document.getElementById('reset-modal').classList.remove('open');
});
document.getElementById('btn-reset-confirm').addEventListener('click', async () => {
  document.getElementById('reset-text').style.display    = 'none';
  document.getElementById('reset-spinner').style.display = 'inline-block';
  document.getElementById('btn-reset-confirm').disabled  = true;
  try {
    const data = await apiAdmin('DELETE', '/admin/reset');
    document.getElementById('reset-modal').classList.remove('open');
    showToast(data.message, 'success');
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    document.getElementById('reset-text').style.display    = 'inline';
    document.getElementById('reset-spinner').style.display = 'none';
    document.getElementById('btn-reset-confirm').disabled  = false;
  }
});

// ── Tab Switching ─────────────────────────────────────────────────────────────
const switchTab = (tab) => {
  document.getElementById('panel-bookings').style.display = tab === 'bookings' ? 'block' : 'none';
  document.getElementById('panel-students').style.display = tab === 'students' ? 'block' : 'none';
  document.getElementById('tab-bookings').className = `btn btn-sm ${tab === 'bookings' ? 'btn-primary' : 'btn-ghost'}`;
  document.getElementById('tab-students').className  = `btn btn-sm ${tab === 'students'  ? 'btn-primary' : 'btn-ghost'}`;
};

// ── Expose functions called from inline onclick attributes in HTML ─────────────
window.switchTab     = switchTab;
window.cancelBooking = cancelBooking;
window.deleteStudent = deleteStudent;
