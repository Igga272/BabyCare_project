const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendBrevoEmail({ to, subject, htmlContent }) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available in this Node.js version. Node 18+ is required, or a fetch polyfill must be added.');
  }

  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is missing from environment variables.');
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM is missing from environment variables.');
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: process.env.EMAIL_FROM_NAME || 'BabyCare', email: process.env.EMAIL_FROM },
      to: [{ email: to }],
      subject,
      htmlContent
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    console.error('Brevo API error:', response.status, errorBody.code || '', errorBody.message || '');
    throw new Error(errorBody.message || `Brevo API responded with status ${response.status}`);
  }
}

async function sendVerificationEmail(to, code) {
  await sendBrevoEmail({
    to,
    subject: 'Verify your BabyCare account',
    htmlContent: `<p>Your BabyCare verification code is:</p><h2 style="letter-spacing:4px;">${code}</h2><p>This code expires in 5 minutes.</p>`
  });
}

async function sendPasswordResetEmail(to, code) {
  await sendBrevoEmail({
    to,
    subject: 'Reset your BabyCare password',
    htmlContent: `<p>Your BabyCare password reset code is:</p><h2 style="letter-spacing:4px;">${code}</h2><p>This code expires in 5 minutes. If you did not request this, you can safely ignore this email.</p>`
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };