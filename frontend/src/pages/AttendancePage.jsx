import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { startAuthentication } from '@simplewebauthn/browser';
import axiosInstance from '../api/axiosInstance';
import SuccessAnimation from '../components/SuccessAnimation';

/**
 * Plays a 3-note ascending success chime (Easypaisa / JazzCash style)
 * using the Web Audio API — no external file needed.
 */
const playSuccessSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Notes: C5 → E5 → G5 (a pleasant major triad)
    const notes = [
      { freq: 523.25, start: 0.00, dur: 0.18 },   // C5
      { freq: 659.25, start: 0.17, dur: 0.18 },   // E5
      { freq: 783.99, start: 0.34, dur: 0.38 },   // G5 (held longer)
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      // Quick fade-in then smooth fade-out
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    });
    // Close context after all notes finish
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // Web Audio not available — silently skip
  }
};

/**
 * AttendancePage — student-facing page reached by scanning the entrance QR.
 * Route: /attendance?token=XXXX
 *
 * Flow:
 *  1. Student enters roll number → resolve to studentId server-side
 *  2. POST /api/webauthn/authenticate/options  → get WebAuthn challenge
 *  3. startAuthentication(options)             → phone fingerprint prompt
 *  4. POST /api/webauthn/authenticate/verify   → confirm & mark attendance
 */
const AttendancePage = () => {
  const [searchParams] = useSearchParams();
  const qrToken = searchParams.get('token') || '';
  const isPrinted = !qrToken; // true when accessed via printed static QR

  const [rollNumber, setRollNumber] = useState('');
  const [step, setStep] = useState('input'); // input | verifying | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [notEnrolled, setNotEnrolled] = useState(false);
  const [notEnrolledStudentId, setNotEnrolledStudentId] = useState('');
  const [studentName, setStudentName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rollNumber.trim()) return;

    setStep('verifying');
    setErrorMsg('');
    setNotEnrolled(false);

    try {
      // Get location before verifying
      const coords = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve({ lat: null, lng: null });
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => resolve({ lat: null, lng: null }), // allow server to handle rejection if required
          { timeout: 7000, enableHighAccuracy: true }
        );
      });

      // 1. Get WebAuthn options (resolves roll number → studentId server-side)
      const { data: optData } = await axiosInstance.post(
        '/api/webauthn/authenticate/options',
        { rollNumber: rollNumber.trim(), qrToken }
      );

      if (optData.isEnrolled === false) {
        setNotEnrolled(true);
        setNotEnrolledStudentId(optData.studentId || '');
        setStudentName(optData.name || '');
        setStep('error');
        return;
      }

      // 2. Trigger device biometric
      const authResult = await startAuthentication({ optionsJSON: optData });

      // 3. Verify with server
      const { data: verifyData } = await axiosInstance.post(
        '/api/webauthn/authenticate/verify',
        { 
          credential: authResult, 
          qrToken, 
          rollNumber: rollNumber.trim(), 
          lat: coords.lat,
          lng: coords.lng
        }
      );

      if (verifyData.verified) {
        setStudentName(verifyData.name || '');
        playSuccessSound(); // 🎵 Easypaisa-style chime on success
        setStep('success');
      } else {
        throw new Error(verifyData.message || 'Verification failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong.';

      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('token')) {
        setErrorMsg('This QR code has expired. Please re-scan the screen — it refreshes every 30 seconds.');
      } else if (msg.toLowerCase().includes('already')) {
        setErrorMsg('Your attendance has already been marked for today. See you tomorrow! 👋');
      } else if (msg.toLowerCase().includes('not enrolled') || msg.toLowerCase().includes('enroll')) {
        setNotEnrolled(true);
        setStep('error');
        return;
      } else if (err.name === 'NotAllowedError') {
        setErrorMsg('Fingerprint verification was cancelled or failed. Please try again.');
      } else {
        setErrorMsg(msg);
      }
      setStep('error');
    }
  };

  const retry = () => {
    setStep('input');
    setErrorMsg('');
    setNotEnrolled(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col items-center justify-center px-5 py-12">

      {/* Decorative blob */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-sm bg-slate-900/80 border border-slate-700/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-teal-400 to-blue-600" />

        <div className="px-7 py-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-14 h-14 flex items-center justify-center mb-1">
              <img src="/Tech_wave_logo_1-removebg-preview.png" alt="TechWave Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white">Mark Attendance</h1>
            <p className="text-slate-400 text-sm">TechWave Software House</p>
          </div>

          <AnimatePresence mode="wait">
            {/* ─── Printed QR notice ─── */}
            {isPrinted && step === 'input' && (
              <motion.div
                key="printed-notice"
                className="bg-teal-500/10 border border-teal-500/25 rounded-xl px-3 py-2 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-teal-400 text-xs font-medium">📌 Printed QR — Security via Fingerprint</p>
              </motion.div>
            )}

            {/* ─── Input form ─── */}
            {step === 'input' && (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <div>
                  <label htmlFor="rollNumber" className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Roll Number / Student ID
                  </label>
                  <input
                    id="rollNumber"
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Enter your Roll Number (e.g. CS-101)"
                    required
                    autoComplete="off"
                    className="w-full bg-slate-800 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                    <span>ℹ️</span>
                    Enter the exact Roll Number provided by the administration
                  </p>
                </div>

                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  After submitting, your phone will ask to verify your fingerprint or Face ID to confirm your identity.
                </p>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-700/30 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  Verify Fingerprint
                </button>
              </motion.form>
            )}

            {/* ─── Verifying state ─── */}
            {step === 'verifying' && (
              <motion.div
                key="verifying"
                className="flex flex-col items-center gap-5 py-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl">👆</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold">Verifying identity…</p>
                  <p className="text-slate-400 text-sm mt-1">Follow your phone's biometric prompt</p>
                </div>
              </motion.div>
            )}

            {/* ─── Success ─── */}
            {step === 'success' && (
              <motion.div
                key="success"
                className="py-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SuccessAnimation
                  message={studentName ? `Welcome, ${studentName}! ✓` : 'Attendance marked!'}
                />
                <p className="text-center text-slate-400 text-sm mt-4">
                  Your attendance has been recorded for today.
                </p>
              </motion.div>
            )}

            {/* ─── Error ─── */}
            {step === 'error' && (
              <motion.div
                key="error"
                className="flex flex-col gap-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {notEnrolled ? (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 text-center">
                    <div className="text-3xl mb-2">🔐</div>
                    <p className="text-amber-400 font-semibold">Fingerprint Not Registered</p>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                      You haven't registered your fingerprint yet. Ask your admin for the enrollment link, or use the button below.
                    </p>
                    {notEnrolledStudentId && (
                      <Link
                        to={`/enroll?studentId=${notEnrolledStudentId}`}
                        className="mt-4 inline-block w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-medium py-2.5 rounded-xl transition-colors border border-amber-500/30"
                      >
                        Register Fingerprint →
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-5 text-center">
                    <div className="text-3xl mb-2">⚠️</div>
                    <p className="text-rose-400 font-semibold">Verification Failed</p>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                <button
                  onClick={retry}
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
        Having trouble? Contact your institute administrator.
      </p>
    </div>
  );
};

export default AttendancePage;
