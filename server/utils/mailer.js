const nodemailer = require('nodemailer');

// Ways to send email, chosen by which environment variables exist (first match wins):
//  1. Resend HTTP API (RESEND_API_KEY) - works on hosts that block SMTP ports, like Render's free tier
//  2. Brevo HTTP API (BREVO_API_KEY + BREVO_SENDER_EMAIL)
//  3. SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) - fine for local development
// With none of them, emails are skipped (and logged) so the app still works.
const resendEnabled = () => Boolean(process.env.RESEND_API_KEY);
const brevoEnabled = () => Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
const smtpEnabled = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const emailEnabled = () => resendEnabled() || brevoEnabled() || smtpEnabled();

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

async function sendWithResend(to, subject, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      // Without a verified domain, Resend only allows onboarding@resend.dev
      from: process.env.RESEND_FROM || 'Hostel Management <onboarding@resend.dev>',
      to: [to],
      subject,
      text,
      html: buildHtml(text)
    })
  });
  if (!res.ok) throw new Error(`Resend API ${res.status}: ${await res.text()}`);
}

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
// Returns { ok, via, error } so callers (like the admin "test email" button) can show what happened.
async function sendEmailDetailed(to, subject, text) {
  if (!to) return { ok: false, error: 'No recipient address' };
  if (!emailEnabled()) {
    console.log(`[email skipped - no email service configured] to=${to} subject="${subject}"`);
    return { ok: false, error: 'No email service configured' };
  }
  try {
    let via;
    if (resendEnabled()) { via = 'Resend'; await sendWithResend(to, subject, text); }
    else if (brevoEnabled()) { via = 'Brevo'; await sendWithBrevo(to, subject, text); }
    else { via = 'SMTP'; await sendWithSmtp(to, subject, text); }
    console.log(`📧 Email sent via ${via} to ${to}`);
    return { ok: true, via };
  } catch (err) {
    console.error('Email error:', err.message);
    return { ok: false, error: err.message };
  }
}

async function sendEmail(to, subject, text) {
  return (await sendEmailDetailed(to, subject, text)).ok;
}

module.exports = { sendEmail, sendEmailDetailed, emailEnabled };