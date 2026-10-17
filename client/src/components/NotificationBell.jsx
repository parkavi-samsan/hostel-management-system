import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} day(s) ago`;
}

const typeIcon = { maintenance: '🔧', billing: '💰', room: '🛏️', general: '🔔' };

function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data);
    } catch (err) {
      // ignore: the bell should never break a page
    }
  };

  useEffect(() => {
    if (!user) {
      setItems([]);
      setOpen(false);
      return;
    }
    load();
    const timer = setInterval(load, 30000); // refresh every 30 seconds
    return () => clearInterval(timer);
  }, [user]);

  if (!user) return null;

  const unread = items.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      load();
    } catch (err) {}
  };

  const markRead = async (n) => {
    if (n.isRead) return;
    try {
      await api.put(`/notifications/${n._id}/read`);
      load();
    } catch (err) {}
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="absolute bottom-16 right-0 w-80 max-h-96 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-800 text-sm">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          <div className="overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No notifications yet</p>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  onClick={() => markRead(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 flex gap-3 ${
                    n.isRead ? '' : 'bg-indigo-50/60'
                  }`}
                >
                  <span className="text-lg">{typeIcon[n.type] || '🔔'}</span>
                  <span className="flex-1">
                    <span className={`block text-sm ${n.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {n.message}
                    </span>
                    <span className="block text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-600 mt-2" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="relative w-14 h-14 rounded-full bg-indigo-600 text-white text-2xl shadow-lg hover:bg-indigo-700 transition flex items-center justify-center"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}

export default NotificationBell;