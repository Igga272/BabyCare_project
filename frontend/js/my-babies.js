document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  document.getElementById('babyForm').addEventListener('submit', handleAddBaby);
  document.getElementById('babyGenderInput').addEventListener('change', (e) => {
    renderAvatarPicker(e.target.value, document.getElementById('babyAvatarId').value);
  });

  loadBabies();
});

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

async function loadBabies() {
  try {
    const result = await apiRequest('/babies');
    const babies = result.data;
    const listEl = document.getElementById('babyList');

    if (babies.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state tracker-card">
          <div class="empty-state-icon"><i data-lucide="milk"></i></div>
          <div class="section-heading">No babies added yet</div>
          <p class="text-muted-soft mb-0">Add your first baby to get started.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = babies.map((baby) => `
      <div class="nav-card-figma" style="flex-direction: row; align-items: center; gap: 16px; cursor: pointer;" onclick="selectBaby(${baby.id})">
        <div class="baby-avatar-ring ${baby.gender === 'male' ? 'avatar-boy' : 'avatar-girl'}" style="width:56px; height:56px; border-width:3px; font-size:26px;">
          <img src="../assets/images/avatars/${baby.gender === 'male' ? 'boy' : 'girl'}_avatar${baby.avatar_id || 1}.png" alt="Baby avatar">
        </div>
        <div class="nav-text" style="flex:1;">
          <div class="nav-card-title">${baby.full_name}</div>
          <div class="nav-card-sub">${calculateAge(baby.date_of_birth)}</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="#8C7B8E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    `).join('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

function selectBaby(babyId) {
  localStorage.setItem('babycare_selected_baby', babyId);
  window.location.href = 'dashboard.html';
}

function resetBabyForm() {
  document.getElementById('babyForm').reset();
  document.getElementById('babyAvatarId').value = '1';
  renderAvatarPicker('male', 1);
  clearAlert('babyModalAlert');
}

async function handleAddBaby(e) {
  e.preventDefault();
  clearAlert('babyModalAlert');

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
    await apiRequest('/babies', { method: 'POST', body: JSON.stringify(payload) });

    bootstrap.Modal.getInstance(document.getElementById('addBabyModal')).hide();
    await loadBabies();
  } catch (err) {
    showAlert('babyModalAlert', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Baby';
  }
}
