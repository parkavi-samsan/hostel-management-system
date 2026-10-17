const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('./mailer');
const { sendSms } = require('./sms');

const TITLES = {
  maintenance: 'Maintenance update',
  billing: 'Billing notice',
  room: 'Room update',
  general: 'Notification'
};

// Creates an in-app notification and also sends an email (and an SMS if the user
// turned SMS alerts on). It never throws, so a failed notification can never
// break the main request.
async function notify(userId, message, type = 'general') {
  try {
    if (!userId) return;
    await Notification.create({ userId, message, type });

    const user = await User.findById(userId).select('email phone notifyEmail notifySms isActive');
    if (!user || !user.isActive) return;

    if (user.notifyEmail !== false) {
      await sendEmail(user.email, `Hostel: ${TITLES[type] || TITLES.general}`, message);
    }
    if (user.notifySms === true && user.phone) {
      await sendSms(user.phone, `Hostel: ${message}`);
    }
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

// Notifies every active user who has one of the given roles
async function notifyRoles(roles, message, type = 'general') {
  try {
    const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
    await Promise.all(users.map((u) => notify(u._id, message, type)));
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

module.exports = { notify, notifyRoles };
