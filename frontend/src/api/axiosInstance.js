import axios from 'axios';

// In production (Vercel), VITE_API_URL points to the Render backend.
// In dev, it's empty so Vite proxy handles /api requests to localhost:5000.
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // #1 - include httpOnly cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// (Removed token header injector since we use cookies now)

// Handle 401 globally — clear token and redirect to login
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
