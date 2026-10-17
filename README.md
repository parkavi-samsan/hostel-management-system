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
- Email (SMTP / Nodemailer) and SMS (Twilio) for billing, maintenance and room events; residents can switch email/SMS on or off in their profile

**Data management**
- Admin can download a full JSON backup (password hashes excluded) and save backups on the server; an automatic daily backup keeps the latest 7

**Dashboard**
- Occupancy rate, residents, open requests, billed / collected / pending amounts, revenue chart, occupancy and maintenance charts

## 🛠️ Tech Stack

**Frontend:** React (Vite), Tailwind CSS, React Router, Axios, Recharts
**Backend:** Node.js, Express.js
**Database:** MongoDB with Mongoose
**Auth:** JWT, bcryptjs
**Integrations:** Razorpay (payments), Nodemailer (email), Twilio (SMS)

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

Only `PORT`, `MONGO_URI` and `JWT_SECRET` are required. Razorpay, SMTP and Twilio are optional: when their variables are missing, online payment falls back to demo mode and email / SMS are skipped (logged in the server console).

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
