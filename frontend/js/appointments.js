let appointmentsCache = [];
let activeTab = 'pending';

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  document.querySelectorAll('#apptTabs .nav-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#apptTabs .nav-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      renderTab();
    });
  });

  loadAppointments();
});

const STATUS_MAP = {
  pending: { label: 'Pending', className: 'status-pending-figma' },
  confirmed: { label: 'Confirmed', className: 'status-confirmed-figma' },
  completed: { label: 'Completed', className: 'status-completed-figma' },
  cancelled: { label: 'Cancelled', className: 'status-cancelled-figma' },
  missed: { label: 'Missed', className: 'status-overdue-figma' }
};

async function loadAppointments() {
  try {
    const result = await apiRequest('/appointments');
    appointmentsCache = result.data;
    renderTab();
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

function isPast(appt) {
  const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
  return apptDateTime < new Date();
}

function getFilteredAppointments() {
  if (activeTab === 'pending') {
    return appointmentsCache.filter((a) => a.status === 'pending');
  }
  if (activeTab === 'upcoming') {
    return appointmentsCache.filter((a) => a.status === 'confirmed' && !isPast(a));
  }
  if (activeTab === 'past') {
    return appointmentsCache.filter((a) => a.status === 'completed' || a.status === 'cancelled');
  }
  if (activeTab === 'missed') {
    return appointmentsCache.filter((a) => a.status === 'missed' || (a.status === 'confirmed' && isPast(a)));
  }
  return [];
}

function renderTab() {
  const appointments = getFilteredAppointments();
  const emptyMessages = {
    pending: 'No pending appointments.',
    upcoming: 'No upcoming appointments.',
    past: 'No past appointments yet.',
    missed: 'No missed appointments.'
  };

  if (appointments.length === 0) {
    document.getElementById('emptyStateText').textContent = emptyMessages[activeTab];
    document.getElementById('emptyState').classList.remove('d-none');
    document.getElementById('listContent').classList.add('d-none');
    return;
  }

  document.getElementById('emptyState').classList.add('d-none');
  document.getElementById('listContent').classList.remove('d-none');

  const tbody = document.getElementById('appointmentsTableBody');
  tbody.innerHTML = appointments.map((a) => {
    const status = STATUS_MAP[a.status] || { label: a.status, className: 'status-pending-figma' };
    const canCancel = a.status === 'pending' || a.status === 'confirmed';

    return `
      <tr>
        <td class="fw-bold">${a.babies?.full_name || '—'}</td>
        <td>${a.doctors?.full_name || '—'}</td>
        <td>${a.reason || '—'}</td>
        <td>${formatDate(a.appointment_date)}</td>
        <td>${a.appointment_time}</td>
        <td><span class="status-badge-figma ${status.className}">${status.label}</span></td>
        <td class="text-end">
          ${canCancel ? `<button class="btn btn-sm btn-soft-danger" onclick="cancelAppointment(${a.id})">Cancel</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

async function cancelAppointment(id) {
  const confirmed = window.confirm('Cancel this appointment?');
  if (!confirmed) return;

  try {
    await apiRequest(`/appointments/${id}/cancel`, { method: 'PUT' });
    await loadAppointments();
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}
