let medScheduleTimes = [];

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  document.getElementById('checkupForm').addEventListener('submit', handleAddCheckup);
  document.getElementById('growthForm').addEventListener('submit', handleAddGrowth);
  document.getElementById('testForm').addEventListener('submit', handleAddTest);
  document.getElementById('medForm').addEventListener('submit', handleAddMed);

  loadAppointments();
});

const STATUS_MAP = {
  pending: { label: 'Pending', className: 'status-pending-figma' },
  confirmed: { label: 'Confirmed', className: 'status-confirmed-figma' },
  completed: { label: 'Completed', className: 'status-completed-figma' },
  cancelled: { label: 'Cancelled', className: 'status-cancelled-figma' }
};

async function loadAppointments() {
  try {
    const result = await apiRequest('/clinic-staff/appointments');
    const appointments = result.data;

    if (appointments.length === 0) {
      document.getElementById('emptyState').classList.remove('d-none');
      document.getElementById('listContent').classList.add('d-none');
      return;
    }

    document.getElementById('emptyState').classList.add('d-none');
    document.getElementById('listContent').classList.remove('d-none');

    const tbody = document.getElementById('apptTableBody');
    tbody.innerHTML = appointments.map((a) => {
      const status = STATUS_MAP[a.status] || { label: a.status, className: 'status-pending-figma' };

      let actions = '';
      if (a.status === 'pending') {
        actions = `
          <button class="btn btn-sm btn-outline-primary me-1" onclick="setStatus(${a.id}, 'confirmed')">Confirm</button>
          <button class="btn btn-sm btn-soft-danger" onclick="setStatus(${a.id}, 'cancelled')">Cancel</button>
        `;
      } else if (a.status === 'confirmed') {
        actions = `
          <button class="btn btn-sm btn-outline-primary me-1" onclick="setStatus(${a.id}, 'completed')">Mark Completed</button>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="openVaccineModal(${a.baby_id}, '${(a.babies?.full_name || '').replace(/'/g, "\\'")}')">Vaccines</button>
          <button class="btn btn-sm btn-soft-danger" onclick="setStatus(${a.id}, 'cancelled')">Cancel</button>
        `;
      } else if (a.status === 'completed') {
        actions = `
          <button class="btn btn-sm btn-outline-primary me-1" onclick="openCheckupModal(${a.baby_id}, ${a.id}, ${a.doctor_id}, '${(a.babies?.full_name || '').replace(/'/g, "\\'")}')">Add Checkup</button>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="openVaccineModal(${a.baby_id}, '${(a.babies?.full_name || '').replace(/'/g, "\\'")}')">Vaccines</button>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="openGrowthModal(${a.baby_id}, '${(a.babies?.full_name || '').replace(/'/g, "\\'")}')">Growth</button>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="openTestModal(${a.baby_id}, '${(a.babies?.full_name || '').replace(/'/g, "\\'")}')">Newborn Test</button>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="openMedModal(${a.baby_id}, ${a.doctor_id}, '${(a.babies?.full_name || '').replace(/'/g, "\\'")}')">Medicine</button>
          <button class="btn btn-sm btn-soft-danger" onclick="removeAppointment(${a.id})">Delete</button>
        `;
      } else if (a.status === 'cancelled') {
        actions = `<button class="btn btn-sm btn-soft-danger" onclick="removeAppointment(${a.id})">Delete</button>`;
      }

      return `
        <tr>
          <td class="fw-bold">${a.babies?.full_name || '—'}</td>
          <td>${a.doctors?.full_name || '—'}</td>
          <td>${formatDate(a.appointment_date)}</td>
          <td>${a.appointment_time}</td>
          <td><span class="status-badge-figma ${status.className}">${status.label}</span></td>
          <td class="text-end">${actions}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function setStatus(appointmentId, status) {
  try {
    await apiRequest(`/clinic-staff/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    await loadAppointments();
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function removeAppointment(appointmentId) {
  const confirmed = window.confirm('Delete this appointment record? This cannot be undone.');
  if (!confirmed) return;

  try {
    await apiRequest(`/clinic-staff/appointments/${appointmentId}`, { method: 'DELETE' });
    await loadAppointments();
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

function openCheckupModal(babyId, appointmentId, doctorId, babyName) {
  document.getElementById('checkupBabyId').value = babyId;
  document.getElementById('checkupAppointmentId').value = appointmentId;
  document.getElementById('checkupDoctorId').value = doctorId;
  document.getElementById('checkupModalBabyName').textContent = `For: ${babyName}`;
  document.getElementById('checkupDate').value = new Date().toISOString().split('T')[0];
  clearAlert('checkupModalAlert');
  new bootstrap.Modal(document.getElementById('checkupModal')).show();
}

async function openVaccineModal(babyId, babyName) {
  document.getElementById('vaccineModalBabyName').textContent = `For: ${babyName}`;
  document.getElementById('vaccineModalBabyId').value = babyId;
  const listEl = document.getElementById('vaccineModalList');
  listEl.innerHTML = '<div class="text-muted-soft text-center py-3">Loading…</div>';
  new bootstrap.Modal(document.getElementById('vaccineModal')).show();

  try {
    const result = await apiRequest(`/vaccinations/${babyId}`);
    const schedule = result.data.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

    if (schedule.length === 0) {
      listEl.innerHTML = '<div class="text-muted-soft text-center py-3">No vaccine schedule found.</div>';
      return;
    }

    listEl.innerHTML = schedule.map((item) => `
      <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom: 1px solid var(--color-border);">
        <div>
          <div class="fw-bold" style="font-size:14px;">${item.vaccines.name}</div>
          <div class="text-muted-soft small">Scheduled: ${formatDate(item.scheduled_date)}</div>
        </div>
        ${item.status === 'completed'
          ? `<span class="status-badge-figma status-completed-figma">Given ${formatDate(item.completed_date)}</span>`
          : `<button class="btn btn-sm btn-outline-primary" onclick="markVaccineDone(${item.id}, ${babyId}, '${(babyName || '').replace(/'/g, "\\'")}')">Mark Done</button>`}
      </div>
    `).join('');
  } catch (err) {
    listEl.innerHTML = `<div class="text-muted-soft text-center py-3">Could not load schedule.</div>`;
  }
}

async function markVaccineDone(vaccinationId, babyId, babyName) {
  try {
    await apiRequest(`/vaccinations/${vaccinationId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ completed_date: new Date().toISOString().split('T')[0] })
    });
    openVaccineModal(babyId, babyName);
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

function openGrowthModal(babyId, babyName) {
  document.getElementById('growthBabyId').value = babyId;
  document.getElementById('growthModalBabyName').textContent = `For: ${babyName}`;
  document.getElementById('growthDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('growthForm').reset();
  document.getElementById('growthBabyId').value = babyId;
  document.getElementById('growthDate').value = new Date().toISOString().split('T')[0];
  clearAlert('growthModalAlert');
  new bootstrap.Modal(document.getElementById('growthModal')).show();
}

async function handleAddGrowth(e) {
  e.preventDefault();
  clearAlert('growthModalAlert');

  const payload = {
    baby_id: document.getElementById('growthBabyId').value,
    record_date: document.getElementById('growthDate').value,
    weight_kg: document.getElementById('growthWeight').value || null,
    height_cm: document.getElementById('growthHeight').value || null,
    head_circumference_cm: document.getElementById('growthHeadCirc').value || null,
    notes: document.getElementById('growthNotes').value.trim()
  };

  const btn = document.getElementById('growthFormBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    await apiRequest('/growth', { method: 'POST', body: JSON.stringify(payload) });
    bootstrap.Modal.getInstance(document.getElementById('growthModal')).hide();
  } catch (err) {
    showAlert('growthModalAlert', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Record';
  }
}

function openTestModal(babyId, babyName) {
  document.getElementById('testForm').reset();
  document.getElementById('testBabyId').value = babyId;
  document.getElementById('testModalBabyName').textContent = `For: ${babyName}`;
  document.getElementById('testDate').value = new Date().toISOString().split('T')[0];
  clearAlert('testModalAlert');
  new bootstrap.Modal(document.getElementById('testModal')).show();
}

async function handleAddTest(e) {
  e.preventDefault();
  clearAlert('testModalAlert');

  const payload = {
    baby_id: document.getElementById('testBabyId').value,
    test_type: document.getElementById('testType').value,
    date_conducted: document.getElementById('testDate').value,
    result: document.getElementById('testResult').value,
    notes: document.getElementById('testNotes').value.trim()
  };

  const btn = document.getElementById('testFormBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    await apiRequest('/newborn-tests', { method: 'POST', body: JSON.stringify(payload) });
    bootstrap.Modal.getInstance(document.getElementById('testModal')).hide();
  } catch (err) {
    showAlert('testModalAlert', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Result';
  }
}

function formatTimeDisplay(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function renderMedScheduleChips() {
  const container = document.getElementById('medScheduleChips');
  container.innerHTML = medScheduleTimes.map((t, i) => `
    <span class="badge-pill badge-upcoming">${formatTimeDisplay(t)}<button type="button" onclick="removeMedScheduleTime(${i})" style="background:none;border:none;margin-left:6px;color:inherit;cursor:pointer;">&times;</button></span>
  `).join('');
  document.getElementById('medSchedule').value = medScheduleTimes.join(', ');
}

function addMedScheduleTime() {
  const input = document.getElementById('medScheduleTimeInput');
  const value = input.value;
  if (!value) return;
  if (!medScheduleTimes.includes(value)) {
    medScheduleTimes.push(value);
    medScheduleTimes.sort();
  }
  input.value = '';
  renderMedScheduleChips();
}

function removeMedScheduleTime(index) {
  medScheduleTimes.splice(index, 1);
  renderMedScheduleChips();
}

function openMedModal(babyId, doctorId, babyName) {
  document.getElementById('medForm').reset();
  medScheduleTimes = [];
  renderMedScheduleChips();
  document.getElementById('medBabyId').value = babyId;
  document.getElementById('medDoctorId').value = doctorId;
  document.getElementById('medModalBabyName').textContent = `For: ${babyName}`;
  document.getElementById('medStartDate').value = new Date().toISOString().split('T')[0];
  clearAlert('medModalAlert');
  new bootstrap.Modal(document.getElementById('medModal')).show();
}

async function handleAddMed(e) {
  e.preventDefault();
  clearAlert('medModalAlert');

  const payload = {
    baby_id: document.getElementById('medBabyId').value,
    prescribed_by: document.getElementById('medDoctorId').value,
    medicine_name: document.getElementById('medName').value.trim(),
    dosage: document.getElementById('medDosage').value.trim(),
    schedule_times: document.getElementById('medSchedule').value.trim(),
    start_date: document.getElementById('medStartDate').value,
    end_date: document.getElementById('medEndDate').value || null
  };

  const btn = document.getElementById('medFormBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    await apiRequest('/medications', { method: 'POST', body: JSON.stringify(payload) });
    bootstrap.Modal.getInstance(document.getElementById('medModal')).hide();
  } catch (err) {
    showAlert('medModalAlert', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Medicine';
  }
}

async function handleAddCheckup(e) {
  e.preventDefault();
  clearAlert('checkupModalAlert');

  const payload = {
    baby_id: document.getElementById('checkupBabyId').value,
    appointment_id: document.getElementById('checkupAppointmentId').value,
    doctor_id: document.getElementById('checkupDoctorId').value,
    checkup_date: document.getElementById('checkupDate').value,
    weight_kg: document.getElementById('checkupWeight').value || null,
    height_cm: document.getElementById('checkupHeight').value || null,
    head_circumference_cm: document.getElementById('checkupHeadCirc').value || null,
    doctor_notes: document.getElementById('checkupNotes').value.trim()
  };

  const btn = document.getElementById('checkupFormBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    await apiRequest('/clinic-staff/checkups', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    bootstrap.Modal.getInstance(document.getElementById('checkupModal')).hide();
    document.getElementById('checkupForm').reset();
  } catch (err) {
    showAlert('checkupModalAlert', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Record';
  }
}