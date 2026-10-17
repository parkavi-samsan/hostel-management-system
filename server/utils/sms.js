// SMS through Twilio's REST API (no extra package needed - uses Node's built-in fetch).
// Enabled only when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM are set.
const smsEnabled = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

// 10-digit Indian numbers get the +91 prefix; numbers already in +country form are kept
function formatNumber(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  return null;
}

// Never throws: a failed SMS must not break the request that triggered it.
async function sendSms(phone, message) {
  const to = formatNumber(phone);
  if (!to) return false;
  if (!smsEnabled()) {
    console.log(`[sms skipped - Twilio not configured] to=${to}`);
    return false;
  }
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM, Body: message }).toString()
    });
    if (!res.ok) {
      console.error('SMS error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('SMS error:', err.message);
    return false;
  }
}

module.exports = { sendSms, smsEnabled };
