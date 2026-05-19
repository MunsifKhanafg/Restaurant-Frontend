import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 20000,   // 20 s — generous for slow connections
});

/* ── Request: attach Bearer token ── */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

/* ── Response: surface errors properly, only redirect on auth failure ── */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      /*
        Only hard-redirect if this is NOT an order-creation call.
        A 401 on POST /orders could mean the token just expired mid-session;
        we want the UI to show the real message rather than redirect silently.
      */
      const url = error.config?.url || '';
      const isOrderPost = url.includes('/orders') && error.config?.method === 'post';

      if (!isOrderPost) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
