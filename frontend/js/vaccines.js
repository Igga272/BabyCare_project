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
      document.getElementById('noBabiesState').classList.remove('d-none');
      document.getElementById('scheduleContent').classList.add('d-none');
      return;
    }

    const preferredBabyId = localStorage.getItem('babycare_selected_baby');
    const matchExists = babiesCache.some((b) => String(b.id) === String(preferredBabyId));
    selectedBabyId = matchExists ? preferredBabyId : babiesCache[0].id;

    loadSchedule();
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function loadSchedule() {
  document.getElementById('noBabiesState').classList.add('d-none');
  document.getElementById('scheduleContent').classList.remove('d-none');

  const tbody = document.getElementById('vaccineTableBody');
  tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted-soft py-4">Loading schedule…</td></tr>`;

  try {
    const result = await apiRequest(`/vaccinations/${selectedBabyId}`);
    const schedule = result.data.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

    if (schedule.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted-soft py-4">No vaccine schedule found.</td></tr>`;
      return;
    }

    tbody.innerHTML = schedule.map((item) => `
      <tr>
        <td class="fw-bold">${item.vaccines.name}</td>
        <td class="text-muted-soft small">${item.vaccines.description}</td>
        <td>${formatDate(item.scheduled_date)}</td>
        <td>${statusBadgeHtml(item.status)}${item.status === 'completed' ? `<div class="text-muted-soft small mt-1">Given ${formatDate(item.completed_date)}</div>` : ''}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted-soft py-4">Could not load schedule.</td></tr>`;
  }
}