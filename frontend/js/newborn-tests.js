document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  loadTests();
});

async function loadTests() {
  try {
    const babiesResult = await apiRequest('/babies');
    const babies = babiesResult.data;

    if (babies.length === 0) {
      document.getElementById('emptyState').classList.remove('d-none');
      return;
    }

    const preferredBabyId = localStorage.getItem('babycare_selected_baby');
    const matchExists = babies.some((b) => String(b.id) === String(preferredBabyId));
    const babyId = matchExists ? preferredBabyId : babies[0].id;

    const result = await apiRequest(`/newborn-tests/${babyId}`);
    const tests = result.data;
    const grid = document.getElementById('testGrid');

    if (tests.length === 0) {
      document.getElementById('emptyState').classList.remove('d-none');
      return;
    }

    grid.innerHTML = tests.map((t) => {
      const isDone = t.status === 'completed';
      return `
        <div class="nav-card-figma" style="cursor:default;">
          <div class="d-flex justify-content-between align-items-start">
            <div class="nav-icon-badge ${isDone ? 'mint' : 'yellow'}"><i data-lucide="${isDone ? 'circle-check' : 'hourglass'}" style="width:24px;height:24px;"></i></div>
            <span class="status-badge-figma ${isDone ? 'status-completed-figma' : 'status-pending-figma'}">${isDone ? 'Completed' : 'Pending'}</span>
          </div>
          <div class="nav-text">
            <div class="nav-card-title">${t.test_type}</div>
            ${t.date_conducted ? `<div class="nav-card-sub">Date: ${formatDate(t.date_conducted)}</div>` : ''}
            ${t.result ? `<div class="nav-card-sub">Result: ${t.result}</div>` : ''}
            ${t.notes ? `<div class="nav-card-sub">${t.notes}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}