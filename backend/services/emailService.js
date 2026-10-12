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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(isoDate);
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
}

async function sendMedicineReminderEmail(to, { medicineName, babyName, dosage }) {
  await sendBrevoEmail({
    to,
    subject: 'Medicine Reminder — BabyCare',
    htmlContent: `<p>Time to give <strong>${escapeHtml(medicineName)}</strong> to <strong>${escapeHtml(babyName)}</strong>.</p>${dosage ? `<p>Dosage: ${escapeHtml(dosage)}</p>` : ''}<p>This is an automatic reminder from BabyCare.</p>`
  });
}

async function sendVaccineReminderEmail(to, { babyName, vaccines }) {
  const count = vaccines.length;
  const items = vaccines
    .map((v) => `<li><strong>${escapeHtml(v.name)}</strong> — scheduled ${escapeHtml(formatDateLabel(v.scheduledDate))} (${v.status === 'overdue' ? 'overdue' : 'due now'})</li>`)
    .join('');

  await sendBrevoEmail({
    to,
    subject: `Vaccine Reminder for ${babyName} — BabyCare`,
    htmlContent: `<p><strong>${escapeHtml(babyName)}</strong> has ${count} vaccine${count === 1 ? '' : 's'} waiting:</p><ul>${items}</ul><p>Please visit the clinic to get ${count === 1 ? 'it' : 'them'} done.</p><p>This is an automatic reminder from BabyCare.</p>`
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendMedicineReminderEmail, sendVaccineReminderEmail };
