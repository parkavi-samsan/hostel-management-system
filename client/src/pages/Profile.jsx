import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Profile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '', phone: '', emergencyContact: '',
    roomType: '', roomNotes: '', notifyEmail: true, notifySms: false
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setProfile(res.data);
      setForm({
        name: res.data.name || '',
        phone: res.data.phone || '',
        emergencyContact: res.data.emergencyContact || '',
        roomType: res.data.roomPreference?.roomType || '',
        roomNotes: res.data.roomPreference?.notes || '',
        notifyEmail: res.data.notifyEmail !== false,
        notifySms: res.data.notifySms === true
      });
    } catch (err) {
      setError('Failed to load profile');
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.phone && !/^[0-9]{10}$/.test(form.phone)) errs.phone = 'Enter a valid 10-digit phone number';
    if (form.emergencyContact && !/^[0-9]{10}$/.test(form.emergencyContact)) {
      errs.emergencyContact = 'Enter a valid 10-digit emergency contact number';
    }
    if (form.notifySms && !form.phone) errs.phone = 'Add your phone number to receive SMS alerts';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!validate()) return;
    try {
      const res = await api.put('/auth/me', {
        name: form.name,
        phone: form.phone,
        emergencyContact: form.emergencyContact,
        roomPreference: { roomType: form.roomType, notes: form.roomNotes },
        notifyEmail: form.notifyEmail,
        notifySms: form.notifySms
      });
      login({ ...user, name: res.data.name }, localStorage.getItem('token'));
      setMessage('Profile updated successfully');
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.msg || err.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const history = profile?.roomHistory ? [...profile.roomHistory].reverse() : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-bold text-indigo-700">🙍 My Profile</h1>
          <div className="flex gap-3 items-center">
            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">Dashboard</Link>
            <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {message && <p className="text-green-700 text-sm mb-4 bg-green-50 border border-green-200 rounded px-3 py-2">{message}</p>}

        {profile && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xl font-semibold text-gray-800">{profile.name}</p>
                  <p className="text-gray-500 text-sm">{profile.email}</p>
                </div>
                <span className="capitalize bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full">
                  {profile.role}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Current room:{' '}
                <span className="font-medium">
                  {profile.roomId?.roomNumber ? profile.roomId.roomNumber : 'Not allocated yet'}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="font-semibold text-gray-800 mb-4">Edit Details</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
                <input name="name" value={form.name} onChange={handleChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.name ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'}`} />
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit number"
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.phone ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'}`} />
                {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-1 text-gray-700">Emergency Contact</label>
                <input name="emergencyContact" value={form.emergencyContact} onChange={handleChange} placeholder="10-digit number"
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${fieldErrors.emergencyContact ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'}`} />
                {fieldErrors.emergencyContact && <p className="text-red-500 text-xs mt-1">{fieldErrors.emergencyContact}</p>}
              </div>

              {profile.role === 'resident' && (
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Preferred Room Type</label>
                    <select name="roomType" value={form.roomType} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="">No preference</option>
                      <option value="single">Single</option>
                      <option value="double">Double</option>
                      <option value="dorm">Dorm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Preference Notes</label>
                    <input name="roomNotes" value={form.roomNotes} onChange={handleChange} placeholder="e.g. ground floor, near window"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
              )}

              <div className="mb-6 border border-gray-100 rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">Alert settings</p>
                <label className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <input type="checkbox" name="notifyEmail" checked={form.notifyEmail} onChange={handleChange} />
                  Email me about bills, maintenance and room updates
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" name="notifySms" checked={form.notifySms} onChange={handleChange} />
                  Also send SMS alerts to my phone
                </label>
                <p className="text-xs text-gray-400 mt-2">In-app notifications (the bell) are always on.</p>
              </div>

              <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
                Save Changes
              </button>
            </form>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <h2 className="font-semibold text-gray-800 p-6 pb-3">Room History</h2>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="p-4">Room</th>
                    <th className="p-4">Check-in</th>
                    <th className="p-4">Check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan="3" className="p-6 text-center text-gray-400">No room history yet</td></tr>
                  ) : history.map((h, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="p-4 font-medium">{h.roomNumber}</td>
                      <td className="p-4">{new Date(h.checkIn).toLocaleDateString()}</td>
                      <td className="p-4">
                        {h.checkOut ? new Date(h.checkOut).toLocaleDateString() : (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">Current</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;