# 🏨 Hostel Management System

A full-stack MERN application to run a hostel: room allocation, resident records, maintenance requests, billing with online payments, financial reports, notifications, and role-based access for **admin**, **staff** and **resident** users.

## 🔗 Live Demo

- **Frontend:** https://jazzy-lolly-9debdf.netlify.app
- **Backend API:** https://hostel-management-system-6e7v.onrender.com

## 🔑 Demo Credentials

| Role     | Email             | Password    |
|----------|-------------------|-------------|
| Admin    | admin@test.com    | admin123    |
| Resident | resident@test.com | resident123 |

New accounts created from the Register page are always `resident`. Only an admin can promote a user.

## ✨ Features

**Room allocation**
- Admin adds, edits and deletes rooms (a room with residents cannot be deleted; capacity cannot drop below current occupants)
- Check-in / check-out with automatic occupancy and room status updates
- Residents set a preferred room type and notes; the allocation screen shows whether a room matches
- Full room change history per resident

**Resident information**
- Profile page: edit name, phone, emergency contact, room preference, alert settings, view room history
- Admin/staff resident list and a detailed resident record (dues, bills, requests, room history); admin can edit any resident record

**Maintenance requests**
- Residents raise requests with priority; admin assigns a staff member; staff/admin update status and add progress notes
- Residents are notified of every assignment, status change and note

**Billing and payments**
- Admin generates monthly bills (room fee, utilities, extra charges, discount, due date)
- Razorpay checkout with server-side order creation, signature verification and amount matching
- Payment plans (2–6 installments), printable invoices, cash/offline payment entry by admin
- Late fee (5%) and `overdue` status applied automatically by a background job, plus due-soon reminders

**Financial reporting** (admin)
- Expense tracking (add / edit / delete / filter by category)
- Reports page: revenue vs expenses vs net profit by month, expenses by category, occupancy by room type, occupancy rate over time (daily snapshots), CSV export

**Users and permissions**
- Admin user management: change roles, activate / deactivate accounts (takes effect immediately, even for logged-in users)
- Admins cannot change their own role or deactivate themselves

**Notifications**
- In-app notification bell for everyone
- Email (Resend API, or SMTP locally) and SMS (Twilio) for billing, maintenance and room events; residents can switch email/SMS on or off in their profile

**Data management**
- Admin can download a full JSON backup (password hashes excluded) and save backups on the server; an automatic daily backup keeps the latest 7

**Dashboard**
- Occupancy rate, residents, open requests, billed / collected / pending amounts, revenue chart, occupancy and maintenance charts

## ✅ Requirement Checklist (where to find each feature)

Backend files are in `server/`, pages in `client/src/pages/`. All paths below can be checked on the live demo with the demo logins above.

| Requirement | Backend (server/) | Page (client/src/pages/) |
|---|---|---|
| Assign rooms, check-in / check-out, automatic occupancy and status | `routes/roomRoutes.js` (`PUT /:id/checkin`, `PUT /:id/checkout`) | `Rooms.jsx` |
| Resident room preferences | `models/User.js` (`roomPreference`), `routes/roomRoutes.js` (`GET /suggest/:residentId`) | `Profile.jsx`, `Rooms.jsx`, `ResidentDetail.jsx` |
| Room edit / delete | `routes/roomRoutes.js` (`PUT /:id`, `DELETE /:id`) | `Rooms.jsx` |
| Assign maintenance to staff, progress notes | `routes/maintenanceRoutes.js` (`PUT /:id`, `GET /staff-list`) | `Maintenance.jsx` |
| Razorpay payment gateway | `routes/billingRoutes.js` (`create-order`, `verify-payment`) | `Billing.jsx` |
| Invoice, payment plans, billing reminders | `routes/billingRoutes.js` (`GET /:id`, `POST /:id/plan`, `POST /:id/remind`), `utils/scheduler.js` | `Billing.jsx` |
| Automatic late fee and overdue status | `routes/billingRoutes.js` (`refreshOverdue`), `utils/scheduler.js` (hourly job) | `Billing.jsx` |
| Emergency contact, resident profile page | `routes/authRoutes.js` (`GET/PUT /me`) | `Profile.jsx` |
| Edit resident records, room change history | `routes/residentRoutes.js` (`GET /:id`, `PUT /:id`), `routes/roomRoutes.js` (writes `roomHistory`) | `Residents.jsx`, `ResidentDetail.jsx` |
| Revenue / expense / occupancy reports, trends, charts | `routes/reportRoutes.js`, `routes/expenseRoutes.js`, `utils/snapshot.js` | `Reports.jsx`, `Expenses.jsx` |
| Admin user management, change roles, activate / deactivate | `routes/authRoutes.js` (`/users`, `/users/:id/role`, `/users/:id/status`), `middleware/authMiddleware.js` | `Users.jsx` |
| Data backup | `routes/adminRoutes.js`, `utils/backup.js` (daily automatic backup in `utils/scheduler.js`) | `Users.jsx` (Data Backup card) |
| In-app notifications (maintenance, billing, room availability) | `utils/notify.js`, `routes/notificationRoutes.js` | `components/NotificationBell.jsx` |
| Email notifications | `utils/mailer.js` (Resend API, Brevo API or SMTP), called from `utils/notify.js` | Profile alert settings, Users.jsx (Send test email) |
| SMS notifications | `utils/sms.js` (Twilio), called from `utils/notify.js` | Profile alert settings |
| Dashboard with statistics | `routes/statsRoutes.js` | `Dashboard.jsx` |

