import { useState, useEffect } from 'react';
import api from '../services/api';
import PageNav from '../components/PageNav';

const CATEGORIES = ['maintenance', 'utilities', 'salaries', 'food', 'supplies', 'other'];
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({ title: '', category: 'maintenance', amount: '', date: today(), notes: '' });

const inputClass = (bad) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${bad ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'}`;

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (err) {
      setError('Failed to load expenses');
    }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Enter an amount greater than 0';
    if (!form.date) errs.date = 'Pick a date';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!validate()) return;
    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, form);
        setMessage('Expense updated');
      } else {
        await api.post('/expenses', form);
        setMessage('Expense added');
      }
      setForm(emptyForm());
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save expense');
    }
  };

  const startEdit = (x) => {
    setEditingId(x._id);
    setForm({
      title: x.title,
      category: x.category,
      amount: x.amount,
      date: new Date(x.date).toISOString().slice(0, 10),
      notes: x.notes || ''
    });
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFieldErrors({});
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const visible = filter === 'all' ? expenses : expenses.filter((x) => x.category === filter);
  const visibleTotal = visible.reduce((sum, x) => sum + x.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageNav title="🧾 Expenses" />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {message && <p className="text-green-700 text-sm mb-4 bg-green-50 border border-green-200 rounded px-3 py-2">{message}</p>}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Title</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Plumber visit, EB bill"
                className={inputClass(fieldErrors.title)} />
              {fieldErrors.title && <p className="text-red-500 text-xs mt-1">{fieldErrors.title}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Category</label>
              <select name="category" value={form.category} onChange={handleChange} className={inputClass(false) + ' capitalize'}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Amount (₹)</label>
              <input name="amount" type="number" min="0" value={form.amount} onChange={handleChange}
                className={inputClass(fieldErrors.amount)} />
              {fieldErrors.amount && <p className="text-red-500 text-xs mt-1">{fieldErrors.amount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Date</label>
              <input name="date" type="date" value={form.date} onChange={handleChange}
                className={inputClass(fieldErrors.date)} />
              {fieldErrors.date && <p className="text-red-500 text-xs mt-1">{fieldErrors.date}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">Notes (optional)</label>
              <input name="notes" value={form.notes} onChange={handleChange} className={inputClass(false)} />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
              {editingId ? 'Save Changes' : 'Add Expense'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
            )}
          </div>
        </form>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-3">
            <div>
              <h2 className="font-semibold text-gray-800">All Expenses</h2>
              <p className="text-sm text-gray-500">{visible.length} entries · total {money(visibleTotal)}</p>
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm capitalize">
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr><td colSpan="5" className="p-6 text-center text-gray-400">No expenses recorded</td></tr>
                ) : visible.map((x) => (
                  <tr key={x._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-4 whitespace-nowrap">{new Date(x.date).toLocaleDateString('en-IN')}</td>
                    <td className="p-4">
                      <p className="font-medium">{x.title}</p>
                      {x.notes && <p className="text-xs text-gray-400">{x.notes}</p>}
                    </td>
                    <td className="p-4 capitalize">{x.category}</td>
                    <td className="p-4 font-medium">{money(x.amount)}</td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button onClick={() => startEdit(x)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => remove(x._id)} className="text-red-600 hover:underline text-xs">Delete</button>
                      </div>
                    </td>
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

export default Expenses;
