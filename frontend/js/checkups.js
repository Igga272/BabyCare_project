let babiesCache = [];
let selectedBabyId = null;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  loadBabies();
});

async function loadBabies() {
  try {
    const result = await apiRequest('/babies');
    babiesCache = result.data;

    if (babiesCache.length === 0) {
      document.getElementById('emptyState').classList.remove('d-none');
      document.getElementById('listContent').classList.add('d-none');
      return;
    }

    const preferredBabyId = localStorage.getItem('babycare_selected_baby');
    const matchExists = babiesCache.some((b) => String(b.id) === String(preferredBabyId));
    selectedBabyId = matchExists ? preferredBabyId : babiesCache[0].id;

    loadCheckups();
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function loadCheckups() {
  try {
    const result = await apiRequest(`/checkups/${selectedBabyId}`);
    const records = result.data;

    if (records.length === 0) {
      document.getElementById('emptyState').classList.remove('d-none');
      document.getElementById('listContent').classList.add('d-none');
      return;
    }

    document.getElementById('emptyState').classList.add('d-none');
    document.getElementById('listContent').classList.remove('d-none');

    const tbody = document.getElementById('checkupTableBody');
    tbody.innerHTML = records.map((r) => `
      <tr>
        <td class="fw-bold">${formatDate(r.checkup_date)}</td>
        <td>${r.doctors?.full_name || '—'}</td>
        <td>${r.weight_kg ? r.weight_kg + ' kg' : '—'}</td>
        <td>${r.height_cm ? r.height_cm + ' cm' : '—'}</td>
        <td>${r.head_circumference_cm ? r.head_circumference_cm + ' cm' : '—'}</td>
        <td>${r.doctor_notes || '—'}</td>
      </tr>
    `).join('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}