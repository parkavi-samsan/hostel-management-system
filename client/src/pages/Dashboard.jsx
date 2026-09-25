import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const cards = [
    ...(user?.role === 'admin' ? [{
      title: "Residents",
      desc: "View all registered residents",
      icon: "👤",
      color: "from-orange-500 to-orange-600",
      path: "/residents"
    }] : []),
    {
      title: "Rooms",
      desc: "View and manage room allocation",
      icon: "🛏️",
      color: "from-blue-500 to-blue-600",
      path: "/rooms"
    },
    {
      title: "Maintenance",
      desc: "Track and update maintenance requests",
      icon: "🔧",
      color: "from-emerald-500 to-emerald-600",
      path: "/maintenance"
    },
    {
      title: "Billing",
      desc: "Manage resident bills and payments",
      icon: "💰",
      color: "from-purple-500 to-purple-600",
      path: "/billing"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-bold text-indigo-700">🏨 Hostel Management</h1>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome card */}
        {user ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold text-gray-800">
                Welcome back, {user.name} 👋
              </p>
              <p className="text-gray-500 mt-1">{user.email}</p>
            </div>
            <span className="capitalize bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full">
              {user.role}
            </span>
          </div>
        ) : (
          <p className="text-red-500 mb-8">No user info available</p>
        )}

        {/* Feature cards */}
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