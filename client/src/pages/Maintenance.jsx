import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Maintenance() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({ roomId: '', issue: '', priority: 'medium' });
  const [noteDrafts, setNoteDrafts] = useState({});
  const [expanded, setExpanded] = useState({});

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
    } catch (err) {}
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/maintenance/staff-list');
      setStaff(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchRequests();
    if (user?.role === 'resident') fetchRooms();
    if (user?.role === 'admin') fetchStaff();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const errs = {};
    if (!form.roomId) errs.roomId = 'Please select a room';
    if (!form.issue.trim()) errs.issue = 'Please describe the issue';
    else if (form.issue.trim().length < 5) errs.issue = 'Issue description too short';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
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

  const assignStaff = async (id, staffId) => {
    if (!staffId) return;
    try {
      await api.put(`/maintenance/${id}`, { assignedTo: staffId });
      fetchRequests();
    } catch (err) {
      setError('Failed to assign staff');
    }
  };

  const addNote = async (id) => {
    const note = (noteDrafts[id] || '').trim();
    if (!note) return;
    try {
      await api.put(`/maintenance/${id}`, { updateNote: note });
      setNoteDrafts({ ...noteDrafts, [id]: '' });
      fetchRequests();
    } catch (err) {
      setError('Failed to add note');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const priorityStyle = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700'
  };
  const statusStyle = {
    pending: 'bg-gray-200 text-gray-700',
    'in-progress': 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-bold text-indigo-700">🔧 Maintenance Requests</h1>
          <div className="flex gap-3 items-center">
            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">Dashboard</Link>
            <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {user?.role === 'resident' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Raise a Complaint</h2>
            <div className="flex flex-wrap gap-4 items-start">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Room</label>
                <select name="roomId" value={form.roomId} onChange={handleChange}
                  className={`border rounded-lg px-3 py-2 text-sm ${fieldErrors.roomId ? 'border-red-400' : 'border-gray-300'}`}>
                  <option value="">Select room</option>
                  {rooms.map((r) => <option key={r._id} value={r._id}>{r.roomNumber}</option>)}
                </select>
                {fieldErrors.roomId && <p className="text-red-500 text-xs mt-1">{fieldErrors.roomId}</p>}
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Issue</label>
                <input name="issue" value={form.issue} onChange={handleChange}
                  className={`border rounded-lg px-3 py-2 text-sm w-full ${fieldErrors.issue ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="e.g. AC not working" />
                {fieldErrors.issue && <p className="text-red-500 text-xs mt-1">{fieldErrors.issue}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition mt-5">
                Submit
              </button>
            </div>
          </form>
        )}

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center text-gray-400">
              No requests yet
            </div>
          ) : requests.map((r) => (
            <div key={r._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {user?.role !== 'resident' && (
                    <p className="text-xs text-gray-400 mb-1">{r.residentId?.name} • Room {r.roomId?.roomNumber}</p>
                  )}
                  {user?.role === 'resident' && (
                    <p className="text-xs text-gray-400 mb-1">Room {r.roomId?.roomNumber}</p>
                  )}
                  <p className="font-medium text-gray-800">{r.issue}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${priorityStyle[r.priority]}`}>{r.priority}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[r.status]}`}>{r.status}</span>
                    {r.assignedTo?.name && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        Assigned: {r.assignedTo.name}
                      </span>
                    )}
                  </div>
                </div>

                {user?.role !== 'resident' && (
                  <div className="flex flex-col gap-2 items-end">
                    <select value={r.status} onChange={(e) => updateStatus(r._id, e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs">
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    {user?.role === 'admin' && (
                      <select defaultValue="" onChange={(e) => assignStaff(r._id, e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs">
                        <option value="">Assign staff...</option>
                        {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    )}
                  </div>
                )}
              </div>

              <button onClick={() => setExpanded({ ...expanded, [r._id]: !expanded[r._id] })}
                className="text-xs text-indigo-600 hover:underline mt-3">
                {expanded[r._id] ? 'Hide' : 'Show'} progress notes ({r.updates?.length || 0})
              </button>

              {expanded[r._id] && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  {r.updates?.length > 0 ? (
                    <ul className="space-y-2 mb-3">
                      {r.updates.map((u, i) => (
                        <li key={i} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-gray-700">{u.text}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(u.date).toLocaleString()}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-400 mb-3">No progress notes yet</p>
                  )}

                  {user?.role !== 'resident' && (
                    <div className="flex gap-2">
                      <input value={noteDrafts[r._id] || ''}
                        onChange={(e) => setNoteDrafts({ ...noteDrafts, [r._id]: e.target.value })}
                        placeholder="Add a progress note..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                      <button onClick={() => addNote(r._id)}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700">
                        Add
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Maintenance;