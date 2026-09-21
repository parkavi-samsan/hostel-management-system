# 🏨 Hostel Management System

A full-stack web application designed to simplify and manage hostel operations efficiently.

## 📌 Project Overview

The Hostel Management System provides a centralized platform for managing hostel-related activities such as user authentication, room management, billing, and maintenance requests.

The application follows a client-server architecture with a React frontend and Node.js/Express backend connected to MongoDB.
## 🔗 Live Demo

- **Frontend (Netlify):** https://jazzy-lolly-9debdf.netlify.app
- **Backend (Render):** https://hostel-management-system-6e7v.onrender.com
## ✨ Features

- 🔐 User Registration and Login
- 🔑 JWT-based Authentication
- 🛏️ Room Management
- 💰 Billing Management
- 🔧 Maintenance Request Management
- 👤 User Management
- 🔒 Protected Routes
- 🗄️ MongoDB Database
- 🌐 REST API

## 🛠️ Technologies Used

### Frontend

- React.js
- JavaScript
- HTML
- CSS
- Vite

### Backend

- Node.js
- Express.js

### Database

- MongoDB
- Mongoose

### Authentication & Security

- JSON Web Token (JWT)
- bcryptjs

### Other Tools

- CORS
- dotenv
- Nodemon
- Git
- GitHub
- VS Code

## 📂 Project Structure

```text
hostel-management-system/
│
├── client/
│   └── Frontend files
│
├── server/
│   ├── middleware/
│   │   └── authMiddleware.js
│   │
│   ├── models/
│   │   ├── Bill.js
│   │   ├── MaintenanceRequest.js
│   │   ├── Room.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── billingRoutes.js
│   │   ├── maintenanceRoutes.js
│   │   └── roomRoutes.js
│   │
│   ├── .env
│   ├── server.js
│   └── package.json
│
├── package.json
├── package-lock.json
└── readme.md