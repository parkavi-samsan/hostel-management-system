import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://hostel-management-system-6e7v.onrender.com/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token has expired (or the account no longer exists), send the user back to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const onAuthPage = ['/login', '/register'].includes(window.location.pathname);
    if (error.response?.status === 401 && !onAuthPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;