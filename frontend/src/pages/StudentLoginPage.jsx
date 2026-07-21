import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';

const StudentLoginPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP
  const [form, setForm] = useState({ rollNumber: '', email: '', otpCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  // Step 1: Submit Roll Number & Email to get OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!form.rollNumber.trim() || !form.email.trim()) {
      setError('Please fill in both Roll Number and Email.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data } = await axiosInstance.post('/api/student/login', {
        rollNumber: form.rollNumber.trim(),
        email: form.email.trim()
      });
      setInfoMessage(data.message || 'OTP verification code sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit OTP code to verify and log in
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!form.otpCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await axiosInstance.post('/api/student/verify-otp', {
        rollNumber: form.rollNumber.trim(),
        otpCode: form.otpCode.trim()
      });
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check the OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-5 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <img src="/Tech_wave_logo_1-removebg-preview.png" alt="TechWave Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">TechWave Portal</h1>
          <p className="text-slate-400 mt-1 text-sm">Student Access</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/50 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-blue-600 via-teal-400 to-blue-600" />

          {step === 1 ? (
            <form onSubmit={handleRequestOTP} className="px-7 py-8 flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Student Sign In</h2>
                <p className="text-xs text-slate-400 mt-1">Enter your details to receive an OTP code</p>
              </div>

              <div>
                <label htmlFor="rollNumber" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Roll Number (Student ID)
                </label>
                <input
                  id="rollNumber"
                  name="rollNumber"
                  type="text"
                  value={form.rollNumber}
                  onChange={handleChange}
                  placeholder="e.g. 101 or CS-2024-001"
                  required
                  className="w-full bg-slate-800 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="student@example.com"
                  required
                  className="w-full bg-slate-800 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    className="bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-3 flex items-start gap-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <svg className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-rose-400 text-sm">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending Code...
                  </>
                ) : (
                  'Send OTP Code'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="px-7 py-8 flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Enter OTP Code</h2>
                <p className="text-xs text-emerald-400 mt-1">{infoMessage}</p>
              </div>

              <div>
                <label htmlFor="otpCode" className="block text-sm font-medium text-slate-300 mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  id="otpCode"
                  name="otpCode"
                  type="text"
                  maxLength={6}
                  value={form.otpCode}
                  onChange={handleChange}
                  placeholder="123456"
                  required
                  className="w-full bg-slate-800 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-center text-xl tracking-[8px] font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    className="bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-3 flex items-start gap-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <svg className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-rose-400 text-sm">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StudentLoginPage;
