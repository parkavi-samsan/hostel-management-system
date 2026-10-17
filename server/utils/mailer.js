const nodemailer = require('nodemailer');

// Email is enabled only when SMTP settings exist in the environment.
// Without them, emails are skipped (and logged) so the app still works.
const emailEnabled = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

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

// Never throws: a failed email must not break the request that triggered it.
async function sendEmail(to, subject, text) {
  if (!to) return false;
  if (!emailEnabled()) {
    console.log(`[email skipped - SMTP not configured] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || `Hostel Management <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:16px">
        <h2 style="color:#4338ca;margin:0 0 12px">🏨 Hostel Management</h2>
        <p style="font-size:15px;color:#111827">${escapeHtml(text)}</p>
        <p style="font-size:12px;color:#9ca3af;margin-top:24px">This is an automated message. Log in to the portal for details.</p>
      </div>`
    });
    return true;
  } catch (err) {
    console.error('Email error:', err.message);
    return false;
  }
}

module.exports = { sendEmail, emailEnabled };
