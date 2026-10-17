import { Fragment, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const emptyForm = {
  residentId: '', month: '', dueDate: '',
  roomFee: '', utilities: '', additionalCharges: '', discount: ''
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

// Escapes text before it is placed into the invoice HTML
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

// Loads the Razorpay checkout script once
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

function Billing() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [residents, setResidents] = useState([]);
  const [gateway, setGateway] = useState({ enabled: false, keyId: null });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(emptyForm);

  const isResident = user?.role === 'resident';

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

  const fetchGateway = async () => {
    try {
      const res = await api.get('/billing/payment-config');
      setGateway(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchBills();
    fetchGateway();
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

  // Admin/staff: record a cash or offline payment
  const recordOffline = async (billId, installmentIndex) => {
    if (!window.confirm('Record this payment as received (cash/offline)?')) return;
    setError('');
    setMessage('');
    try {
      await api.put(`/billing/${billId}/pay`, { installmentIndex });
      setMessage('Payment recorded');
      fetchBills();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
    }
  };

  // Resident: pay online through Razorpay, or use demo mode when the gateway is not configured
  const payNow = async (bill, installmentIndex) => {
    setError('');
    setMessage('');

    if (!gateway.enabled) {
      try {
        await api.put(`/billing/${bill._id}/pay`, { installmentIndex });
        setMessage('Payment recorded (demo mode: online gateway is not configured)');
        fetchBills();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to record payment');
      }
      return;
    }

    const loaded = await loadRazorpay();
    if (!loaded) {
      setError('Could not load the payment gateway. Please check your internet connection.');
      return;
    }

    try {
      const orderRes = await api.post(`/billing/${bill._id}/create-order`, { installmentIndex });
      const { orderId, amount, currency, keyId } = orderRes.data;

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'Hostel Management System',
        description: `Bill for ${bill.month}`,
        prefill: { name: user.name, email: user.email },
        theme: { color: '#4f46e5' },
        handler: async (response) => {
          try {
            await api.post(`/billing/${bill._id}/verify-payment`, { ...response, installmentIndex });
            setMessage('Payment successful. Thank you!');
            fetchBills();
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed');
          }
        }
      });
      rzp.on('payment.failed', (resp) => {
        setError(`Payment failed: ${resp.error?.description || 'please try again'}`);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start the payment');
    }
  };

  const createPlan = async (billId, count) => {
    if (!count) return;
    if (!window.confirm(`Split this bill into ${count} installments?`)) return;
    setError('');
    setMessage('');
    try {
      await api.post(`/billing/${billId}/plan`, { count: Number(count) });
      setMessage('Payment plan created');
      fetchBills();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create the plan');
    }
  };

  const sendReminder = async (billId) => {
    setError('');
    setMessage('');
    try {
      await api.post(`/billing/${billId}/remind`);
      setMessage('Reminder sent to the resident');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send the reminder');
    }
  };

  const openInvoice = async (id) => {
    try {
      const res = await api.get(`/billing/${id}`);
      const b = res.data;
      const invoiceNo = 'INV-' + String(b._id).slice(-6).toUpperCase();
      const planRows = (b.installments || [])
        .map(
          (i, n) =>
            `<tr><td>Installment ${n + 1} (due ${fmtDate(i.dueDate)})</td>
                 <td class="amt">${money(i.amount)}</td>
                 <td>${esc(i.status)}</td></tr>`
        )
        .join('');
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
            <p><strong>${esc(b.residentId?.name)}</strong><br/>
               <span class="muted">${esc(b.residentId?.email)}</span></p>
            <p class="muted">Billing month: ${esc(b.month)}<br/>
               Due date: ${fmtDate(b.dueDate)}<br/>
               Status: <span class="badge">${esc(b.status)}</span></p>
            <table>
              <tr><th>Description</th><th class="amt">Amount</th></tr>
              <tr><td>Room fee</td><td class="amt">${money(b.roomFee)}</td></tr>
              <tr><td>Utilities</td><td class="amt">${money(b.utilities)}</td></tr>
              <tr><td>Additional charges</td><td class="amt">${money(b.additionalCharges)}</td></tr>
              <tr><td>Late fee</td><td class="amt">${money(b.lateFee)}</td></tr>
              <tr><td>Discount</td><td class="amt">- ${money(b.discount)}</td></tr>
              <tr class="total"><td>Total</td><td class="amt">${money(b.totalAmount)}</td></tr>
            </table>
            ${
              planRows
                ? `<h3 style="margin-top:32px">Payment plan</h3>
                   <table><tr><th>Installment</th><th class="amt">Amount</th><th>Status</th></tr>${planRows}</table>`
                : ''
            }
            ${b.paidAt ? `<p class="muted">Paid on ${new Date(b.paidAt).toLocaleString()} (Ref: ${esc(b.paymentId)})</p>` : ''}
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

  const payButton = (bill, installmentIndex) =>
    isResident ? (
      <button onClick={() => payNow(bill, installmentIndex)}
        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition">
        Pay Now
      </button>
    ) : (
      <button onClick={() => recordOffline(bill._id, installmentIndex)}
        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition">
        Mark Paid
      </button>
    );

  const columnCount = isResident ? 5 : 6;

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
              A 5% late fee is added automatically once an unpaid bill passes its due date. Bills on a payment plan are not charged a late fee.
            </p>
          </form>
        )}

        {isResident && gateway.enabled && (
          <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-4">
            Online payments are processed securely by Razorpay.
            {gateway.keyId?.startsWith('rzp_test') &&
              ' Test mode: use card 4111 1111 1111 1111, any future expiry date and any CVV.'}
          </p>
        )}

        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {message && <p className="text-green-700 text-sm mb-4 bg-green-50 border border-green-200 rounded px-3 py-2">{message}</p>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {!isResident && <th className="p-4">Resident</th>}
                <th className="p-4">Month</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr><td colSpan={columnCount} className="p-6 text-center text-gray-400">No bills yet</td></tr>
              ) : bills.map((b) => {
                const hasPlan = b.installments && b.installments.length > 0;
                const nextInst = hasPlan ? b.installments.find((i) => i.status === 'unpaid') : null;
                const paidCount = hasPlan ? b.installments.filter((i) => i.status === 'paid').length : 0;

                return (
                  <Fragment key={b._id}>
                    <tr className="border-t border-gray-100 hover:bg-gray-50">
                      {!isResident && <td className="p-4">{b.residentId?.name || '-'}</td>}
                      <td className="p-4">{b.month}</td>
                      <td className="p-4">
                        {hasPlan
                          ? (nextInst ? `Next: ${fmtDate(nextInst.dueDate)}` : 'All paid')
                          : fmtDate(b.dueDate)}
                      </td>
                      <td className="p-4 font-medium">
                        {money(b.totalAmount)}
                        {b.lateFee > 0 && <span className="block text-xs text-red-500">incl. late fee {money(b.lateFee)}</span>}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusStyle[b.status] || 'bg-gray-100 text-gray-700'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          {b.status !== 'paid' && !hasPlan && payButton(b)}
                          <button onClick={() => openInvoice(b._id)}
                            className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-100 transition">
                            Invoice
                          </button>
                          {user?.role === 'admin' && b.status !== 'paid' && (
                            <button onClick={() => sendReminder(b._id)}
                              className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-yellow-100 transition">
                              Remind
                            </button>
                          )}
                          {user?.role === 'admin' && b.status !== 'paid' && !hasPlan && (
                            <select defaultValue="" onChange={(e) => { createPlan(b._id, e.target.value); e.target.value = ''; }}
                              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs">
                              <option value="">Payment plan...</option>
                              <option value="2">2 installments</option>
                              <option value="3">3 installments</option>
                              <option value="4">4 installments</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>

                    {hasPlan && (
                      <tr className="bg-gray-50">
                        <td colSpan={columnCount} className="px-6 py-3">
                          <p className="text-xs font-semibold text-gray-500 mb-2">
                            Payment plan: {paidCount}/{b.installments.length} installments paid
                          </p>
                          <div className="space-y-1.5">
                            {b.installments.map((i, idx) => (
                              <div key={i._id || idx}
                                className="flex items-center justify-between text-xs bg-white border border-gray-100 rounded-lg px-3 py-2">
                                <span>
                                  Installment {idx + 1}: <strong>{money(i.amount)}</strong> (due {fmtDate(i.dueDate)})
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full ${i.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {i.status}
                                  </span>
                                  {i.status !== 'paid' && payButton(b, idx)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Billing;