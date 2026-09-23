document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('forgotForm').addEventListener('submit', handleForgotPassword);
});

async function handleForgotPassword(e) {
  e.preventDefault();
  clearAlert('forgotAlert');

  const email = document.getElementById('email').value.trim();
  const btn = document.getElementById('forgotBtn');
  const btnText = document.getElementById('forgotBtnText');

  btn.disabled = true;
  btnText.textContent = 'Sending…';

  try {
    const result = await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    showAlert('forgotAlert', result.message, 'success');
    setTimeout(() => {
      window.location.href = `reset-password.html?email=${encodeURIComponent(email)}`;
    }, 1500);
  } catch (err) {
    showAlert('forgotAlert', err.message);
    btn.disabled = false;
    btnText.textContent = 'Send Reset Code';
  }
}