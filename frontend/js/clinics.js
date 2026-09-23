let clinicsCache = [];
let mapInstance = null;
let activeMarker = null;
let pendingFocusIndex = null;
let directionsService = null;
let directionsRenderer = null;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  loadMapsScript();
  loadClinics();
});

async function loadMapsScript() {
  try {
    const result = await apiRequest('/config/maps-key');
    const key = result.data.key;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  } catch (err) {
    showAlert('pageAlert', 'Could not load map configuration.');
  }
}

function initMap() {
  mapInstance = new google.maps.Map(document.getElementById('clinicMap'), {
    center: { lat: 14.5764, lng: 121.1503 },
    zoom: 12,
    disableDefaultUI: false,
    zoomControl: true
  });

  if (pendingFocusIndex !== null) {
    focusClinic(pendingFocusIndex);
    pendingFocusIndex = null;
  }
}

async function loadClinics() {
  try {
    const result = await apiRequest('/clinics');
    clinicsCache = result.data;

    const grid = document.getElementById('clinicGrid');

    if (clinicsCache.length === 0) {
      grid.innerHTML = `<div class="empty-state tracker-card"><div class="empty-state-icon"><i data-lucide="hospital"></i></div><div class="section-heading">No clinics available yet</div></div>`;
      return;
    }

    grid.innerHTML = clinicsCache.map((clinic, index) => `
      <div class="nav-card-figma">
        <div class="nav-icon-badge purple">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2 3 7v13h18V7z" stroke="#8B6FD1" stroke-width="2" stroke-linejoin="round"/><path d="M9 21v-6h6v6" stroke="#8B6FD1" stroke-width="2"/></svg>
        </div>
        <div class="nav-text">
          <div class="nav-card-title">${clinic.name}</div>
          <div class="nav-card-sub">${clinic.address || 'Address not available'}</div>
          <div class="nav-card-sub">${clinic.contact_number || ''}</div>
        </div>
        <button type="button" class="app-button" style="width:auto; padding:10px 18px; margin-top: 4px; font-size: 14px;" onclick="focusClinic(${index})">Get Directions</button>
      </div>
    `).join('');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

function focusClinic(index) {
  const clinic = clinicsCache[index];
  if (!clinic || !clinic.latitude || !clinic.longitude) {
    showAlert('pageAlert', 'This clinic has no map location saved yet.');
    return;
  }

  if (!mapInstance) {
    pendingFocusIndex = index;
    return;
  }

  const destination = { lat: Number(clinic.latitude), lng: Number(clinic.longitude) };

  if (activeMarker) {
    activeMarker.setMap(null);
  }

  clearAlert('pageAlert');
  showAlert('pageAlert', 'Getting your location…', 'info');

  if (!navigator.geolocation) {
    showAlert('pageAlert', 'Your browser does not support location. Showing clinic location only.');
    dropClinicPin(clinic, destination);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const origin = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      clearAlert('pageAlert');
      drawRoute(origin, destination, clinic);
    },
    (error) => {
      const errorMessages = {
        1: 'Location permission denied. Please allow location access for this site.',
        2: 'Your location is currently unavailable (no GPS/network signal).',
        3: 'Getting your location took too long (timeout).'
      };
      showAlert('pageAlert', `${errorMessages[error.code] || error.message} Showing clinic location only.`);
      dropClinicPin(clinic, destination);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function dropClinicPin(clinic, destination) {
  activeMarker = new google.maps.Marker({
    position: destination,
    map: mapInstance,
    title: clinic.name,
    animation: google.maps.Animation.DROP
  });

  const infoWindow = new google.maps.InfoWindow({
    content: `<strong>${clinic.name}</strong><br>${clinic.address || ''}<br>${clinic.contact_number || ''}`
  });
  activeMarker.addListener('click', () => infoWindow.open(mapInstance, activeMarker));
  infoWindow.open(mapInstance, activeMarker);

  mapInstance.panTo(destination);
  mapInstance.setZoom(15);
  document.getElementById('clinicMap').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function drawRoute(origin, destination, clinic) {
  if (!directionsService) {
    directionsService = new google.maps.DirectionsService();
  }
  if (!directionsRenderer) {
    directionsRenderer = new google.maps.DirectionsRenderer({ map: mapInstance, suppressMarkers: false });
  }

  directionsService.route(
    {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING
    },
    (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);

        const leg = result.routes[0].legs[0];
        showAlert('pageAlert', `${clinic.name}: ${leg.distance.text}, about ${leg.duration.text} away.`, 'success');

        document.getElementById('clinicMap').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        showAlert('pageAlert', `Could not calculate directions (${status}). Showing clinic location only.`);
        dropClinicPin(clinic, destination);
      }
    }
  );
}
