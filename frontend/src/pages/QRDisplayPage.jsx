import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';

/**
 * QRDisplayPage — full-screen QR display for the entrance monitor/tablet.
 * Route: /qr-screen
 *
 * Polls GET /api/qr/current every 5 s, but also schedules an exact refresh
 * based on expiresInSeconds to avoid showing a stale code.
 */
const QRDisplayPage = () => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [expiresIn, setExpiresIn] = useState(null);
  const [totalDuration, setTotalDuration] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrKey, setQrKey] = useState(0); // used to trigger Framer Motion re-animation

  const pollRef = useRef(null);
  const exactRef = useRef(null);
  const countdownRef = useRef(null);

  const fetchQR = useCallback(async () => {
    try {
      const endpoint = '/api/qr/current';
      const { data } = await axiosInstance.get(endpoint);
      setQrDataUrl(data.qrDataUrl);
      const expires = data.expiresInSeconds ?? 30;
      setExpiresIn(expires);
      setTotalDuration(expires);
      setQrKey((k) => k + 1);
      setError('');
      setLoading(false);

      // Schedule next exact refresh just before token expires
      clearTimeout(exactRef.current);
      exactRef.current = setTimeout(fetchQR, Math.max((expires - 2) * 1000, 1000));
    } catch {
      setError('Unable to fetch QR code. Retrying…');
    }
  }, []);

  // Initial fetch + 5-second safety poll
  useEffect(() => {
    fetchQR();
    pollRef.current = setInterval(fetchQR, 5000);
    return () => {
      clearInterval(pollRef.current);
      clearTimeout(exactRef.current);
      clearInterval(countdownRef.current);
    };
  }, [fetchQR]);

  // Countdown ticker
  useEffect(() => {
    if (expiresIn === null) return;
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [qrKey]); // restart whenever QR updates


  const progressPct = expiresIn !== null ? (expiresIn / totalDuration) * 100 : 100;
  const circumference = 2 * Math.PI * 52; // radius 52

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">

      {/* Background decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Institute header */}
      <motion.div
        className="text-center mb-10 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-16 h-16 flex items-center justify-center">
            <img src="/Tech_wave_logo_1-removebg-preview.png" alt="TechWave Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">TechWave Software House</h1>
        </div>
        <p className="text-slate-400 text-lg font-medium mb-4">Attendance Portal</p>
      </motion.div>

      {/* QR Card */}
      <motion.div
        className="relative z-10 bg-slate-900/70 border border-slate-700/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {/* QR Image with fade/scale transition */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Countdown ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 120 120"
          >
            <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" strokeWidth="6" />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={progressPct > 30 ? '#3b82f6' : '#f43f5e'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progressPct / 100) * circumference}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
            />
          </svg>

          {/* QR image */}
          <div className="w-52 h-52 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-xl">
            {loading && (
              <div className="flex flex-col items-center gap-3">
                <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
            {error && !loading && (
              <p className="text-xs text-center text-rose-500 px-4">{error}</p>
            )}
            <AnimatePresence mode="wait">
              {qrDataUrl && !loading && (
                <motion.img
                  key={qrKey}
                  src={qrDataUrl}
                  alt="Attendance QR Code"
                  className="w-full h-full object-contain p-1"
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.06 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${progressPct > 30 ? 'bg-blue-400' : 'bg-rose-400'}`} />
          <p className={`text-sm font-medium tabular-nums ${progressPct > 30 ? 'text-slate-400' : 'text-rose-400'}`}>
            {expiresIn !== null
              ? `Refreshes in ${expiresIn}s`
              : 'Loading…'}
          </p>
        </div>

        {/* Instruction */}
        <div className="text-center border-t border-slate-700/50 pt-5 w-full">
          <p className="text-2xl font-bold text-white mb-1">Scan to mark attendance</p>
          <p className="text-slate-400 text-sm">Open your phone camera and point it at the code</p>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        className="mt-8 text-slate-600 text-xs z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Powered by TechWave Attendance System
      </motion.p>
    </div>
  );
};

export default QRDisplayPage;
