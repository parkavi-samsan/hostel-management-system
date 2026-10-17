import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Top bar shared by the newer pages: title, link back to the dashboard, and logout
function PageNav({ title, maxWidth = 'max-w-5xl' }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className={`${maxWidth} mx-auto flex justify-between items-center px-6 py-4`}>
        <h1 className="text-xl font-bold text-indigo-700">{title}</h1>
        <div className="flex gap-3 items-center">
          <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">Dashboard</Link>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default PageNav;
