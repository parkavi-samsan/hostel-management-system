import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageNav from '../components/PageNav';

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

const billStyle = {
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700'
};
const requestStyle = {
  pending: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700'
};

const inputClass = (bad) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${bad ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'}`;

function ResidentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const res = await api.get(`/residents/${id}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load resident');
    }
  };

  useEffect(() => { load(); }, [id]);

  const startEdit = () => {
    const r = data.resident;
    setForm({
      name: r.name || '',
      email: r.email || '',
      phone: r.phone || '',
      emergencyContact: r.emergencyContact || '',
      roomType: r.roomPreference?.roomType || '',
      roomNotes: r.roomPreference?.notes || ''
    });
    setFieldErrors({});
    setEditing(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (form.phone && !/^[0-9]{10}$/.test(form.phone)) errs.phone = 'Enter a 10-digit number';
    if (form.emergencyContact && !/^[0-9]{10}$/.test(form.emergencyContact)) errs.emergencyContact = 'Enter a 10-digit number';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!validate()) return;
    try {
      await api.put(`/residents/${id}`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        emergencyContact: form.emergencyContact,
        roomPreference: { roomType: form.roomType, notes: form.roomNotes }
      });
      setEditing(false);
      setMessage('Resident record updated');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update resident');
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageNav title="👤 Resident" />
        <div className="max-w-4xl mx-auto px-6 py-8">
          {error ? <p className="text-red-600">{error}</p> : <p className="text-gray-400">Loading...</p>}
        </div>
      </div>
    );
  }

  const { resident, bills, requests, dues } = data;
  const history = [...(resident.roomHistory || [])].reverse();
  const pref = resident.roomPreference || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <PageNav title="👤 Resident Profile" maxWidth="max-w-4xl" />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link to="/residents" className="text-sm text-indigo-600 hover:underline">← Back to residents</Link>

        {error && <p className="text-red-600 text-sm my-4 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {message && <p className="text-green-700 text-sm my-4 bg-green-50 border border-green-200 rounded px-3 py-2">{message}</p>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 my-6">
          {editing ? (
            <form onSubmit={save}>
              <h2 className="font-semibold text-gray-800 mb-4">Edit Resident Record</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
                  <input name="name" value={form.name} onChange={handleChange} className={inputClass(fieldErrors.name)} />
                  {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                  <input name="email" value={form.email} onChange={handleChange} className={inputClass(fieldErrors.email)} />
                  {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit number" className={inputClass(fieldErrors.phone)} />
                  {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Emergency Contact</label>
                  <input name="emergencyContact" value={form.emergencyContact} onChange={handleChange} placeholder="10-digit number" className={inputClass(fieldErrors.emergencyContact)} />
                  {fieldErrors.emergencyContact && <p className="text-red-500 text-xs mt-1">{fieldErrors.emergencyContact}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Preferred Room Type</label>
                  <select name="roomType" value={form.roomType} onChange={handleChange} className={inputClass(false)}>
                    <option value="">No preference</option>
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="dorm">Dorm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Preference Notes</label>
                  <input name="roomNotes" value={form.roomNotes} onChange={handleChange} placeholder="e.g. ground floor" className={inputClass(false)} />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">Save Changes</button>
                <button type="button" onClick={() => setEditing(false)} className="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-xl font-semibold text-gray-800">{resident.name}</p>
                  <p className="text-gray-500 text-sm">{resident.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${resident.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {resident.isActive ? 'Active' : 'Deactivated'}
                  </span>
                  {isAdmin && (
                    <button onClick={startEdit} className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-100">
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs uppercase text-gray-400">Phone</p><p className="font-medium">{resident.phone || '-'}</p></div>
                <div><p className="text-xs uppercase text-gray-400">Emergency Contact</p><p className="font-medium">{resident.emergencyContact || 'Not provided'}</p></div>
                <div>
                  <p className="text-xs uppercase text-gray-400">Current Room</p>
                  <p className="font-medium">{resident.roomId?.roomNumber ? `${resident.roomId.roomNumber} (${resident.roomId.type})` : 'Not allocated'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400">Room Preference</p>
                  <p className="font-medium capitalize">
                    {pref.roomType || 'No preference'}{pref.notes ? ` · ${pref.notes}` : ''}
                  </p>
                </div>
                <div><p className="text-xs uppercase text-gray-400">Outstanding Dues</p><p className={`font-medium ${dues > 0 ? 'text-red-600' : 'text-green-600'}`}>{money(dues)}</p></div>
                <div><p className="text-xs uppercase text-gray-400">Member Since</p><p className="font-medium">{fmtDate(resident.createdAt)}</p></div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <h2 className="font-semibold text-gray-800 p-6 pb-3">Room Change History</h2>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr><th className="p-4">Room</th><th className="p-4">Check-in</th><th className="p-4">Check-out</th></tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="3" className="p-6 text-center text-gray-400">No room history yet</td></tr>
              ) : history.map((h, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="p-4 font-medium">{h.roomNumber}</td>
                  <td className="p-4">{fmtDate(h.checkIn)}</td>
                  <td className="p-4">
                    {h.checkOut ? fmtDate(h.checkOut) : <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">Current</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <h2 className="font-semibold text-gray-800 p-6 pb-3">Recent Bills</h2>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr><th className="p-3">Month</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody>
                {bills.length === 0 ? (
                  <tr><td colSpan="3" className="p-6 text-center text-gray-400">No bills yet</td></tr>
                ) : bills.map((b) => (
                  <tr key={b._id} className="border-t border-gray-100">
                    <td className="p-3 font-medium">{b.month}</td>
                    <td className="p-3">{money(b.totalAmount)}</td>
                    <td className="p-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${billStyle[b.status]}`}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <h2 className="font-semibold text-gray-800 p-6 pb-3">Maintenance Requests</h2>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr><th className="p-3">Issue</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr><td colSpan="2" className="p-6 text-center text-gray-400">No requests raised</td></tr>
                ) : requests.map((r) => (
                  <tr key={r._id} className="border-t border-gray-100">
                    <td className="p-3">
                      <p className="font-medium">{r.issue}</p>
                      <p className="text-xs text-gray-400">{fmtDate(r.createdAt)}</p>
                    </td>
                    <td className="p-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${requestStyle[r.status]}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResidentDetail;
