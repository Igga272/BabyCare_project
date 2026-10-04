document.addEventListener('DOMContentLoaded', () => {
  if (getToken()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  const fullNameInput = document.getElementById('fullName');
  if (fullNameInput) {
    fullNameInput.addEventListener('input', handleNameInput);
  }

  const contactNumberInput = document.getElementById('contactNumber');
  if (contactNumberInput) {
    contactNumberInput.addEventListener('input', handlePhoneInput);
    contactNumberInput.addEventListener('focus', handlePhoneFocus);
  }

  const passwordInput = document.getElementById('password');
  if (passwordInput && document.getElementById('passwordWarning')) {
    passwordInput.addEventListener('input', handlePasswordInput);
  }
});

function handleNameInput(e) {
  const input = e.target;
  const pos = input.selectionStart;
  input.value = input.value.toUpperCase();
  input.selectionStart = input.selectionEnd = pos;
}

function handlePhoneFocus(e) {
  if (!e.target.value) {
    e.target.value = '+63';
  }
}

function handlePhoneInput(e) {
  const input = e.target;
  const warningEl = document.getElementById('contactNumberWarning');
  let digits = input.value.replace(/^\+63/, '').replace(/\D/g, '');

  if (digits.length > 10) {
    digits = digits.slice(0, 10);
    if (warningEl) warningEl.textContent = 'Phone number must be exactly 10 digits after +63.';
  } else if (warningEl) {
    warningEl.textContent = '';
  }

  input.value = '+63' + digits;
}

function handlePasswordInput(e) {
  const input = e.target;
  const warningEl = document.getElementById('passwordWarning');

  if (input.value.length > 10) {
    input.value = input.value.slice(0, 10);
    if (warningEl) warningEl.textContent = 'Password must be at most 10 characters.';
  } else if (warningEl) {
    warningEl.textContent = '';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  clearAlert('loginAlert');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('loginBtn');
  const btnText = document.getElementById('loginBtnText');

  btn.disabled = true;
  btnText.textContent = 'Logging in…';

  try {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setToken(result.data.token);
    setStoredUser(result.data.user);

    const role = result.data.user.role;
    if (role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else if (role === 'clinic') {
      window.location.href = 'clinic-dashboard.html';
    } else {
      window.location.href = 'my-babies.html';
    }
  } catch (err) {
    showAlert('loginAlert', err.message);
    btn.disabled = false;
    btnText.textContent = 'Login';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  clearAlert('registerAlert');

  const full_name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const contact_number = document.getElementById('contactNumber').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const btn = document.getElementById('registerBtn');
  const btnText = document.getElementById('registerBtnText');

  if (password !== confirmPassword) {
    showAlert('registerAlert', 'Passwords do not match.');
    return;
  }

  btn.disabled = true;
  btnText.textContent = 'Creating account…';

  try {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, contact_number })
    });

    showAlert('registerAlert', 'Account created! Redirecting to email verification…', 'success');
    setTimeout(() => {
      window.location.href = `verify-email.html?email=${encodeURIComponent(email)}`;
    }, 1200);
  } catch (err) {
    showAlert('registerAlert', err.message);
    btn.disabled = false;
    btnText.textContent = 'Create Account';
  }
}
