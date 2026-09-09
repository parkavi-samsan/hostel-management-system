import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function Rooms() {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ roomNumber: '', type: 'single', capacity: 1, monthlyRent: '' });

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      setError('Failed to load rooms');
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/rooms', form);
      setForm({ roomNumber: '', type: 'single', capacity: 1, monthlyRent: '' });
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add room');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">Room Management</h1>
          <div className="flex gap-3">
            <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <button onClick={logout} className="text-red-500 hover:underline">Logout</button>
          </div>
        </div>

        {user?.role === 'admin' && (
          <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm mb-1">Room Number</label>
              <input name="roomNumber" value={form.roomNumber} onChange={handleChange} required
                className="border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-sm mb-1">Type</label>
              <select name="type" value={form.type} onChange={handleChange} className="border rounded px-2 py-1">
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="dorm">Dorm</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Capacity</label>
              <input type="number" name="capacity" value={form.capacity} onChange={handleChange} required
                className="border rounded px-2 py-1 w-20" />
            </div>
            <div>
              <label className="block text-sm mb-1">Monthly Rent</label>
              <input type="number" name="monthlyRent" value={form.monthlyRent} onChange={handleChange} required
                className="border rounded px-2 py-1 w-28" />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Add Room
            </button>
          </form>
        )}

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3">Room No.</th>
                <th className="p-3">Type</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Rent</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room._id} className="border-t">
                  <td className="p-3">{room.roomNumber}</td>
                  <td className="p-3 capitalize">{room.type}</td>
                  <td className="p-3">{room.capacity}</td>
                  <td className="p-3">₹{room.monthlyRent}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      room.status === 'available' ? 'bg-green-100 text-green-700' :
                      room.status === 'occupied' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
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