import { Navigate } from "react-router-dom";

// Sends visitors to /login when not signed in. Pass `roles` to also limit a page to certain roles.
function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles) {
    const getRole = () => {
      try {
        return JSON.parse(localStorage.getItem("user"))?.role;
      } catch {
        return null;
      }
    };
    if (!roles.includes(getRole())) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
}

export default ProtectedRoute;
