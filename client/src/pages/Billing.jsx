import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const emptyForm = {
  residentId: '', month: '', dueDate: '',
  roomFee: '', utilities: '', additionalCharges: '', discount: ''
};

function Billing() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [residents, setResidents] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(emptyForm);

  const fetchBills = async () => {
    try {
      const res = await api.get('/billing');
      setBills(res.data);
    } catch (err) {
      setError('Failed to load bills');
    }
  };

  const fetchResidents = async () => {
    try {
      const res = await api.get('/residents');
      setResidents(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchBills();
    if (user?.role === 'admin') fetchResidents();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const errs = {};
    if (!form.residentId) errs.residentId = 'Select a resident';
    if (!form.month) errs.month = 'Select the billing month';
    if (!form.dueDate) errs.dueDate = 'Select a due date';
    if (!form.roomFee || Number(form.roomFee) <= 0) errs.roomFee = 'Enter a valid room fee';
    ['utilities', 'additionalCharges', 'discount'].forEach((f) => {
      if (form[f] !== '' && Number(form[f]) < 0) errs[f] = 'Cannot be negative';
    });
    const total =
      Number(form.roomFee || 0) + Number(form.utilities || 0) +
      Number(form.additionalCharges || 0) - Number(form.discount || 0);
    if (total < 0) errs.discount = 'Discount is more than the total charges';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!validate()) return;
    try {
      await api.post('/billing', form);
      setForm(emptyForm);
      setMessage('Bill created successfully');
      fetchBills();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create bill');
    }
  };

  const markPaid = async (id) => {
    setError('');
    try {
      await api.put(`/billing/${id}/pay`, {});
      setMessage('Payment recorded (test mode)');
      fetchBills();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update payment');
    }
  };

  const openInvoice = async (id) => {
    try {
      const res = await api.get(`/billing/${id}`);
      const b = res.data;
      const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
      const invoiceNo = 'INV-' + String(b._id).slice(-6).toUpperCase();
      const html = `
        <html>
          <head>
            <title>${invoiceNo}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
              h1 { color: #4338ca; margin-bottom: 4px; }
              .muted { color: #666; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-top: 24px; }
              td, th { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }
              td.amt, th.amt { text-align: right; }
              .total td { font-weight: bold; font-size: 18px; border-top: 2px solid #222; }
              .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 13px; background: #eee; text-transform: capitalize; }
              button { margin-top: 24px; padding: 10px 20px; background: #4338ca; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
              @media print { button { display: none; } }
            </style>
          </head>
          <body>
            <h1>Hostel Management System</h1>
            <p class="muted">Invoice ${invoiceNo}</p>
            <p><strong>${b.residentId?.name || ''}</strong><br/>
               <span class="muted">${b.residentId?.email || ''}</span></p>
            <p class="muted">Billing month: ${b.month}<br/>
               Due date: ${b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '-'}<br/>
               Status: <span class="badge">${b.status}</span></p>
            <table>
              <tr><th>Description</th><th class="amt">Amount</th></tr>
              <tr><td>Room fee</td><td class="amt">${money(b.roomFee)}</td></tr>
              <tr><td>Utilities</td><td class="amt">${money(b.utilities)}</td></tr>
              <tr><td>Additional charges</td><td class="amt">${money(b.additionalCharges)}</td></tr>
              <tr><td>Late fee</td><td class="amt">${money(b.lateFee)}</td></tr>
              <tr><td>Discount</td><td class="amt">- ${money(b.discount)}</td></tr>
              <tr class="total"><td>Total</td><td class="amt">${money(b.totalAmount)}</td></tr>
            </table>
            ${b.paidAt ? `<p class="muted">Paid on ${new Date(b.paidAt).toLocaleString()} (Ref: ${b.paymentId})</p>` : ''}
            <button onclick="window.print()">Print / Save as PDF</button>
          </body>
        </html>`;
      const w = window.open('', '_blank', 'width=800,height=900');
      if (!w) {
        setError('Please allow pop-ups to view the invoice');
        return;
      }
      w.document.write(html);
      w.document.close();
    } catch (err) {
      setError('Failed to load invoice');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const statusStyle = {
    paid: 'bg-green-100 text-green-700',
    unpaid: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700'
  };

  const inputClass = (name) =>
    `border rounded-lg px-3 py-2 text-sm ${fieldErrors[name] ? 'border-red-400' : 'border-gray-300'}`;

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
                <label className="block text-xs font-medium text-gray-600 mb-1">Resident</label>
                <select name="residentId" value={form.residentId} onChange={handleChange} className={inputClass('residentId')}>
                  <option value="">Select resident</option>
                  {residents.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
                {fieldErrors.residentId && <p className="text-red-500 text-xs mt-1">{fieldErrors.residentId}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                <input type="month" name="month" value={form.month} onChange={handleChange} className={inputClass('month')} />
                {fieldErrors.month && <p className="text-red-500 text-xs mt-1">{fieldErrors.month}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} className={inputClass('dueDate')} />
                {fieldErrors.dueDate && <p className="text-red-500 text-xs mt-1">{fieldErrors.dueDate}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Room Fee (₹)</label>
                <input type="number" name="roomFee" value={form.roomFee} onChange={handleChange} className={`${inputClass('roomFee')} w-28`} />
                {fieldErrors.roomFee && <p className="text-red-500 text-xs mt-1">{fieldErrors.roomFee}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Utilities (₹)</label>
                <input type="number" name="utilities" value={form.utilities} onChange={handleChange} className={`${inputClass('utilities')} w-28`} />
                {fieldErrors.utilities && <p className="text-red-500 text-xs mt-1">{fieldErrors.utilities}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Additional (₹)</label>
                <input type="number" name="additionalCharges" value={form.additionalCharges} onChange={handleChange} className={`${inputClass('additionalCharges')} w-28`} />
                {fieldErrors.additionalCharges && <p className="text-red-500 text-xs mt-1">{fieldErrors.additionalCharges}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Discount (₹)</label>
                <input type="number" name="discount" value={form.discount} onChange={handleChange} className={`${inputClass('discount')} w-28`} />
                {fieldErrors.discount && <p className="text-red-500 text-xs mt-1">{fieldErrors.discount}</p>}
              </div>
              <button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition mt-5">
                Create Bill
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              A 5% late fee is added automatically once an unpaid bill passes its due date.
            </p>
          </form>
        )}

        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {message && <p className="text-green-700 text-sm mb-4 bg-green-50 border border-green-200 rounded px-3 py-2">{message}</p>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {user?.role !== 'resident' && <th className="p-4">Resident</th>}
                <th className="p-4">Month</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr><td colSpan="6" className="p-6 text-center text-gray-400">No bills yet</td></tr>
              ) : bills.map((b) => (
                <tr key={b._id} className="border-t border-gray-100 hover:bg-gray-50">
                  {user?.role !== 'resident' && <td className="p-4">{b.residentId?.name || '-'}</td>}
                  <td className="p-4">{b.month}</td>
                  <td className="p-4">{b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '-'}</td>
                  <td className="p-4 font-medium">
                    ₹{b.totalAmount}
                    {b.lateFee > 0 && <span className="block text-xs text-red-500">incl. late fee ₹{b.lateFee}</span>}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusStyle[b.status] || 'bg-gray-100 text-gray-700'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {b.status !== 'paid' && (
                        <button onClick={() => markPaid(b._id)}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition">
                          {user?.role === 'resident' ? 'Pay Now' : 'Mark Paid'}
                        </button>
                      )}
                      <button onClick={() => openInvoice(b._id)}
                        className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-100 transition">
                        Invoice
                      </button>
                    </div>
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