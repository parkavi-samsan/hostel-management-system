import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
import Maintenance from "./pages/Maintenance";
import Billing from "./pages/Billing";
import Residents from "./pages/Residents";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import ResidentDetail from "./pages/ResidentDetail";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import NotificationBell from "./components/NotificationBell";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
          <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/residents" element={<ProtectedRoute roles={["admin", "staff"]}><Residents /></ProtectedRoute>} />
          <Route path="/residents/:id" element={<ProtectedRoute roles={["admin", "staff"]}><ResidentDetail /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute roles={["admin"]}><Users /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute roles={["admin"]}><Expenses /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={["admin"]}><Reports /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Default fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
      </Router>

      {/* Floating notification bell, visible on every page once logged in */}
      <NotificationBell />
    </AuthProvider>
  );
}

export default App;