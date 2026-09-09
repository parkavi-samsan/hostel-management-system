import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Rooms from './pages/Rooms';
import Maintenance from './pages/Maintenance';
import Billing from './pages/Billing';

function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-blue-600 mb-2">Welcome, {user?.name}!</h1>
        <p className="text-gray-600 mb-4">Role: {user?.role}</p>
        <Link to="/rooms" className="block bg-blue-600 text-white text-center py-2 rounded hover:bg-blue-700 mb-3">
          Manage Rooms
        </Link>
        <Link to="/maintenance" className="block bg-purple-600 text-white text-center py-2 rounded hover:bg-purple-700 mb-3">
          Maintenance Requests
        </Link>
        <Link to="/billing" className="block bg-green-600 text-white text-center py-2 rounded hover:bg-green-700 mb-3">
          Billing
        </Link>
        <button
          onClick={logout}
          className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms"
        element={
          <ProtectedRoute>
            <Rooms />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute>
            <Maintenance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <Billing />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;