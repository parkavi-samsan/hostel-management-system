import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Billing() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    residentId: '', month: '', roomFee: '', utilities: '', additionalCharges: '', lateFee: '', discount: ''
  });

  const fetchBills = async () => {
    try {
      const res = await api.get('/billing');
      setBills(res.data);
    } catch (err) {
      setError('Failed to load bills');
    }
  };

  useEffect(() => { fetchBills(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const errs = {};
    if (!form.residentId.trim()) errs.residentId = 'Resident ID is required';
    if (!form.month.trim()) errs.month = 'Month is required';
    else if (!/^\d{4}-\d{2}$/.test(form.month)) errs.month = 'Use format YYYY-MM';
    if (!form.roomFee || Number(form.roomFee) <= 0) errs.roomFee = 'Enter a valid room fee';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    try {
      await api.post('/billing', form);
      setForm({ residentId: '', month: '', roomFee: '', utilities: '', additionalCharges: '', lateFee: '', discount: '' });
      fetchBills();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create bill');
    }
  };

  const markPaid = async (id) => {
    try {
      await api.put(`/billing/${id}/pay`, {});
      fetchBills();
    } catch (err) {
      setError('Failed to update payment');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-bold text-indigo-700">💰 Billing</h1>
          <div className="flex gap-3 items-center">
            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">Dashboard</Link>
            <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {user?.role === 'admin' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Create Bill</h2>
            <div className="flex flex-wrap gap-4 items-start">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Resident ID</label>
                <input name="residentId" value={form.residentId} onChange={handleChange}
                  className={`border rounded-lg px-3 py-2 text-sm w-48 ${fieldErrors.residentId ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="paste resident id" />
                {fieldErrors.residentId && <p className="text-red-500 text-xs mt-1">{fieldErrors.residentId}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                <input name="month" value={form.month} onChange={handleChange}
                  className={`border rounded-lg px-3 py-2 text-sm w-28 ${fieldErrors.month ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="2026-09" />
                {fieldErrors.month && <p className="text-red-500 text-xs mt-1">{fieldErrors.month}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Room Fee (₹)</label>
                <input type="number" name="roomFee" value={form.roomFee} onChange={handleChange}
                  className={`border rounded-lg px-3 py-2 text-sm w-28 ${fieldErrors.roomFee ? 'border-red-400' : 'border-gray-300'}`} />
                {fieldErrors.roomFee && <p className="text-red-500 text-xs mt-1">{fieldErrors.roomFee}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Utilities (₹)</label>
                <input type="number" name="utilities" value={form.utilities} onChange={handleChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28" />
              </div>
              <button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition mt-5">
                Create Bill
              </button>
            </div>
          </form>
        )}

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {user?.role !== 'resident' && <th className="p-4">Resident</th>}
                <th className="p-4">Month</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-400">No bills yet</td></tr>
              ) : bills.map((b) => (
                <tr key={b._id} className="border-t border-gray-100 hover:bg-gray-50">
                  {user?.role !== 'resident' && <td className="p-4">{b.residentId?.name || b.residentId}</td>}
                  <td className="p-4">{b.month}</td>
                  <td className="p-4 font-medium">₹{b.totalAmount}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      b.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {b.status !== 'paid' && (
                      <button onClick={() => markPaid(b._id)}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition">
                        Mark Paid
                      </button>
                    )}
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

export default Billing;