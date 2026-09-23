let babiesCache = [];
let selectedBabyId = null;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  const user = getStoredUser();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  document.getElementById('addBabyModal').addEventListener('show.bs.modal', (e) => {
    if (e.relatedTarget && e.relatedTarget.id !== 'editBabyBtn') {
      resetBabyForm();
    }
  });

  document.getElementById('editBabyBtn').addEventListener('click', openEditBabyModal);
  document.getElementById('deleteBabyBtn').addEventListener('click', handleDeleteBaby);
  document.getElementById('babyForm').addEventListener('submit', handleBabyFormSubmit);

  document.getElementById('babyGenderInput').addEventListener('change', (e) => {
    renderAvatarPicker(e.target.value, document.getElementById('babyAvatarId').value);
  });

  loadBabies();
});

async function loadBabies() {
  try {
    const result = await apiRequest('/babies');
    babiesCache = result.data;
    populateBabySelector();
  } catch (err) {
    showAlert('dashboardAlert', err.message);
  }
}

function populateBabySelector() {
  if (babiesCache.length === 0) {
    document.getElementById('noBabiesState').classList.remove('d-none');
    document.getElementById('babyContent').classList.add('d-none');
    return;
  }

  document.getElementById('noBabiesState').classList.add('d-none');
  document.getElementById('babyContent').classList.remove('d-none');

  const preferredBabyId = localStorage.getItem('babycare_selected_baby');
  const matchExists = babiesCache.some((b) => String(b.id) === String(preferredBabyId));
  selectedBabyId = matchExists ? preferredBabyId : babiesCache[0].id;
  renderSelectedBaby();
}

function renderSelectedBaby() {
  const baby = babiesCache.find((b) => String(b.id) === String(selectedBabyId));
  if (!baby) return;

  document.getElementById('babyName').textContent = baby.full_name;
  document.getElementById('babyGenderBadge').textContent = baby.gender === 'male' ? 'Boy' : 'Girl';
  document.getElementById('babyBornLine').textContent = `Born ${formatDate(baby.date_of_birth)} • ${calculateAge(baby.date_of_birth)}`;
  document.getElementById('babyWeight').textContent = baby.birth_weight_kg ? `${baby.birth_weight_kg} kg` : '—';
  document.getElementById('babyHeight').textContent = baby.birth_height_cm ? `${baby.birth_height_cm} cm` : '—';
  document.getElementById('babyAvatarRing').classList.remove('avatar-boy', 'avatar-girl');
  document.getElementById('babyAvatarRing').classList.add(baby.gender === 'male' ? 'avatar-boy' : 'avatar-girl');
  const avatarFile = `${baby.gender === 'male' ? 'boy' : 'girl'}_avatar${baby.avatar_id || 1}.png`;
  document.getElementById('babyAvatarRing').innerHTML = `<img src="../assets/images/avatars/${avatarFile}" alt="Baby avatar">`;

  loadVaccineSummary(baby.id);
}

async function loadVaccineSummary(babyId) {
  const nextVaccineEl = document.getElementById('nextVaccineContent');
  const nextVaccineBadgeEl = document.getElementById('nextVaccineBadge');
  const progressEl = document.getElementById('vaccineProgressContent');
  const levelTagEl = document.getElementById('progressLevelTag');

  try {
    const result = await apiRequest(`/vaccinations/${babyId}`);
    const schedule = result.data;

    const notCompleted = schedule
      .filter((v) => v.status !== 'completed')
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

    const statusBadgeClass = {
      upcoming: 'status-upcoming-figma',
      due: 'status-due-now',
      overdue: 'status-overdue-figma'
    };
    const statusLabel = { upcoming: 'Upcoming', due: 'Due Now', overdue: 'Overdue' };

    if (notCompleted.length === 0) {
      nextVaccineBadgeEl.innerHTML = '';
      nextVaccineEl.innerHTML = `<div class="text-muted-soft"><i data-lucide="party-popper" style="width:18px;height:18px;vertical-align:-4px;"></i> All caught up! No pending vaccines.</div>`;
    } else {
      const next = notCompleted[0];
      nextVaccineBadgeEl.innerHTML = `<span class="status-badge-figma ${statusBadgeClass[next.status] || 'status-upcoming-figma'}">${statusLabel[next.status] || next.status}</span>`;
      nextVaccineEl.innerHTML = `
        <div class="vaccine-name-figma">${next.vaccines.name}</div>
        <div class="vaccine-desc-figma">${next.vaccines.description}</div>
        <div class="vaccine-date-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="#8B6FD1" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="#8B6FD1" stroke-width="2"/></svg>
          Scheduled: ${formatDate(next.scheduled_date)}
        </div>
      `;
    }

    const completedCount = schedule.filter((v) => v.status === 'completed').length;
    const total = schedule.length;
    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    levelTagEl.textContent = pct === 100 ? 'All Doses Complete' : pct >= 50 ? 'Level 1 Complete' : 'Just Getting Started';

    progressEl.innerHTML = `
      <div class="progress-summary-figma">
        <div>
          <div class="progress-percent">${pct}%</div>
          <div class="progress-caption">${completedCount} of ${total} required doses administered</div>
        </div>
      </div>
      <div class="progress-track-figma">
        <div class="progress-fill-figma" style="width: ${pct}%;"></div>
      </div>
    `;
  } catch (err) {
    nextVaccineEl.innerHTML = `<div class="text-muted-soft">Could not load vaccine data.</div>`;
    progressEl.innerHTML = '';
  }
}

