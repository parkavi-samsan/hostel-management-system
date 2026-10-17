import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import PageNav from '../components/PageNav';

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#9ca3af'];

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Reports() {
  const [months, setMonths] = useState(6);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/reports/financial?months=${months}`)
      .then((res) => setReport(res.data))
      .catch(() => setError('Failed to load the report'))
      .finally(() => setLoading(false));
  }, [months]);

  // The CSV route needs the login token, so it is fetched with axios and saved as a file
  const downloadCsv = async () => {
    try {
      const res = await api.get(`/reports/financial/export?months=${months}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'financial-report.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download the CSV');
    }
  };

  const t = report?.totals;
  const hasMonthly = report && report.monthly.some((m) => m.billed || m.revenue || m.expenses);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageNav title="📊 Financial Reports" maxWidth="max-w-6xl" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="font-semibold text-gray-800">Revenue, expenses and occupancy</h2>
            <p className="text-sm text-gray-500">Revenue counts money in the month it was actually received.</p>
          </div>
          <div className="flex gap-3">
            <select value={months} onChange={(e) => setMonths(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
            <button onClick={downloadCsv} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
              Download CSV
            </button>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {loading && <p className="text-gray-400 text-sm">Loading report...</p>}

        {report && !loading && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Revenue" value={money(t.revenue)} color="text-green-600" />
              <StatCard label="Expenses" value={money(t.expenses)} color="text-red-500" />
              <StatCard label="Net Profit" value={money(t.net)} color={t.net >= 0 ? 'text-indigo-600' : 'text-red-600'} />
              <StatCard label="Outstanding" value={money(t.outstanding)} sub={`${t.overdueCount} overdue bill(s)`} color="text-amber-600" />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">Revenue vs Expenses</h3>
              {!hasMonthly ? (
                <p className="text-sm text-gray-400 py-10 text-center">No billing or expense data in this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={report.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="net" name="Net" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Expenses by Category</h3>
                {report.expenseByCategory.length === 0 ? (
                  <p className="text-sm text-gray-400 py-10 text-center">No expenses recorded yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={report.expenseByCategory} dataKey="amount" nameKey="category" outerRadius={90} label>
                        {report.expenseByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => money(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Occupancy Rate Over Time</h3>
                {report.occupancyTrend.length === 0 ? (
                  <p className="text-sm text-gray-400 py-10 text-center">Occupancy history builds up daily</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={report.occupancyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" fontSize={11} />
                      <YAxis fontSize={12} domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Line type="monotone" dataKey="rate" name="Occupancy" stroke="#6366f1" strokeWidth={2} dot={report.occupancyTrend.length < 15} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <h3 className="font-semibold text-gray-800 p-5 pb-3">Monthly Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="p-3">Month</th>
                        <th className="p-3">Billed</th>
                        <th className="p-3">Revenue</th>
                        <th className="p-3">Expenses</th>
                        <th className="p-3">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.monthly.map((m) => (
                        <tr key={m.month} className="border-t border-gray-100">
                          <td className="p-3 font-medium">{m.month}</td>
                          <td className="p-3">{money(m.billed)}</td>
                          <td className="p-3 text-green-600">{money(m.revenue)}</td>
                          <td className="p-3 text-red-500">{money(m.expenses)}</td>
                          <td className={`p-3 font-medium ${m.net >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{money(m.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <h3 className="font-semibold text-gray-800 p-5 pb-3">Occupancy by Room Type</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="p-3">Type</th>
                        <th className="p-3">Rooms</th>
                        <th className="p-3">Beds filled</th>
                        <th className="p-3">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.occupancyByType.length === 0 ? (
                        <tr><td colSpan="4" className="p-6 text-center text-gray-400">No rooms added yet</td></tr>
                      ) : report.occupancyByType.map((r) => (
                        <tr key={r.type} className="border-t border-gray-100">
                          <td className="p-3 font-medium capitalize">{r.type}</td>
                          <td className="p-3">{r.rooms}</td>
                          <td className="p-3">{r.occupants}/{r.capacity}</td>
                          <td className="p-3">{r.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Reports;
