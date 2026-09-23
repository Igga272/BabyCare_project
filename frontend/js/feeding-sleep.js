let currentBabyId = null;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  document.getElementById('feedingForm').addEventListener('submit', handleAddFeeding);
  document.getElementById('sleepForm').addEventListener('submit', handleAddSleep);

  init();
});

function isUnder3Months(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  return months < 3;
}

async function init() {
  try {
    const babiesResult = await apiRequest('/babies');
    const babies = babiesResult.data;

    if (babies.length === 0) {
      document.getElementById('noBabyNotice').classList.remove('d-none');
      return;
    }

    const preferredBabyId = localStorage.getItem('babycare_selected_baby');
    const matchExists = babies.some((b) => String(b.id) === String(preferredBabyId));
    const baby = babies.find((b) => String(b.id) === String(matchExists ? preferredBabyId : babies[0].id));
    currentBabyId = baby.id;

    if (isUnder3Months(baby.date_of_birth)) {
      document.getElementById('logForms').classList.remove('d-none');
    } else {
      document.getElementById('tooOldNotice').classList.remove('d-none');
    }

    loadFeeding();
    loadSleep();

    document.getElementById('feedDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('sleepDate').value = new Date().toISOString().split('T')[0];
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function loadFeeding() {
  try {
    const result = await apiRequest(`/logs/feeding/${currentBabyId}`);
    document.getElementById('feedingTableBody').innerHTML = result.data.map((f) => `
      <tr><td>${formatDate(f.log_date)}</td><td>${f.log_time}</td><td>${f.feeding_type || '—'}</td></tr>
    `).join('') || '<tr><td colspan="3" class="text-center text-muted-soft py-3">No entries yet</td></tr>';
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function loadSleep() {
  try {
    const result = await apiRequest(`/logs/sleep/${currentBabyId}`);
    document.getElementById('sleepTableBody').innerHTML = result.data.map((s) => `
      <tr><td>${formatDate(s.log_date)}</td><td>${s.start_time}</td><td>${s.end_time || '—'}</td></tr>
    `).join('') || '<tr><td colspan="3" class="text-center text-muted-soft py-3">No entries yet</td></tr>';
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function handleAddFeeding(e) {
  e.preventDefault();
  const payload = {
    baby_id: currentBabyId,
    log_date: document.getElementById('feedDate').value,
    log_time: document.getElementById('feedTime').value,
    feeding_type: document.getElementById('feedType').value,
    notes: document.getElementById('feedNotes').value.trim()
  };

  const btn = document.getElementById('feedFormBtn');
  btn.disabled = true;

  try {
    await apiRequest('/logs/feeding', { method: 'POST', body: JSON.stringify(payload) });
    document.getElementById('feedingForm').reset();
    document.getElementById('feedDate').value = new Date().toISOString().split('T')[0];
    await loadFeeding();
  } catch (err) {
    showAlert('pageAlert', err.message);
  } finally {
    btn.disabled = false;
  }
}

async function handleAddSleep(e) {
  e.preventDefault();
  const payload = {
    baby_id: currentBabyId,
    log_date: document.getElementById('sleepDate').value,
    start_time: document.getElementById('sleepStart').value,
    end_time: document.getElementById('sleepEnd').value || null,
    notes: document.getElementById('sleepNotes').value.trim()
  };

  const btn = document.getElementById('sleepFormBtn');
  btn.disabled = true;

  try {
    await apiRequest('/logs/sleep', { method: 'POST', body: JSON.stringify(payload) });
    document.getElementById('sleepForm').reset();
    document.getElementById('sleepDate').value = new Date().toISOString().split('T')[0];
    await loadSleep();
  } catch (err) {
    showAlert('pageAlert', err.message);
  } finally {
    btn.disabled = false;
  }
}