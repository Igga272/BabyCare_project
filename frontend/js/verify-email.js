let pendingEmail = '';
let resendCooldownInterval = null;
let codeOtp = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  pendingEmail = params.get('email') || '';

  if (!pendingEmail) {
    window.location.href = 'register.html';
    return;
  }

  document.getElementById('emailDisplay').textContent = pendingEmail;
  codeOtp = setupOtpBoxes('codeBoxes');
  codeOtp.focusFirst();
  document.getElementById('verifyForm').addEventListener('submit', handleVerify);
});

async function handleVerify(e) {
  e.preventDefault();
  clearAlert('verifyAlert');

  const code = codeOtp.getValue();
  const btn = document.getElementById('verifyBtn');
  const btnText = document.getElementById('verifyBtnText');

  if (code.length !== 6) {
    showAlert('verifyAlert', 'Please enter the 6-digit verification code.');
    return;
  }

  btn.disabled = true;
  btnText.textContent = 'Verifying…';

  try {
    await apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email: pendingEmail, code })
    });

    showAlert('verifyAlert', 'Email verified! Redirecting to login…', 'success');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  } catch (err) {
    showAlert('verifyAlert', err.message);
    codeOtp.clear();
    btn.disabled = false;
    btnText.textContent = 'Verify';
  }
}

async function handleResend() {
  clearAlert('verifyAlert');

  try {
    const result = await apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: pendingEmail })
    });

    showAlert('verifyAlert', result.message, 'success');
    codeOtp.clear();
    startResendCooldown(60);
  } catch (err) {
    showAlert('verifyAlert', err.message);
  }
}

function startResendCooldown(seconds) {
  const resendLink = document.getElementById('resendLink');
  let remaining = seconds;
  resendLink.style.pointerEvents = 'none';
  resendLink.style.opacity = '0.5';
  resendLink.textContent = `Resend in ${remaining}s`;

  if (resendCooldownInterval) clearInterval(resendCooldownInterval);

  resendCooldownInterval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(resendCooldownInterval);
      resendLink.style.pointerEvents = 'auto';
      resendLink.style.opacity = '1';
      resendLink.textContent = 'Resend code';
    } else {
      resendLink.textContent = `Resend in ${remaining}s`;
    }
  }, 1000);
}