let weightChartInstance = null;
let heightChartInstance = null;
let headChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  loadGrowth();
});

async function loadGrowth() {
  try {
    const babiesResult = await apiRequest('/babies');
    const babies = babiesResult.data;

    if (babies.length === 0) {
      document.getElementById('emptyState').classList.remove('d-none');
      document.getElementById('growthContent').classList.add('d-none');
      return;
    }

    const preferredBabyId = localStorage.getItem('babycare_selected_baby');
    const matchExists = babies.some((b) => String(b.id) === String(preferredBabyId));
    const babyId = matchExists ? preferredBabyId : babies[0].id;

    const result = await apiRequest(`/growth/${babyId}`);
    const records = result.data;

    if (records.length === 0) {
      document.getElementById('emptyState').classList.remove('d-none');
      document.getElementById('growthContent').classList.add('d-none');
      return;
    }

    document.getElementById('emptyState').classList.add('d-none');
    document.getElementById('growthContent').classList.remove('d-none');

    renderCharts(records);
    renderTable(records);
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

function renderCharts(records) {
  const labels = records.map((r) => formatDate(r.record_date));
  const weights = records.map((r) => r.weight_kg);
  const heights = records.map((r) => r.height_cm);
  const heads = records.map((r) => r.head_circumference_cm);

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#F0E7F7' } }
    }
  };

  if (weightChartInstance) weightChartInstance.destroy();
  weightChartInstance = new Chart(document.getElementById('weightChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: weights,
        borderColor: '#8B6FD1',
        backgroundColor: 'rgba(139,111,209,0.15)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#8B6FD1'
      }]
    },
    options: chartOptions
  });

  if (heightChartInstance) heightChartInstance.destroy();
  heightChartInstance = new Chart(document.getElementById('heightChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: heights,
        borderColor: '#F7A9BE',
        backgroundColor: 'rgba(247,169,190,0.15)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#F7A9BE'
      }]
    },
    options: chartOptions
  });

  if (headChartInstance) headChartInstance.destroy();
  headChartInstance = new Chart(document.getElementById('headChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: heads,
        borderColor: '#8FDCC3',
        backgroundColor: 'rgba(143,220,195,0.15)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#8FDCC3'
      }]
    },
    options: chartOptions
  });
}

function renderTable(records) {
  const tbody = document.getElementById('growthTableBody');
  tbody.innerHTML = [...records].reverse().map((r) => `
    <tr>
      <td class="fw-bold">${formatDate(r.record_date)}</td>
      <td>${r.weight_kg ? r.weight_kg + ' kg' : '—'}</td>
      <td>${r.height_cm ? r.height_cm + ' cm' : '—'}</td>
      <td>${r.head_circumference_cm ? r.head_circumference_cm + ' cm' : '—'}</td>
      <td>${r.notes || '—'}</td>
    </tr>
  `).join('');
}