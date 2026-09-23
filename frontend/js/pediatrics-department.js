let hospitalData = null;

document.addEventListener('DOMContentLoaded', () => {
  loadHospitalInfo();
  loadDoctors();
});

async function loadHospitalInfo() {
  try {
    const result = await apiRequest('/clinics/hospital-info');
    hospitalData = result.data;

    document.getElementById('hospitalName').textContent = hospitalData.name;
    document.getElementById('hospitalAddress').textContent = hospitalData.address || '—';
    document.getElementById('hospitalFloor').textContent =
      (hospitalData.floor || hospitalData.room) ? `${hospitalData.floor || ''} ${hospitalData.room ? 'Rm ' + hospitalData.room : ''}`.trim() : '—';
    document.getElementById('hospitalHours').textContent = hospitalData.operating_hours || '—';
    document.getElementById('hospitalContact').textContent = hospitalData.contact_number || '—';

    loadMapsScript();
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

async function loadDoctors() {
  try {
    const result = await apiRequest('/doctors');
    const grid = document.getElementById('doctorGrid');

    if (result.data.length === 0) {
      grid.innerHTML = `<div class="empty-state tracker-card"><div class="empty-state-icon"><i data-lucide="stethoscope"></i></div><div class="section-heading">No doctors listed yet</div></div>`;
      return;
    }

    grid.innerHTML = result.data.map((d) => {
      const statusBadge = d.status === 'unavailable'
        ? `<span class="status-badge-figma status-cancelled-figma">Unavailable</span>`
        : `<span class="status-badge-figma status-completed-figma">Available</span>`;
      const days = d.available_days ? d.available_days.split(',').join(', ') : 'Not set';
      const timeRange = (d.available_time_start && d.available_time_end)
        ? `${d.available_time_start.slice(0,5)} – ${d.available_time_end.slice(0,5)}`
        : 'Not set';

      return `
        <div class="nav-card-figma" style="cursor:default;">
          <div class="d-flex justify-content-between align-items-start">
            <div class="nav-icon-badge purple"><i data-lucide="stethoscope" style="width:24px;height:24px;"></i></div>
            ${statusBadge}
          </div>
          <div class="nav-text">
            <div class="nav-card-title">${d.full_name}</div>
            <div class="nav-card-sub">${d.specialization || '—'}</div>
            <div class="nav-card-sub">Days: ${days}</div>
            <div class="nav-card-sub">Time: ${timeRange}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

function loadMapsScript() {
  apiRequest('/config/maps-key').then((result) => {
    const key = result.data.key;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }).catch(() => {
    showAlert('pageAlert', 'Could not load map configuration.');
  });
}

function initMap() {
  const center = (hospitalData && hospitalData.latitude && hospitalData.longitude)
    ? { lat: Number(hospitalData.latitude), lng: Number(hospitalData.longitude) }
    : { lat: 14.5764, lng: 121.1503 };

  const map = new google.maps.Map(document.getElementById('hospitalMap'), {
    center,
    zoom: 15
  });

  new google.maps.Marker({
    position: center,
    map,
    title: hospitalData ? hospitalData.name : 'Hospital'
  });
}