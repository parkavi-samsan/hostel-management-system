import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Residents() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [residents, setResidents] = useState([]);
  const [error, setError] = useState('');

  const fetchResidents = async () => {
    try {
      const res = await api.get('/residents');
      setResidents(res.data);
    } catch (err) {
      setError('Failed to load residents');
    }
  };

  useEffect(() => { fetchResidents(); }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-bold text-indigo-700">👤 Residents</h1>
          <div className="flex gap-3 items-center">
            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">Dashboard</Link>
            <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-1">Total Residents: {residents.length}</h2>
          <p className="text-sm text-gray-500">All registered residents in the hostel</p>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Resident ID</th>
              </tr>
            </thead>
            <tbody>
              {residents.length === 0 ? (
                <tr><td colSpan="4" className="p-6 text-center text-gray-400">No residents registered yet</td></tr>
              ) : residents.map((r) => (
                <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium">{r.name}</td>
                  <td className="p-4">{r.email}</td>
                  <td className="p-4">{r.phone || '-'}</td>
                  <td className="p-4 text-xs text-gray-400">{r._id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Residents;