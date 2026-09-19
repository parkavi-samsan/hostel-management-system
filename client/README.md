# Hostel Management System

A full-stack MERN application for managing hostel operations — room allocation, maintenance requests, resident billing, and role-based access for admins, staff, and residents.

## Live Demo

- **Frontend (Netlify):** https://jazzy-lolly-9debdf.netlify.app
- **Backend (Render):** https://hostel-management-system-6e7v.onrender.com

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, React Router, Axios
- **Backend:** Node.js, Express
- **Database:** MongoDB (Atlas) with Mongoose
- **Auth:** JWT, bcrypt

## Features

- **Auth:** Register/login with JWT, role-based access (admin, staff, resident)
- **Rooms:** Admin can add rooms; everyone can view room list, type, capacity, rent, and status
- **Maintenance:** Residents raise requests; admin/staff can view all requests and update status (pending → in-progress → resolved)
- **Billing:** Admin generates bills per resident per month; residents view their bills; bills can be marked as paid

## Project Structure