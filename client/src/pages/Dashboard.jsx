import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  const isManager = user?.role === "admin" || user?.role === "staff";

  useEffect(() => {
    if (isManager) {
      api.get("/stats").then((res) => setStats(res.data)).catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const cards = [
    ...(user?.role === "admin"
      ? [
          { title: "Residents", desc: "View all registered residents", icon: "👤", color: "from-orange-500 to-orange-600", path: "/residents" },
          { title: "User Management", desc: "Manage roles and account status", icon: "⚙️", color: "from-slate-600 to-slate-700", path: "/users" }
        ]
      : []),
    { title: "Rooms", desc: "View and manage room allocation", icon: "🛏️", color: "from-blue-500 to-blue-600", path: "/rooms" },
    { title: "Maintenance", desc: "Track and update maintenance requests", icon: "🔧", color: "from-emerald-500 to-emerald-600", path: "/maintenance" },
    { title: "Billing", desc: "Manage resident bills and payments", icon: "💰", color: "from-purple-500 to-purple-600", path: "/billing" }
  ];

  const maintenanceData = stats
    ? [
        { name: "Pending", value: stats.maintenance.pending },
        { name: "In Progress", value: stats.maintenance.inProgress },
        { name: "Resolved", value: stats.maintenance.resolved }
      ]
    : [];
  const MAINT_COLORS = ["#9ca3af", "#f59e0b", "#10b981"];

  const occupancyData = stats
    ? [
        { name: "Occupied", value: stats.rooms.totalOccupants },
        { name: "Vacant", value: Math.max(stats.rooms.totalCapacity - stats.rooms.totalOccupants, 0) }
      ]
    : [];
  const OCC_COLORS = ["#6366f1", "#e5e7eb"];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-bold text-indigo-700">🏨 Hostel Management</h1>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {user && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold text-gray-800">Welcome back, {user.name} 👋</p>
              <p className="text-gray-500 mt-1">{user.email}</p>
            </div>
            <span className="capitalize bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full">
              {user.role}
            </span>
          </div>
        )}

        {/* Statistics (admin/staff) */}
        {isManager && stats && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Occupancy Rate" value={`${stats.rooms.occupancyRate}%`} sub={`${stats.rooms.totalOccupants}/${stats.rooms.totalCapacity} beds filled`} color="text-indigo-600" />
              <StatCard label="Total Rooms" value={stats.rooms.total} sub={`${stats.rooms.available} with vacancy`} color="text-blue-600" />
              <StatCard label="Residents" value={stats.totalResidents} color="text-orange-500" />
              <StatCard label="Open Requests" value={stats.maintenance.pending + stats.maintenance.inProgress} sub={`${stats.maintenance.resolved} resolved`} color="text-emerald-600" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard label="Total Billed" value={`₹${stats.billing.totalBilled}`} color="text-gray-800" />
              <StatCard label="Collected" value={`₹${stats.billing.totalCollected}`} color="text-green-600" />
              <StatCard label="Pending Dues" value={`₹${stats.billing.totalPending}`} color="text-red-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
                <h3 className="font-semibold text-gray-800 mb-4">Monthly Revenue</h3>
                {stats.monthlyRevenue.length === 0 ? (
                  <p className="text-sm text-gray-400 py-10 text-center">No billing data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pending" name="Pending" fill="#f87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Occupancy</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={occupancyData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {occupancyData.map((_, i) => <Cell key={i} fill={OCC_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8">
              <h3 className="font-semibold text-gray-800 mb-4">Maintenance Requests by Status</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={maintenanceData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {maintenanceData.map((_, i) => <Cell key={i} fill={MAINT_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Navigation cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {cards.map((c) => (
            <button
              key={c.title}
              onClick={() => navigate(c.path)}
              className="text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition transform"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-2xl mb-4`}>
                {c.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-800">{c.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{c.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;