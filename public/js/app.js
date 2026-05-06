// app.js — Redesigned seat map logic
let selectedSeatNumber = null;

const init = async () => {
  renderNavAuth();
  await loadSeats();
};

const renderNavAuth = () => {
  const student = getStudent();
  const navAuth = document.getElementById('nav-auth');
  const banner  = document.getElementById('user-banner');
  if (student) {
    navAuth.innerHTML = `<span style="font-size:0.82rem;color:var(--text-2)">👋 ${student.name.split(' ')[0]}</span>`;
    banner.style.display = 'flex';
    document.getElementById('user-avatar').textContent = student.name.charAt(0).toUpperCase();
    document.getElementById('user-name').textContent   = student.name;
    document.getElementById('user-roll').textContent   = student.rollNumber;
  } else {
    navAuth.innerHTML = `<a href="/login.html" class="btn btn-primary btn-sm">Login to Book</a>`;
    banner.style.display = 'none';
  }
};

const loadSeats = async () => {
  try {
    const data = await api('GET', '/seats');
    const all  = [...data.leftSeats, ...data.rightSeats];

    document.getElementById('stat-available').textContent = data.summary.available;
    document.getElementById('stat-booked').textContent    = data.summary.booked;

    renderCol('left-col',  data.leftSeats,  all);
    renderCol('right-col', data.rightSeats, all);

    // Update seat badge
    const student = getStudent();
    if (student) {
      const mine = all.find(s =>
        s.bookedBy &&
        (s.bookedBy._id?.toString() === student.id?.toString() ||
         s.bookedBy._id?.toString() === student._id?.toString())
      );
      if (mine) {
        document.getElementById('user-seat-badge').style.display = 'inline-flex';
        document.getElementById('user-seat-num').textContent = mine.seatNumber;
      }
    }
  } catch (err) {
    showToast('Failed to load seats: ' + err.message, 'error');
  }
};

const renderCol = (colId, seats, allSeats) => {
  const col     = document.getElementById(colId);
  const student = getStudent();
  col.innerHTML = '';

  seats.forEach(seat => {
    const isMine = student && seat.bookedBy &&
      (seat.bookedBy._id?.toString() === student.id?.toString() ||
       seat.bookedBy._id?.toString() === student._id?.toString());
    const isBooked   = seat.isBooked;
    const stateClass = isMine ? 'mine' : isBooked ? 'booked' : 'available';

    const btn = document.createElement('button');
    btn.className = `seat ${stateClass}`;
    btn.id = `seat-${seat.seatNumber}`;

    const icon = isMine ? '⭐' : isBooked ? '🔒' : '🪑';
    const statusText = isMine
      ? 'Your Seat'
      : isBooked
        ? (seat.bookedBy?.name || 'Taken')
        : 'Available';

    btn.innerHTML = `
      <span class="seat-num">${seat.seatNumber}</span>
      <span style="font-size:0.85rem">${icon}</span>
      <span class="seat-status">${statusText}</span>
    `;

    if (!isBooked && !isMine) {
      btn.title = `Click to book Seat #${seat.seatNumber}`;
      btn.addEventListener('click', () => onSeatClick(seat));
    } else {
      btn.disabled = isBooked && !isMine;
    }

    col.appendChild(btn);
  });
};

const onSeatClick = (seat) => {
  if (!isLoggedIn()) {
    showToast('Please login to book a seat', 'info');
    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    return;
  }
  const student = getStudent();
  if (student?.bookedSeat) {
    showToast('You already have a seat booked. Contact admin to cancel.', 'info');
    return;
  }
  selectedSeatNumber = seat.seatNumber;
  document.getElementById('confirm-modal-text').textContent =
    `Reserve Seat #${seat.seatNumber} (${seat.side} side) for the farewell?`;
  document.getElementById('confirm-modal').classList.add('open');
};

// Modal
document.getElementById('btn-modal-cancel').addEventListener('click', () => {
  document.getElementById('confirm-modal').classList.remove('open');
  selectedSeatNumber = null;
});
document.getElementById('confirm-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) {
    document.getElementById('confirm-modal').classList.remove('open');
    selectedSeatNumber = null;
  }
});
document.getElementById('btn-modal-confirm').addEventListener('click', async () => {
  if (!selectedSeatNumber) return;
  const ct = document.getElementById('confirm-text');
  const sp = document.getElementById('confirm-spinner');
  const bm = document.getElementById('btn-modal-confirm');
  ct.style.display = 'none'; sp.style.display = 'inline-block'; bm.disabled = true;
  try {
    const data    = await api('POST', '/seats/book', { seatNumber: selectedSeatNumber }, getToken());
    const student = getStudent();
    if (student) { student.bookedSeat = data.seat; localStorage.setItem('fss_student', JSON.stringify(student)); }
    document.getElementById('confirm-modal').classList.remove('open');
    showToast(data.message, 'success');
    await loadSeats();
    renderNavAuth();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    ct.style.display = 'inline'; sp.style.display = 'none'; bm.disabled = false;
    selectedSeatNumber = null;
  }
});

// Logout
document.getElementById('btn-logout')?.addEventListener('click', () => {
  clearAuth(); showToast('Logged out', 'info');
  setTimeout(() => window.location.reload(), 700);
});

// Refresh
document.getElementById('btn-refresh').addEventListener('click', async () => {
  document.getElementById('btn-refresh').textContent = '⏳';
  await loadSeats();
  document.getElementById('btn-refresh').textContent = '🔄 Refresh';
  showToast('Seats refreshed', 'info');
});

init();
