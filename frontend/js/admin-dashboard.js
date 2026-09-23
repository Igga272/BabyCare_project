document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  document.getElementById('staffForm').addEventListener('submit', handleCreateStaff);

  loadStats();
  loadUsers();
  loadClinicsForSelect();
});

async function loadStats() {
  try {
    const result = await apiRequest('/admin/stats');
    const s = result.data;

    document.getElementById('statToday').textContent = s.todayAppointments;
    document.getElementById('statPending').textContent = s.pending;
    document.getElementById('statCompleted').textContent = s.completedToday;
    document.getElementById('statVaccines').textContent = s.upcomingVaccines;
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function loadUsers() {
  try {
    const result = await apiRequest('/admin/users');
    const tbody = document.getElementById('usersTableBody');

    tbody.innerHTML = result.data.map((u) => `
      <tr>
        <td>${u.email}</td>
        <td><span class="badge-pill badge-upcoming">${u.role}</span></td>
        <td>${formatDate(u.created_at)}</td>
      </tr>
    `).join('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function loadClinicsForSelect() {
  try {
    const result = await apiRequest('/clinics');
    const select = document.getElementById('staffClinicSelect');

    select.innerHTML = result.data
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function handleCreateStaff(e) {
  e.preventDefault();
  clearAlert('staffFormAlert');

  const payload = {
    full_name: document.getElementById('staffFullName').value.trim(),
    email: document.getElementById('staffEmail').value.trim(),
    password: document.getElementById('staffPassword').value,
    clinic_id: document.getElementById('staffClinicSelect').value
  };

  const btn = document.getElementById('staffFormBtn');
  btn.disabled = true;
  btn.textContent = 'Creating…';

  try {
    await apiRequest('/admin/clinic-staff', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showAlert('staffFormAlert', 'Clinic staff account created!', 'success');
    document.getElementById('staffForm').reset();
    await loadUsers();
  } catch (err) {
    showAlert('staffFormAlert', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Staff Account';
  }
}
