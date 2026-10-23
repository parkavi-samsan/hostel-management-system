const nodemailer = require('nodemailer');

// Two ways to send email, chosen by which environment variables exist:
//  1. Brevo HTTP API (BREVO_API_KEY + BREVO_SENDER_EMAIL) - works on hosts that block SMTP ports, like Render's free tier
//  2. SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) - fine for local development
// With neither, emails are skipped (and logged) so the app still works.
const brevoEnabled = () => Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
const smtpEnabled = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const emailEnabled = () => brevoEnabled() || smtpEnabled();

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const buildHtml = (text) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:16px">
        <h2 style="color:#4338ca;margin:0 0 12px">🏨 Hostel Management</h2>
        <p style="font-size:15px;color:#111827">${escapeHtml(text)}</p>
        <p style="font-size:12px;color:#9ca3af;margin-top:24px">This is an automated message. Log in to the portal for details.</p>
      </div>`;

async function sendWithBrevo(to, subject, text) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || 'Hostel Management', email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: buildHtml(text)
    })
  });
  if (!res.ok) throw new Error(`Brevo API ${res.status}: ${await res.text()}`);
}

async function sendWithSmtp(to, subject, text) {
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || `Hostel Management <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html: buildHtml(text)
  });
}

// Never throws: a failed email must not break the request that triggered it.
async function sendEmail(to, subject, text) {
  if (!to) return false;
  if (!emailEnabled()) {
    console.log(`[email skipped - no email service configured] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    if (brevoEnabled()) await sendWithBrevo(to, subject, text);
    else await sendWithSmtp(to, subject, text);
    return true;
  } catch (err) {
    console.error('Email error:', err.message);
    return false;
  }
}

module.exports = { sendEmail, emailEnabled };