function renderAvatarPicker(gender, selectedAvatarId) {
  const picker = document.getElementById('avatarPicker');
  const prefix = gender === 'female' ? 'girl' : 'boy';
  const selected = selectedAvatarId || 1;

  picker.innerHTML = [1, 2, 3, 4].map((n) => `
    <img
      src="../assets/images/avatars/${prefix}_avatar${n}.png"
      alt="Avatar ${n}"
      onclick="pickAvatar(${n})"
      style="width:56px; height:56px; border-radius:50%; cursor:pointer; object-fit:cover;
        border: 3px solid ${Number(selected) === n ? 'var(--color-primary)' : 'var(--color-border)'};"
      data-avatar-option="${n}"
    >
  `).join('');
}

function pickAvatar(n) {
  document.getElementById('babyAvatarId').value = n;
  document.querySelectorAll('[data-avatar-option]').forEach((img) => {
    const isSelected = Number(img.dataset.avatarOption) === n;
    img.style.border = `3px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`;
  });
}

function resetBabyForm() {
  document.getElementById('babyModalTitle').textContent = 'Add a baby';
  document.getElementById('babyId').value = '';
  document.getElementById('babyForm').reset();
  document.getElementById('babyAvatarId').value = '1';
  renderAvatarPicker('male', 1);
  clearAlert('babyModalAlert');
}

function openEditBabyModal() {
  const baby = babiesCache.find((b) => String(b.id) === String(selectedBabyId));
  if (!baby) return;

  document.getElementById('babyModalTitle').textContent = 'Edit baby';
  document.getElementById('babyId').value = baby.id;
  document.getElementById('babyFullName').value = baby.full_name;
  document.getElementById('babyDob').value = baby.date_of_birth;
  document.getElementById('babyGenderInput').value = baby.gender;
  document.getElementById('babyWeightInput').value = baby.birth_weight_kg || '';
  document.getElementById('babyHeightInput').value = baby.birth_height_cm || '';
  document.getElementById('babyAvatarId').value = baby.avatar_id || 1;
  renderAvatarPicker(baby.gender, baby.avatar_id || 1);
  clearAlert('babyModalAlert');

  new bootstrap.Modal(document.getElementById('addBabyModal')).show();
}

async function handleBabyFormSubmit(e) {
  e.preventDefault();
  clearAlert('babyModalAlert');

  const id = document.getElementById('babyId').value;
  const payload = {
    full_name: document.getElementById('babyFullName').value.trim(),
    date_of_birth: document.getElementById('babyDob').value,
    gender: document.getElementById('babyGenderInput').value,
    birth_weight_kg: document.getElementById('babyWeightInput').value || null,
    birth_height_cm: document.getElementById('babyHeightInput').value || null,
    avatar_id: document.getElementById('babyAvatarId').value || 1
  };

  const btn = document.getElementById('babyFormBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    if (id) {
      await apiRequest(`/babies/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiRequest('/babies', { method: 'POST', body: JSON.stringify(payload) });
    }

    bootstrap.Modal.getInstance(document.getElementById('addBabyModal')).hide();
    await loadBabies();
  } catch (err) {
    showAlert('babyModalAlert', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save baby';
  }
}

async function handleDeleteBaby() {
  const baby = babiesCache.find((b) => String(b.id) === String(selectedBabyId));
  if (!baby) return;

  const confirmed = window.confirm(`Delete ${baby.full_name}'s profile? This cannot be undone.`);
  if (!confirmed) return;

  try {
    await apiRequest(`/babies/${baby.id}`, { method: 'DELETE' });
    await loadBabies();
  } catch (err) {
    showAlert('dashboardAlert', err.message);
  }
}