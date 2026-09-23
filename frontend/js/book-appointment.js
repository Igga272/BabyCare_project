let babiesCache = [];
let doctorsCache = [];

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  document.getElementById('bookingForm').addEventListener('submit', handleReview);
  document.getElementById('confirmBookBtn').addEventListener('click', handleConfirmBooking);
  document.getElementById('doctorSelect').addEventListener('change', updateAvailability);
  document.getElementById('appointmentDate').addEventListener('change', updateAvailability);

  loadBabies();
  loadDoctors();
});

async function loadBabies() {
  try {
    const result = await apiRequest('/babies');
    babiesCache = result.data;
    const select = document.getElementById('babySelect');

    if (babiesCache.length === 0) {
      select.innerHTML = '<option value="">No babies yet — add one first</option>';
      return;
    }

    select.innerHTML = babiesCache
      .map((b) => `<option value="${b.id}">${b.full_name}</option>`)
      .join('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function loadDoctors() {
  try {
    const result = await apiRequest('/doctors');
    doctorsCache = result.data;
    const select = document.getElementById('doctorSelect');

    if (doctorsCache.length === 0) {
      select.innerHTML = '<option value="">No doctors available</option>';
      return;
    }

    select.innerHTML = doctorsCache
      .map((d) => `<option value="${d.id}">${d.full_name}${d.specialization ? ' — ' + d.specialization : ''}</option>`)
      .join('');

    updateAvailability();
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateTimeSlots(startTime, endTime) {
  const slots = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const label = `${displayH}:${String(m).padStart(2, '0')} ${period}`;
    slots.push({ value, label });
    current += 30;
  }

  return slots;
}

function updateAvailability() {
  const doctorId = document.getElementById('doctorSelect').value;
  const dateStr = document.getElementById('appointmentDate').value;
  const timeSelect = document.getElementById('appointmentTime');
  const noteEl = document.getElementById('availabilityNote');

  const doctor = doctorsCache.find((d) => String(d.id) === String(doctorId));

  if (!doctor) {
    timeSelect.innerHTML = '<option value="">Select a doctor first</option>';
    noteEl.textContent = '';
    return;
  }

  const days = doctor.available_days ? doctor.available_days.split(',') : [];
  const daysLabel = days.length > 0 ? days.join(', ') : 'Not set';
  const timeLabel = (doctor.available_time_start && doctor.available_time_end)
    ? `${doctor.available_time_start.slice(0,5)} – ${doctor.available_time_end.slice(0,5)}`
    : 'Not set';
  noteEl.textContent = `${doctor.full_name} is available: ${daysLabel} · ${timeLabel}`;

  if (!doctor.available_time_start || !doctor.available_time_end) {
    timeSelect.innerHTML = '<option value="">No available time set for this doctor</option>';
    return;
  }

  if (dateStr) {
    const selectedDay = DAY_NAMES[new Date(dateStr + 'T00:00:00').getDay()];
    if (days.length > 0 && !days.includes(selectedDay)) {
      noteEl.innerHTML = `<span style="color:#DE7A7A;"><i data-lucide="triangle-alert" style="width:16px;height:16px;vertical-align:-3px;"></i> ${doctor.full_name} is not available on ${selectedDay}s. Available: ${daysLabel}</span>`;
    }
  }

  const slots = generateTimeSlots(doctor.available_time_start.slice(0,5), doctor.available_time_end.slice(0,5));
  timeSelect.innerHTML = slots.map((s) => `<option value="${s.value}">${s.label}</option>`).join('');
}

function handleReview(e) {
  e.preventDefault();
  clearAlert('pageAlert');

  const babyId = document.getElementById('babySelect').value;
  const doctorId = document.getElementById('doctorSelect').value;
  const date = document.getElementById('appointmentDate').value;
  const time = document.getElementById('appointmentTime').value;
  const reason = document.getElementById('reasonSelect').value;

  const baby = babiesCache.find((b) => String(b.id) === String(babyId));
  const doctor = doctorsCache.find((d) => String(d.id) === String(doctorId));
  const timeLabel = document.getElementById('appointmentTime').selectedOptions[0]?.textContent || time;

  document.getElementById('confirmBaby').textContent = baby ? baby.full_name : '—';
  document.getElementById('confirmDoctor').textContent = doctor ? doctor.full_name : '—';
  document.getElementById('confirmDate').textContent = formatDate(date);
  document.getElementById('confirmTime').textContent = timeLabel;
  document.getElementById('confirmReason').textContent = reason;

  clearAlert('confirmModalAlert');
  new bootstrap.Modal(document.getElementById('confirmModal')).show();
}

async function handleConfirmBooking() {
  const payload = {
    baby_id: document.getElementById('babySelect').value,
    doctor_id: document.getElementById('doctorSelect').value,
    appointment_date: document.getElementById('appointmentDate').value,
    appointment_time: document.getElementById('appointmentTime').value,
    reason: document.getElementById('reasonSelect').value,
    notes: document.getElementById('notes').value.trim()
  };

  const btn = document.getElementById('confirmBookBtn');
  btn.disabled = true;
  btn.textContent = 'Booking…';

  try {
    await apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
    showAlert('pageAlert', 'Appointment booked! It is now pending confirmation by the Pediatrics Department.', 'success');
    document.getElementById('bookingForm').reset();
  } catch (err) {
    showAlert('confirmModalAlert', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Booking';
  }
}