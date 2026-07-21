import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
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
 *   /                 → LandingPage          (public facing instruction page)
 */
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/qr-screen" element={<QRDisplayPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/enroll" element={<EnrollPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        
        {/* Catch-all redirects back to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
