import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Users() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [backups, setBackups] = useState([]);
  const [backingUp, setBackingUp] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      setError('Failed to load users');
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await api.get('/admin/backup/list');
      setBackups(res.data);
    } catch (err) {
      // the list is a nice-to-have; ignore failures
    }
  };

  useEffect(() => { fetchUsers(); fetchBackups(); }, []);

  // The route needs the login token, so the file is fetched with axios and saved from a blob
  const downloadBackup = async () => {
    setError('');
    try {
      const res = await api.get('/admin/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hostel-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage('Backup downloaded');
      setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      setError('Failed to download the backup');
    }
  };

  const sendTestEmail = async () => {
    const to = window.prompt('Send a test email to which address?');
    if (!to) return;
    setError('');
    setMessage('Sending test email...');
    try {
      const res = await api.post('/admin/test-email', { to });
      setMessage(res.data.message);
    } catch (err) {
      setMessage('');
      setError(err.response?.data?.message || 'Failed to send the test email');
    }
  };

  const saveBackupOnServer = async () => {
    setError('');
    setBackingUp(true);
    try {
      const res = await api.post('/admin/backup/save');
      setMessage(res.data.message);
      setTimeout(() => setMessage(''), 2500);
      fetchBackups();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save the backup');
    } finally {
      setBackingUp(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const changeRole = async (id, role) => {
    try {
      await api.put(`/auth/users/${id}/role`, { role });
      setMessage('Role updated');
      fetchUsers();
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update role');
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await api.put(`/auth/users/${id}/status`, { isActive: !isActive });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update status');
    }
  };

  const roleStyle = {
    admin: 'bg-purple-100 text-purple-700',
    staff: 'bg-blue-100 text-blue-700',
    resident: 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-bold text-indigo-700">⚙️ User Management</h1>
          <div className="flex gap-3 items-center">
            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">Dashboard</Link>
            <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-1">Total Accounts: {users.length}</h2>
          <p className="text-sm text-gray-500">Manage roles and account status for everyone in the system</p>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}
        {message && <p className="text-green-600 mb-4">{message}</p>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium">{u.name}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${roleStyle[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 items-center">
                      <select value={u.role} onChange={(e) => changeRole(u._id, e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs">
                        <option value="resident">Resident</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button onClick={() => toggleActive(u._id, u.isActive)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
          <h2 className="font-semibold text-gray-800 mb-1">💾 Data Backup</h2>
          <p className="text-sm text-gray-500 mb-4">
            Download a full copy of the data (passwords are never included). The server also saves an automatic backup once a day and keeps the latest 7.
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            <button onClick={downloadBackup} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
              Download backup (JSON)
            </button>
            <button onClick={saveBackupOnServer} disabled={backingUp}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50">
              {backingUp ? 'Saving...' : 'Save backup on server now'}
            </button>
            <button onClick={sendTestEmail}
              className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100 transition">
              Send test email
            </button>
          </div>
          {backups.length > 0 && (
            <ul className="text-xs text-gray-500 space-y-1">
              {backups.map((b) => (
                <li key={b.name}>{b.name} · {(b.size / 1024).toFixed(1)} KB · {new Date(b.createdAt).toLocaleString('en-IN')}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default Users;