### How to verify quickly (as admin)

1. **Rooms** → check in *Test Resident*: occupancy updates and a notification is created.
2. **Billing** → create a bill, then pay it as the resident through Razorpay (test mode: use UPI `success@razorpay`).
3. **Expenses** → add an expense, then open **Reports** to see revenue vs expenses, charts and the CSV export.
4. **User Management** → change a role, deactivate a user, download a backup, send a test email.
5. **Residents** → open a resident to see the full record and edit it.

### Email and SMS status

Email and SMS are integrated in code and switch on through environment variables (see `server/.env.example`).

- **Email** works on the live demo through the Resend API (`RESEND_API_KEY`). Admins can check it from **User Management → Send test email**, and every billing, maintenance and room notification also sends an email. In Resend's free test mode (no verified sending domain) mail can only be delivered to the account owner's address, so the demo resident (*Test Resident*) uses that address. Sending to every resident needs a verified domain; only `RESEND_FROM` has to change. Locally, plain SMTP also works.
- **SMS** uses Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`) and is sent when a resident turns on SMS alerts in their profile. It needs Twilio credentials, which are not configured on the demo.
- **In-app notifications** (the bell) work for everyone.

## 🛠️ Tech Stack

**Frontend:** React (Vite), Tailwind CSS, React Router, Axios, Recharts
**Backend:** Node.js, Express.js
**Database:** MongoDB with Mongoose
**Auth:** JWT, bcryptjs
**Integrations:** Razorpay (payments), Resend / Nodemailer (email), Twilio (SMS)

## 📂 Project Structure

```
hostel-management-system/
├── client/src/
│   ├── pages/        # Login, Register, Dashboard, Rooms, Residents, ResidentDetail, Maintenance,
│   │                 # Billing, Expenses, Reports, Users, Profile
│   ├── components/   # ProtectedRoute (role aware), PageNav, NotificationBell
│   ├── context/      # AuthContext
│   └── services/     # Axios instance
└── server/
    ├── models/       # User, Room, MaintenanceRequest, Bill, Notification, Expense, OccupancySnapshot
    ├── routes/       # auth, rooms, residents, maintenance, billing, expenses, reports, stats, notifications, admin
    ├── middleware/   # authMiddleware (JWT + live role / active check)
    └── utils/        # notify, mailer, sms, scheduler, snapshot, backup
```

## ▶️ Running Locally

**Backend**

```
cd server
npm install
cp .env.example .env     # then fill in your values
npm run dev
```

Only `PORT`, `MONGO_URI` and `JWT_SECRET` are required. Razorpay, email (`RESEND_API_KEY`, or SMTP settings) and Twilio are optional: when their variables are missing, online payment falls back to demo mode and email / SMS are skipped (logged in the server console).

**Frontend**

```
cd client
npm install
npm run dev
```

## 🔐 Security notes

- Never commit `.env` files. Use `server/.env.example` as the template.
- Registration cannot choose a role; roles are changed only by an admin.
- Razorpay payments are verified on the server (HMAC signature and order/amount match).
- Server-side backups are stored in `server/backups/`. Some hosts (e.g. Render free tier) reset the disk on redeploy, so also use the **Download backup** button regularly.