let currentBabyId = null;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  loadMedications();
});

async function loadMedications() {
  try {
    const babiesResult = await apiRequest('/babies');
    const babies = babiesResult.data;

    if (babies.length === 0) {
      document.getElementById('emptyState').classList.remove('d-none');
      return;
    }

    const preferredBabyId = localStorage.getItem('babycare_selected_baby');
    const matchExists = babies.some((b) => String(b.id) === String(preferredBabyId));
    currentBabyId = matchExists ? preferredBabyId : babies[0].id;

    const result = await apiRequest(`/medications/${currentBabyId}`);
    const meds = result.data;
    const listEl = document.getElementById('medList');

    if (meds.length === 0) {
      document.getElementById('emptyState').classList.remove('d-none');
      return;
    }

    listEl.innerHTML = meds.map((m) => {
      const isActive = !m.end_date || new Date(m.end_date) >= new Date();
      return `
        <div class="tracker-card">
          <div class="card-header-row">
            <div class="title-group-figma">
              <span style="font-size:18px;">${m.medicine_name}</span>
            </div>
            <span class="status-badge-figma ${isActive ? 'status-confirmed-figma' : 'status-cancelled-figma'}">${isActive ? 'Active' : 'Ended'}</span>
          </div>
          <div class="vaccine-desc-figma">Dosage: ${m.dosage || '—'}</div>
          <div class="vaccine-desc-figma">Schedule: ${m.schedule_times || '—'}</div>
          <div class="vaccine-desc-figma">${formatDate(m.start_date)} ${m.end_date ? '– ' + formatDate(m.end_date) : ''}</div>
          ${m.doctors?.full_name ? `<div class="vaccine-desc-figma">Prescribed by: ${m.doctors.full_name}</div>` : ''}
          <div class="d-flex align-items-center gap-2 mt-2">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" role="switch" id="reminder${m.id}" ${m.reminder_on ? 'checked' : ''} onchange="toggleReminder(${m.id}, this.checked)">
              <label class="form-check-label text-muted-soft small" for="reminder${m.id}">Reminder ${m.reminder_on ? 'ON' : 'OFF'}</label>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function toggleReminder(id, checked) {
  try {
    await apiRequest(`/medications/${id}/reminder`, {
      method: 'PUT',
      body: JSON.stringify({ reminder_on: checked })
    });
    document.querySelector(`label[for="reminder${id}"]`).textContent = `Reminder ${checked ? 'ON' : 'OFF'}`;
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}