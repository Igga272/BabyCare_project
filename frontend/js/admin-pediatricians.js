let doctorsCache = [];

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  document.querySelectorAll('.day-check').forEach((label) => {
    label.addEventListener('click', () => {
      const checkbox = label.querySelector('input');
      checkbox.checked = !checkbox.checked;
      label.classList.toggle('checked', checkbox.checked);
    });
  });

  document.getElementById('doctorForm').addEventListener('submit', handleSaveDoctor);

  loadDoctors();
});

async function loadDoctors() {
  try {
    const result = await apiRequest('/doctors');
    doctorsCache = result.data;
    const grid = document.getElementById('doctorGrid');

    if (doctorsCache.length === 0) {
      grid.innerHTML = `<div class="empty-state tracker-card"><div class="empty-state-icon"><i data-lucide="stethoscope"></i></div><div class="section-heading">No doctors added yet</div></div>`;
      return;
    }

    grid.innerHTML = doctorsCache.map((d, index) => {
      const statusBadge = d.status === 'unavailable'
        ? `<span class="status-badge-figma status-cancelled-figma">Unavailable</span>`
        : `<span class="status-badge-figma status-completed-figma">Available</span>`;

      const days = d.available_days ? d.available_days.split(',').join(', ') : 'Not set';
      const timeRange = (d.available_time_start && d.available_time_end)
        ? `${d.available_time_start.slice(0,5)} – ${d.available_time_end.slice(0,5)}`
        : 'Not set';

      return `
        <div class="nav-card-figma" style="cursor:default;">
          <div class="d-flex justify-content-end">
            ${statusBadge}
          </div>
          <div class="nav-text">
            <div class="nav-card-title">${d.full_name}</div>
            <div class="nav-card-sub">${d.specialization || '—'}</div>
            <div class="nav-card-sub">Days: ${days}</div>
            <div class="nav-card-sub">Time: ${timeRange}</div>
          </div>
          <button type="button" class="app-button" style="width:auto; padding:8px 16px; font-size:13px;" data-bs-toggle="modal" data-bs-target="#doctorModal" onclick="openEditDoctorModal(${index})">Edit</button>
        </div>
      `;
    }).join('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

function resetDayCheckboxes() {
  document.querySelectorAll('.day-check').forEach((label) => {
    label.querySelector('input').checked = false;
    label.classList.remove('checked');
  });
}

function openAddDoctorModal() {
  document.getElementById('doctorModalTitle').textContent = 'Add Doctor';
  document.getElementById('doctorId').value = '';
  document.getElementById('doctorForm').reset();
  resetDayCheckboxes();
  clearAlert('doctorModalAlert');
}

function openEditDoctorModal(index) {
  const doctor = doctorsCache[index];
  document.getElementById('doctorModalTitle').textContent = 'Edit Doctor';
  document.getElementById('doctorId').value = doctor.id;
  document.getElementById('doctorFullName').value = doctor.full_name;
  document.getElementById('doctorSpecialization').value = doctor.specialization || '';
  document.getElementById('doctorStatus').value = doctor.status || 'available';
  document.getElementById('doctorTimeStart').value = doctor.available_time_start ? doctor.available_time_start.slice(0,5) : '';
  document.getElementById('doctorTimeEnd').value = doctor.available_time_end ? doctor.available_time_end.slice(0,5) : '';

  resetDayCheckboxes();
  const selectedDays = doctor.available_days ? doctor.available_days.split(',') : [];
  document.querySelectorAll('.day-check').forEach((label) => {
    const checkbox = label.querySelector('input');
    if (selectedDays.includes(checkbox.value)) {
      checkbox.checked = true;
      label.classList.add('checked');
    }
  });

  clearAlert('doctorModalAlert');
}

async function handleSaveDoctor(e) {
  e.preventDefault();
  clearAlert('doctorModalAlert');

  const id = document.getElementById('doctorId').value;
  const selectedDays = Array.from(document.querySelectorAll('.day-check input:checked')).map((cb) => cb.value);

  const payload = {
    full_name: document.getElementById('doctorFullName').value.trim(),
    specialization: document.getElementById('doctorSpecialization').value.trim(),
    status: document.getElementById('doctorStatus').value,
    available_days: selectedDays.join(','),
    available_time_start: document.getElementById('doctorTimeStart').value || null,
    available_time_end: document.getElementById('doctorTimeEnd').value || null,
    clinic_id: 1
  };

  const btn = document.getElementById('doctorFormBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    if (id) {
      await apiRequest(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiRequest('/doctors', { method: 'POST', body: JSON.stringify(payload) });
    }

    bootstrap.Modal.getInstance(document.getElementById('doctorModal')).hide();
    await loadDoctors();
  } catch (err) {
    showAlert('doctorModalAlert', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Doctor';
  }
}