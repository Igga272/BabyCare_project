const API_BASE_URL = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('babycare_token');
}

function setToken(token) {
  localStorage.setItem('babycare_token', token);
}

function clearToken() {
  localStorage.removeItem('babycare_token');
  localStorage.removeItem('babycare_user');
}

function getStoredUser() {
  const raw = localStorage.getItem('babycare_user');
  return raw ? JSON.parse(raw) : null;
}

function setStoredUser(user) {
  localStorage.setItem('babycare_user', JSON.stringify(user));
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
}

async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearToken();
      window.location.href = 'login.html';
    }
    throw new Error(body.message || 'Something went wrong');
  }

  return body;
}

function showAlert(containerId, message, type = 'danger') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type} d-flex align-items-center" role="alert">
      <div>${message}</div>
    </div>
  `;
}

function clearAlert(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

function calculateAge(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;

  if (months < 1) {
    const days = Math.floor((now - dob) / (1000 * 60 * 60 * 24));
    return `${days} day${days === 1 ? '' : 's'} old`;
  }
  if (months < 24) {
    return `${months} month${months === 1 ? '' : 's'} old`;
  }
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return `${years}y ${remMonths}m old`;
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_BADGE_MAP = {
  upcoming: { label: 'Upcoming', className: 'badge-upcoming' },
  due: { label: 'Due', className: 'badge-due' },
  completed: { label: 'Completed', className: 'badge-completed' },
  overdue: { label: 'Overdue', className: 'badge-overdue' }
};

function statusBadgeHtml(status) {
  const info = STATUS_BADGE_MAP[status] || { label: status, className: 'badge-upcoming' };
  return `<span class="badge-pill ${info.className}">${info.label}</span>`;
}

function setupOtpBoxes(containerId) {
  const container = document.getElementById(containerId);
  const boxes = Array.from(container.querySelectorAll('.otp-box'));

  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/[^0-9]/g, '').slice(0, 1);
      if (box.value && i < boxes.length - 1) {
        boxes[i + 1].focus();
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        boxes[i - 1].focus();
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      pasted.split('').forEach((char, idx) => {
        if (boxes[idx]) boxes[idx].value = char;
      });
      const nextIndex = Math.min(pasted.length, boxes.length - 1);
      boxes[nextIndex].focus();
    });
  });

  return {
    getValue: () => boxes.map((b) => b.value).join(''),
    clear: () => { boxes.forEach((b) => b.value = ''); boxes[0].focus(); },
    focusFirst: () => boxes[0].focus()
  };
}