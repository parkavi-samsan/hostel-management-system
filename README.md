# 🏨 Hostel Management System

A full-stack MERN web application to manage hostel operations — room allocation, resident billing, maintenance requests, and role-based access for admins, staff, and residents.

## 🔗 Live Demo

- **Frontend:** https://jazzy-lolly-9debdf.netlify.app
- **Backend API:** https://hostel-management-system-6e7v.onrender.com

## 🔑 Demo Credentials

| Role     | Email               | Password     |
|----------|---------------------|--------------|
| Admin    | admin@test.com      | admin123     |
| Resident | resident@test.com   | resident123  |

> You can also register a new account from the app (defaults to `resident` role).

## ✨ Features

- 🔐 Register/Login with JWT authentication, role-based access (admin / staff / resident)
- 🛏️ Room management — admin adds rooms; everyone views room list, type, capacity, rent, and status
- 🔧 Maintenance requests — residents raise issues; admin/staff update status (pending → in-progress → resolved)
- 💰 Billing — admin generates monthly bills per resident; bills can be marked as paid
- 🔒 Protected routes based on login state and user role

## 🛠️ Tech Stack

**Frontend:** React (Vite), Tailwind CSS, React Router, Axios
**Backend:** Node.js, Express.js
**Database:** MongoDB with Mongoose
**Auth:** JWT, bcryptjs

## 📂 Project Structure

hostel-management-system/
├── client/
│   └── src/
│       ├── pages/         # Login, Register, Dashboard, Rooms, Maintenance, Billing
│       ├── context/       # AuthContext
│       ├── components/    # ProtectedRoute
│       └── services/      # Axios instance
└── server/
    ├── models/            # User, Room, MaintenanceRequest, Bill
    ├── routes/            # authRoutes, roomRoutes, maintenanceRoutes, billingRoutes
    └── middleware/        # authMiddleware (JWT + role check)

## ▶️ Running Locally

**Backend**

cd server
npm install
npm run dev

Create `server/.env`:

PORT=5000
MONGO_URI=<your MongoDB Atlas URI>
JWT_SECRET=<any secret string>

**Frontend**

cd client
npm install
npm run dev

## 📝 Notes

- Payment gateway and SMS notifications are simplified for this build (in-app status tracking only) due to project timeline.