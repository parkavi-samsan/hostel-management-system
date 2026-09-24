import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Rooms() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({ roomNumber: '', type: 'single', capacity: 1, monthlyRent: '' });

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      setError('Failed to load rooms');
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const errs = {};
    if (!form.roomNumber.trim()) errs.roomNumber = 'Room number is required';
    if (!form.capacity || Number(form.capacity) < 1) errs.capacity = 'Capacity must be at least 1';
    if (!form.monthlyRent || Number(form.monthlyRent) <= 0) errs.monthlyRent = 'Enter a valid rent amount';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    try {
      await api.post('/rooms', form);
      setForm({ roomNumber: '', type: 'single', capacity: 1, monthlyRent: '' });
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add room');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const statusStyle = {
    available: 'bg-green-100 text-green-700',
    occupied: 'bg-yellow-100 text-yellow-700',
    maintenance: 'bg-red-100 text-red-700'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-bold text-indigo-700">🛏️ Room Management</h1>
          <div className="flex gap-3 items-center">
            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">Dashboard</Link>
            <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {user?.role === 'admin' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Add New Room</h2>
            <div className="flex flex-wrap gap-4 items-start">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Room Number</label>
                <input name="roomNumber" value={form.roomNumber} onChange={handleChange}
                  className={`border rounded-lg px-3 py-2 text-sm ${fieldErrors.roomNumber ? 'border-red-400' : 'border-gray-300'}`} />
                {fieldErrors.roomNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.roomNumber}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select name="type" value={form.type} onChange={handleChange} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="dorm">Dorm</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Capacity</label>
                <input type="number" name="capacity" value={form.capacity} onChange={handleChange}
                  className={`border rounded-lg px-3 py-2 text-sm w-20 ${fieldErrors.capacity ? 'border-red-400' : 'border-gray-300'}`} />
                {fieldErrors.capacity && <p className="text-red-500 text-xs mt-1">{fieldErrors.capacity}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Rent (₹)</label>
                <input type="number" name="monthlyRent" value={form.monthlyRent} onChange={handleChange}
                  className={`border rounded-lg px-3 py-2 text-sm w-28 ${fieldErrors.monthlyRent ? 'border-red-400' : 'border-gray-300'}`} />
                {fieldErrors.monthlyRent && <p className="text-red-500 text-xs mt-1">{fieldErrors.monthlyRent}</p>}
              </div>
              <button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition mt-5">
                Add Room
              </button>
            </div>
          </form>
        )}

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="p-4">Room No.</th>
                <th className="p-4">Type</th>
                <th className="p-4">Capacity</th>
                <th className="p-4">Rent</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-400">No rooms added yet</td></tr>
              ) : rooms.map((room) => (
                <tr key={room._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium">{room.roomNumber}</td>
                  <td className="p-4 capitalize">{room.type}</td>
                  <td className="p-4">{room.capacity}</td>
                  <td className="p-4">₹{room.monthlyRent}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[room.status] || 'bg-gray-100 text-gray-700'}`}>
                      {room.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Rooms;