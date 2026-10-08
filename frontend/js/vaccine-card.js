document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  loadCard();
});

const STATUS_REMARK = {
  completed: 'Given',
  due: 'Due now',
  overdue: 'Overdue',
  upcoming: 'Upcoming'
};

async function loadCard() {
  try {
    const babiesResult = await apiRequest('/babies');
    const babies = babiesResult.data;

    if (babies.length === 0) {
      document.getElementById('noBabiesState').classList.remove('d-none');
      return;
    }

    const preferredBabyId = localStorage.getItem('babycare_selected_baby');
    const matchExists = babies.some((b) => String(b.id) === String(preferredBabyId));
    const baby = babies.find((b) => String(b.id) === String(matchExists ? preferredBabyId : babies[0].id));

    document.getElementById('cardBabyName').textContent = baby.full_name;
    document.getElementById('cardBabyDob').textContent = formatDate(baby.date_of_birth);
    document.getElementById('cardBabySex').textContent = baby.gender === 'male' ? 'Male' : 'Female';

    const result = await apiRequest(`/vaccinations/${baby.id}`);
    const schedule = result.data.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

    document.getElementById('cardContent').classList.remove('d-none');

    const completedCount = schedule.filter((v) => v.status === 'completed').length;
    const total = schedule.length;
    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    document.getElementById('cardProgressText').textContent = `${completedCount} of ${total} vaccines completed`;
    document.getElementById('cardProgressFill').style.width = `${pct}%`;

    const tbody = document.getElementById('cardTableBody');
    tbody.innerHTML = schedule.map((v) => `
      <tr class="${v.status === 'completed' ? 'vaccine-card-row-done' : ''}">
        <td class="vaccine-card-name">${v.vaccines.name}</td>
        <td>${v.vaccines.dose_number ? 'Dose ' + v.vaccines.dose_number : '—'}</td>
        <td>${formatDate(v.scheduled_date)}</td>
        <td>
          ${v.status === 'completed'
            ? `<span class="vaccine-card-check"><i data-lucide="check-circle-2" style="width:16px;height:16px;"></i> Given ${formatDate(v.completed_date)}</span>`
            : `<span class="text-muted-soft">${STATUS_REMARK[v.status] || v.status}</span>`}
        </td>
      </tr>
    `).join('');

    lucide.createIcons();
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}
