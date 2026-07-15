import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { startRegistration } from '@simplewebauthn/browser';
import axiosInstance from '../api/axiosInstance';
import SuccessAnimation from '../components/SuccessAnimation';

/**
 * EnrollPage — one-time fingerprint registration for a new student.
 * Route: /enroll?studentId=XXXX
 *
 * Flow:
 *  1. Fetch student info from GET /api/students/:studentId  (public-safe)
 *  2. POST /api/webauthn/register/options   → get registration challenge
 *  3. startRegistration(options)            → phone fingerprint setup
 *  4. POST /api/webauthn/register/verify    → persist the credential
 */
const EnrollPage = () => {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId') || '';
  const token = searchParams.get('token') || '';

  const [student, setStudent] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [infoError, setInfoError] = useState('');

  const [step, setStep] = useState('idle'); // idle | registering | success | error
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch student info
  useEffect(() => {
    if (!studentId || !token) {
      setInfoError('Invalid enrollment link. Please use the exact link provided by your admin.');
      setLoadingInfo(false);
      return;
    }

    axiosInstance
      .get(`/api/students/${studentId}`)
      .then(({ data }) => setStudent(data))
      .catch(() =>
        setInfoError('Student not found. Please check the link or contact your administrator.')
      )
      .finally(() => setLoadingInfo(false));
  }, [studentId]);

  const handleRegister = async () => {
    setStep('registering');
    setErrorMsg('');

    try {
      // 1. Get registration options
      const { data: optData } = await axiosInstance.post('/api/webauthn/register/options', {
        studentId,
        token
      });

      // 2. Trigger device biometric setup
      const regResult = await startRegistration({ optionsJSON: optData });

      // 3. Verify & persist credential
      const { data: verifyData } = await axiosInstance.post('/api/webauthn/register/verify', {
        credential: regResult,
        studentId,
      });

      if (verifyData.verified) {
        setStep('success');
      } else {
        throw new Error(verifyData.message || 'Registration could not be verified.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed.';
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Fingerprint setup was cancelled. Please tap the button and follow your phone\'s prompts.');
      } else if (msg.toLowerCase().includes('already')) {
        setErrorMsg('A fingerprint is already registered for this account. If you need to re-register, contact your admin.');
      } else {
        setErrorMsg(msg);
      }
      setStep('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 flex flex-col items-center justify-center px-5 py-12">

      {/* Decorative blob */}
      <div className="absolute top-1/3 right-0 w-72 h-72 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-sm bg-slate-900/80 border border-slate-700/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-blue-400 to-teal-600" />

        <div className="px-7 py-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-14 h-14 flex items-center justify-center mb-1">
              <img src="/Tech_wave_logo_1-removebg-preview.png" alt="TechWave Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white">Fingerprint Setup</h1>
            <p className="text-slate-400 text-sm">TechWave Software House</p>
          </div>

          <AnimatePresence mode="wait">
            {/* ─── Loading student info ─── */}
            {loadingInfo && (
              <motion.div
                key="loading"
                className="flex items-center justify-center py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <svg className="w-8 h-8 text-teal-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </motion.div>
            )}

            {/* ─── Info error ─── */}
            {!loadingInfo && infoError && (
              <motion.div
                key="info-error"
                className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-5 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-rose-400 font-semibold">Link Error</p>
                <p className="text-slate-400 text-sm mt-2">{infoError}</p>
              </motion.div>
            )}

            {/* ─── Idle — ready to register ─── */}
            {!loadingInfo && !infoError && step === 'idle' && (
              <motion.div
                key="idle"
                className="flex flex-col gap-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Student identity confirmation */}
                {student && (
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Registering fingerprint for</p>
                    <p className="text-white font-semibold text-lg">{student.name}</p>
                    <p className="text-slate-400 text-sm font-mono">{student.rollNumber}</p>
                  </div>
                )}

                {/* Privacy notice */}
                <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-400 text-lg shrink-0 mt-0.5">🔒</span>
                    <div>
                      <p className="text-blue-300 font-medium text-sm">Your privacy is protected</p>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                        No fingerprint image or photo is ever stored. Your device creates a secure cryptographic key that stays on your phone — only the key is shared, never your biometric data.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  id="register-fingerprint-btn"
                  onClick={handleRegister}
                  className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-teal-700/30 flex items-center justify-center gap-2 text-base"
                >
                  <span className="text-xl">👆</span>
                  Register my fingerprint
                </button>

                <p className="text-xs text-slate-500 text-center">
                  This is a one-time setup. After this, you can mark attendance daily by scanning the entrance QR.
                </p>
              </motion.div>
            )}

            {/* ─── Registering ─── */}
            {step === 'registering' && (
              <motion.div
                key="registering"
                className="flex flex-col items-center gap-5 py-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl">👆</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold">Setting up fingerprint…</p>
                  <p className="text-slate-400 text-sm mt-1">Follow your phone's prompts to complete setup</p>
                </div>
              </motion.div>
            )}

            {/* ─── Success ─── */}
            {step === 'success' && (
              <motion.div
                key="success"
                className="py-4 flex flex-col items-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SuccessAnimation message="Fingerprint Registered!" />
                <div className="text-center">
                  <p className="text-slate-300 text-sm leading-relaxed">
                    You're all set! From now on, scan the QR code at the entrance each day to mark your attendance with your fingerprint.
                  </p>
                </div>
                <div className="w-full bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-4 text-center">
                  <p className="text-emerald-400 text-sm font-medium">✅ Ready to mark attendance daily</p>
                </div>
              </motion.div>
            )}

            {/* ─── Error ─── */}
            {step === 'error' && (
              <motion.div
                key="error"
                className="flex flex-col gap-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-5 text-center">
                  <div className="text-3xl mb-2">⚠️</div>
                  <p className="text-rose-400 font-semibold">Registration Failed</p>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">{errorMsg}</p>
                </div>
                <button
                  onClick={() => setStep('idle')}
                  className="w-full bg-slate-700/60 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  ← Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <p className="mt-6 text-slate-600 text-xs text-center z-10">
        Need help? Contact your institute administrator.
      </p>
    </div>
  );
};

export default EnrollPage;
