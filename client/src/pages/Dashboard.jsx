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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          Hostel Dashboard
        </h1>

        {user ? (
          <div className="mb-6">
            <p className="text-lg">
              Welcome, <span className="font-semibold">{user.name}</span> 👋
            </p>
            <p className="text-gray-600">Role: {user.role}</p>
            <p className="text-gray-600">Email: {user.email}</p>
          </div>
        ) : (
          <p className="text-red-500">No user info available</p>
        )}

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => navigate("/rooms")}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Rooms
          </button>
          <button
            onClick={() => navigate("/maintenance")}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Maintenance
          </button>
          <button
            onClick={() => navigate("/billing")}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Billing
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
