let resetEmail = '';
let verifiedCode = '';
let codeOtp = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  resetEmail = params.get('email') || '';

  if (!resetEmail) {
    window.location.href = 'forgot-password.html';
    return;
  }

  document.getElementById('emailDisplay').textContent = resetEmail;
  codeOtp = setupOtpBoxes('resetCodeBoxes');
  codeOtp.focusFirst();
  document.getElementById('codeForm').addEventListener('submit', handleVerifyCode);
  document.getElementById('resetForm').addEventListener('submit', handleResetPassword);
});

async function handleVerifyCode(e) {
  e.preventDefault();
  clearAlert('resetAlert');

  const code = codeOtp.getValue();
  const btn = document.getElementById('verifyCodeBtn');
  const btnText = document.getElementById('verifyCodeBtnText');

  if (code.length !== 6) {
    showAlert('resetAlert', 'Please enter the 6-digit reset code.');
    return;
  }

  btn.disabled = true;
  btnText.textContent = 'Verifying…';

  try {
    await apiRequest('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email: resetEmail, code })
    });

    verifiedCode = code;
    clearAlert('resetAlert');
    document.getElementById('codeForm').classList.add('d-none');
    document.getElementById('resetForm').classList.remove('d-none');
  } catch (err) {
    showAlert('resetAlert', err.message);
    codeOtp.clear();
    btn.disabled = false;
    btnText.textContent = 'Verify Code';
  }
}

async function handleResetPassword(e) {
  e.preventDefault();
  clearAlert('resetAlert');

  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;
  const btn = document.getElementById('resetBtn');
  const btnText = document.getElementById('resetBtnText');

  if (!newPassword || !confirmNewPassword) {
    showAlert('resetAlert', 'Please fill in all fields.');
    return;
  }

  if (newPassword.length < 8) {
    showAlert('resetAlert', 'Password must be at least 8 characters.');
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showAlert('resetAlert', 'Passwords do not match.');
    return;
  }

  btn.disabled = true;
  btnText.textContent = 'Resetting…';

  try {
    await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: resetEmail, code: verifiedCode, new_password: newPassword })
    });

    showAlert('resetAlert', 'Password reset successfully! Redirecting to login…', 'success');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  } catch (err) {
    showAlert('resetAlert', err.message);
    btn.disabled = false;
    btnText.textContent = 'Reset Password';
  }
}