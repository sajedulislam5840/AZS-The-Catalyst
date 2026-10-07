import axios from 'axios';

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ||
    'https://edutrack-backend-qjxg.onrender.com',
  timeout: 60000, // Render cold start handle korar jonno safe wait limit
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatic token attachment
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;