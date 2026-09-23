document.addEventListener('DOMContentLoaded', () => {
  loadTodayNotifications();
  setInterval(loadTodayNotifications, 45000);
});

async function loadTodayNotifications() {
  try {
    const result = await apiRequest('/notifications');
    const notifications = result.data;
    const today = new Date().toISOString().split('T')[0];
    const dueToday = notifications.filter((n) => n.scheduled_date === today && !n.is_read);

    dueToday.forEach((n) => showNotificationToast(n));
  } catch (err) {
    return;
  }
}

function showNotificationToast(notification) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const isMedicine = notification.type === 'medicine';
  const icon = isMedicine ? 'pill' : 'syringe';
  const title = isMedicine ? 'Medicine Reminder' : 'Vaccine due today';
  const sub = isMedicine
    ? `Time to give ${notification.medicine_name} to ${notification.baby_name}.${notification.dosage ? ' Dosage: ' + notification.dosage + '.' : ''}`
    : `${notification.vaccine_name} — ${notification.baby_name}`;

  const toast = document.createElement('div');
  toast.className = 'vaccine-toast';
  toast.innerHTML = `
    <div class="vaccine-toast-icon"><i data-lucide="${icon}"></i></div>
    <div class="vaccine-toast-body">
      <div class="vaccine-toast-title">${title}</div>
      <div class="vaccine-toast-sub">${sub}</div>
    </div>
    <button class="vaccine-toast-close" type="button">&times;</button>
  `;

  const dismiss = () => {
    apiRequest(`/notifications/${notification.id}/read`, { method: 'POST' }).catch(() => {});
    toast.classList.add('vaccine-toast-hide');
    setTimeout(() => toast.remove(), 250);
  };

  toast.querySelector('.vaccine-toast-close').addEventListener('click', dismiss);

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();
  setTimeout(dismiss, 8000);
}