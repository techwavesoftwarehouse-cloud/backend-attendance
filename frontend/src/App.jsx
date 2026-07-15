import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import QRDisplayPage from './pages/QRDisplayPage';
import AttendancePage from './pages/AttendancePage';
import EnrollPage from './pages/EnrollPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

/**
 * App — root router.
 *
 * Routes:
 *   /qr-screen        → QRDisplayPage       (entrance monitor, left open full-screen)
 *   /attendance       → AttendancePage       (student lands here after scanning QR)
 *   /enroll           → EnrollPage           (one-time fingerprint registration)
 *   /admin/login      → AdminLoginPage
 *   /admin/dashboard  → AdminDashboardPage   (protected — redirects to login if no JWT)
 *   /                 → redirect to /admin/login
 */
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/qr-screen" element={<QRDisplayPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/enroll" element={<EnrollPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
