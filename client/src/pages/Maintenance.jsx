import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function Maintenance() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ roomId: '', issue: '', priority: 'medium' });

  const fetchRequests = async () => {
    try {
      const res = await api.get('/maintenance');
      setRequests(res.data);
    } catch (err) {
      setError('Failed to load requests');
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchRequests();
    if (user?.role === 'resident') fetchRooms();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/maintenance', form);
      setForm({ roomId: '', issue: '', priority: 'medium' });
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/maintenance/${id}`, { status });
      fetchRequests();
    } catch (err) {
      setError('Failed to update');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">Maintenance Requests</h1>
          <div className="flex gap-3">
            <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <button onClick={logout} className="text-red-500 hover:underline">Logout</button>
          </div>
        </div>

        {user?.role === 'resident' && (
          <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm mb-1">Room</label>
              <select name="roomId" value={form.roomId} onChange={handleChange} required className="border rounded px-2 py-1">
                <option value="">Select room</option>
                {rooms.map((r) => (
                  <option key={r._id} value={r._id}>{r.roomNumber}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm mb-1">Issue</label>
              <input name="issue" value={form.issue} onChange={handleChange} required
                className="border rounded px-2 py-1 w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="border rounded px-2 py-1">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Submit Request
            </button>
          </form>
        )}

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-200">
              <tr>
                {user?.role !== 'resident' && <th className="p-3">Resident</th>}
                <th className="p-3">Room</th>
                <th className="p-3">Issue</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                {user?.role !== 'resident' && <th className="p-3">Action</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id} className="border-t">
                  {user?.role !== 'resident' && <td className="p-3">{r.residentId?.name}</td>}
                  <td className="p-3">{r.roomId?.roomNumber}</td>
                  <td className="p-3">{r.issue}</td>
                  <td className="p-3 capitalize">{r.priority}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      r.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      r.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  {user?.role !== 'resident' && (
                    <td className="p-3">
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r._id, e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Maintenance;
