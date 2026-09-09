import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function Billing() {
  const { user, logout } = useAuth();
  const [bills, setBills] = useState([]);
  const [residents, setResidents] = useState([]);
  const [error, setError] = useState('');
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

  useEffect(() => {
    fetchBills();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">Billing</h1>
          <div className="flex gap-3">
            <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <button onClick={logout} className="text-red-500 hover:underline">Logout</button>
          </div>
        </div>

        {user?.role === 'admin' && (
          <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm mb-1">Resident ID</label>
              <input name="residentId" value={form.residentId} onChange={handleChange} required
                className="border rounded px-2 py-1 w-48" placeholder="paste resident id" />
            </div>
            <div>
              <label className="block text-sm mb-1">Month</label>
              <input name="month" value={form.month} onChange={handleChange} required placeholder="2026-09"
                className="border rounded px-2 py-1 w-24" />
            </div>
            <div>
              <label className="block text-sm mb-1">Room Fee</label>
              <input type="number" name="roomFee" value={form.roomFee} onChange={handleChange} required
                className="border rounded px-2 py-1 w-24" />
            </div>
            <div>
              <label className="block text-sm mb-1">Utilities</label>
              <input type="number" name="utilities" value={form.utilities} onChange={handleChange}
                className="border rounded px-2 py-1 w-24" />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Create Bill
            </button>
          </form>
        )}

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-200">
              <tr>
                {user?.role !== 'resident' && <th className="p-3">Resident</th>}
                <th className="p-3">Month</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b._id} className="border-t">
                  {user?.role !== 'resident' && <td className="p-3">{b.residentId?.name || b.residentId}</td>}
                  <td className="p-3">{b.month}</td>
                  <td className="p-3">₹{b.totalAmount}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      b.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {b.status !== 'paid' && (
                      <button
                        onClick={() => markPaid(b._id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
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