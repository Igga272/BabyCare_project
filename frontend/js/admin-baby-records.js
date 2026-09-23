let babiesCache = [];
let currentProfile = null;
let activeTab = 'vaccinations';

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    renderResults(e.target.value);
  });

  document.querySelectorAll('#profileTabs .nav-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#profileTabs .nav-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      renderTabContent();
    });
  });

  document.getElementById('vaccineEditForm').addEventListener('submit', handleVaccineEditSubmit);

  loadBabies();
});

async function loadBabies() {
  try {
    const result = await apiRequest('/baby-records');
    babiesCache = result.data;
    renderResults('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

function avatarSrc(baby) {
  const prefix = baby.gender === 'male' ? 'boy' : 'girl';
  return `../assets/images/avatars/${prefix}_avatar${baby.avatar_id || 1}.png`;
}

function renderResults(search) {
  const term = search.toLowerCase();
  const filtered = babiesCache.filter((b) =>
    b.full_name.toLowerCase().includes(term) ||
    (b.parents?.full_name || '').toLowerCase().includes(term)
  );

  const grid = document.getElementById('resultsList');

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state tracker-card"><div class="empty-state-icon">🔍</div><div class="section-heading">No babies found</div></div>`;
    return;
  }

  grid.innerHTML = filtered.map((b) => `
    <div class="nav-card-figma" style="cursor:pointer;" onclick="openProfile(${b.id})">
      <div class="nav-icon-badge ${b.gender === 'male' ? 'purple' : 'pink'}" style="overflow:hidden; padding:0;">
        <img src="${avatarSrc(b)}" alt="Baby avatar" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <div class="nav-text">
        <div class="nav-card-title">${b.full_name}</div>
        <div class="nav-card-sub">Parent: ${b.parents?.full_name || '—'}</div>
        <div class="nav-card-sub">Born: ${formatDate(b.date_of_birth)}</div>
      </div>
    </div>
  `).join('');
}

async function openProfile(babyId) {
  try {
    const result = await apiRequest(`/baby-records/${babyId}`);
    currentProfile = result.data;

    document.getElementById('profileName').textContent = currentProfile.baby.full_name;
    document.getElementById('profileGenderBadge').textContent = currentProfile.baby.gender === 'male' ? 'Boy' : 'Girl';
    document.getElementById('profileBornLine').textContent = `Born ${formatDate(currentProfile.baby.date_of_birth)} • ${calculateAge(currentProfile.baby.date_of_birth)}`;
    document.getElementById('profileParentLine').textContent = `Parent: ${currentProfile.baby.parents?.full_name || '—'} · ${currentProfile.baby.parents?.contact_number || '—'}`;
    document.getElementById('profileAvatarRing').innerHTML = `<img src="${avatarSrc(currentProfile.baby)}" alt="Baby avatar" style="width:100%; height:100%; object-fit:cover;">`;
    document.getElementById('profileAvatarRing').className = `baby-avatar-ring ${currentProfile.baby.gender === 'male' ? 'avatar-boy' : 'avatar-girl'}`;

    document.querySelectorAll('#profileTabs .nav-pill').forEach((b) => b.classList.remove('active'));
    document.querySelector('#profileTabs .nav-pill[data-tab="vaccinations"]').classList.add('active');
    activeTab = 'vaccinations';

    document.getElementById('searchBarWrap').classList.add('d-none');
    document.getElementById('resultsList').classList.add('d-none');
    document.getElementById('profileView').classList.remove('d-none');

    renderTabContent();
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

function closeProfile() {
  document.getElementById('profileView').classList.add('d-none');
  document.getElementById('resultsList').classList.remove('d-none');
  document.getElementById('searchBarWrap').classList.remove('d-none');
}

function canEditVaccines() {
  const user = getStoredUser();
  return !!user && ['admin', 'clinic'].includes(user.role);
}

function openVaccineEditModal(id, vaccineName, scheduledDate) {
  document.getElementById('editVaccinationId').value = id;
  document.getElementById('editVaccineName').value = vaccineName;
  document.getElementById('editScheduledDate').value = scheduledDate;
  clearAlert('vaccineEditAlert');
  document.getElementById('vaccineEditModal').classList.remove('d-none');
}

function closeVaccineEditModal() {
  document.getElementById('vaccineEditModal').classList.add('d-none');
}

async function handleVaccineEditSubmit(e) {
  e.preventDefault();
  clearAlert('vaccineEditAlert');

  const id = document.getElementById('editVaccinationId').value;
  const payload = {
    scheduled_date: document.getElementById('editScheduledDate').value
  };

  const btn = document.getElementById('vaccineEditSaveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    await apiRequest(`/vaccinations/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    const result = await apiRequest(`/baby-records/${currentProfile.baby.id}`);
    currentProfile = result.data;
    renderTabContent();
    closeVaccineEditModal();
  } catch (err) {
    showAlert('vaccineEditAlert', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}

function renderTabContent() {
  const container = document.getElementById('tabContent');
  if (!currentProfile) return;

  if (activeTab === 'vaccinations') {
    const editable = canEditVaccines();
    const rows = currentProfile.vaccinations.map((v) => `
      <tr>
        <td class="fw-bold">${v.vaccines?.name || '—'}</td>
        <td>${formatDate(v.scheduled_date)}</td>
        <td>${statusBadgeHtml(v.status)}</td>
        <td>${v.completed_date ? formatDate(v.completed_date) : '—'}</td>
        ${editable ? `<td><button type="button" class="btn btn-sm btn-outline-primary" onclick="openVaccineEditModal(${v.id}, '${(v.vaccines?.name || '').replace(/'/g, "\\'")}', '${v.scheduled_date}')">Edit</button></td>` : ''}
      </tr>
    `).join('') || `<tr><td colspan="${editable ? 5 : 4}" class="text-center text-muted-soft py-3">No records</td></tr>`;
    container.innerHTML = `<div class="table-responsive"><table class="table table-soft mb-0"><thead><tr><th>Vaccine</th><th>Scheduled</th><th>Status</th><th>Given</th>${editable ? '<th>Actions</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  if (activeTab === 'checkups') {
    const rows = currentProfile.checkups.map((c) => `
      <tr>
        <td class="fw-bold">${formatDate(c.checkup_date)}</td>
        <td>${c.doctors?.full_name || '—'}</td>
        <td>${c.weight_kg ? c.weight_kg + ' kg' : '—'}</td>
        <td>${c.height_cm ? c.height_cm + ' cm' : '—'}</td>
        <td>${c.doctor_notes || '—'}</td>
      </tr>
    `).join('') || `<tr><td colspan="5" class="text-center text-muted-soft py-3">No records</td></tr>`;
    container.innerHTML = `<div class="table-responsive"><table class="table table-soft mb-0"><thead><tr><th>Date</th><th>Doctor</th><th>Weight</th><th>Length</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  if (activeTab === 'tests') {
    const rows = currentProfile.newbornTests.map((t) => `
      <tr>
        <td class="fw-bold">${t.test_type}</td>
        <td>${statusBadgeHtml(t.status)}</td>
        <td>${t.date_conducted ? formatDate(t.date_conducted) : '—'}</td>
        <td>${t.result || '—'}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="text-center text-muted-soft py-3">No records</td></tr>`;
    container.innerHTML = `<div class="table-responsive"><table class="table table-soft mb-0"><thead><tr><th>Test</th><th>Status</th><th>Date</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  if (activeTab === 'medications') {
    const rows = currentProfile.medications.map((m) => `
      <tr>
        <td class="fw-bold">${m.medicine_name}</td>
        <td>${m.dosage || '—'}</td>
        <td>${m.schedule_times || '—'}</td>
        <td>${formatDate(m.start_date)}${m.end_date ? ' – ' + formatDate(m.end_date) : ''}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="text-center text-muted-soft py-3">No records</td></tr>`;
    container.innerHTML = `<div class="table-responsive"><table class="table table-soft mb-0"><thead><tr><th>Medicine</th><th>Dosage</th><th>Schedule</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  if (activeTab === 'growth') {
    const rows = [...currentProfile.growth].reverse().map((g) => `
      <tr>
        <td class="fw-bold">${formatDate(g.record_date)}</td>
        <td>${g.weight_kg ? g.weight_kg + ' kg' : '—'}</td>
        <td>${g.height_cm ? g.height_cm + ' cm' : '—'}</td>
        <td>${g.head_circumference_cm ? g.head_circumference_cm + ' cm' : '—'}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="text-center text-muted-soft py-3">No records</td></tr>`;
    container.innerHTML = `<div class="table-responsive"><table class="table table-soft mb-0"><thead><tr><th>Date</th><th>Weight</th><th>Length</th><th>Head Circ.</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
}