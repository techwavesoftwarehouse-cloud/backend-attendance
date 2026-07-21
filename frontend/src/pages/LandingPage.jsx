import { motion, useMotionValue, animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

/* ══════════════════════════════════════
   TechWave Brand Colours
   Dark  → #0a0f1e (deepest navy)  /  #0d1117  /  #111827
   Light → #f8f7f4  /  #ffffff
   Accent: Blue HSL(220, 90%, 56%) ≈ #1a7fff  →  #0066ff
══════════════════════════════════════ */

/* ── Floating Particle ── */
const Particle = ({ delay, x, y, size, color }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, filter: 'blur(1px)' }}
    animate={{ y: [0, -28, 0, 18, 0], x: [0, 12, -8, 5, 0], opacity: [0.25, 0.7, 0.35, 0.8, 0.25], scale: [1, 1.25, 0.85, 1.1, 1] }}
    transition={{ duration: 7 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

/* ── Orbiting Ring ── */
const OrbitRing = ({ radius, duration, delay, color, dotSize = 6 }) => (
  <motion.div
    className="absolute rounded-full border pointer-events-none"
    style={{ width: radius * 2, height: radius * 2, borderColor: color, borderWidth: 1, top: '50%', left: '50%', marginTop: -radius, marginLeft: -radius, opacity: 0.3 }}
    animate={{ rotate: 360 }}
    transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
  >
    <motion.div
      className="absolute rounded-full"
      style={{ width: dotSize, height: dotSize, background: color, top: -dotSize / 2, left: '50%', marginLeft: -dotSize / 2, boxShadow: `0 0 10px 3px ${color}`, opacity: 1 }}
    />
  </motion.div>
);

/* ── 3D Tilt Card ── */
const TiltCard = ({ children }) => {
  const ref = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const handleMouse = (e) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    animate(rotateX, -dy * 8, { duration: 0.1 });
    animate(rotateY, dx * 8, { duration: 0.1 });
  };
  const handleLeave = () => {
    animate(rotateX, 0, { duration: 0.6, ease: 'easeOut' });
    animate(rotateY, 0, { duration: 0.6, ease: 'easeOut' });
  };
  return (
    <motion.div ref={ref} onMouseMove={handleMouse} onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      className="w-full"
    >{children}</motion.div>
  );
};

/* ── Animated Counter ── */
const AnimatedStat = ({ value, label, icon, delay, isDark }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    const step = Math.ceil(end / (1200 / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
      className="flex flex-col items-center gap-1 px-4"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{count}+</span>
      <span className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#475569' }}>{label}</span>
    </motion.div>
  );
};

/* ══════════════════════════════════════
   MAIN LANDING PAGE
══════════════════════════════════════ */
const LandingPage = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  /* ── theme tokens ── */
  const tw = {
    pageBg:       isDark ? '#0a0f1e'               : '#f8f7f4',
    pageBg2:      isDark ? '#0d1117'               : '#ffffff',
    gridColor:    isDark ? 'rgba(59,130,246,0.07)' : 'rgba(59,130,246,0.08)',
    cardBg:       isDark ? 'rgba(13,17,23,0.92)'   : 'rgba(255,255,255,0.95)',
    cardBorder:   isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.2)',
    statBg:       isDark ? 'rgba(13,17,23,0.8)'    : 'rgba(255,255,255,0.9)',
    statBorder:   isDark ? 'rgba(59,130,246,0.2)'  : 'rgba(59,130,246,0.18)',
    heading:      isDark ? '#ffffff'               : '#0f172a',
    subHeading:   isDark ? '#cbd5e1'               : '#1e293b',
    bodyText:     isDark ? '#94a3b8'               : '#475569',
    stepBg:       isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.05)',
    stepBorder:   isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.2)',
    stepText:     isDark ? '#e2e8f0'               : '#1e293b',
    accentBlue:   '#3b82f6',
    accentBlue2:  '#1a56db',
    glow1:        isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.10)',
    glow2:        isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)',
    badgeBg:      isDark ? 'rgba(59,130,246,0.10)' : 'rgba(59,130,246,0.08)',
    badgeBorder:  isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.2)',
    badgeText:    isDark ? '#93c5fd'               : '#1d4ed8',
    footerText:   isDark ? '#475569'               : '#94a3b8',
    linkColor:    '#3b82f6',
    footerBg:     isDark ? 'rgba(10,15,30,0.9)'   : 'rgba(248,247,244,0.95)',
  };

  const particles = [
    { x: 5,  y: 15, size: 5,  color: isDark ? '#3b82f6' : '#93c5fd', delay: 0 },
    { x: 90, y: 10, size: 7,  color: isDark ? '#6366f1' : '#a5b4fc', delay: 1 },
    { x: 12, y: 72, size: 4,  color: isDark ? '#60a5fa' : '#bfdbfe', delay: 2 },
    { x: 82, y: 78, size: 6,  color: isDark ? '#3b82f6' : '#93c5fd', delay: 0.5 },
    { x: 50, y: 5,  size: 3,  color: isDark ? '#818cf8' : '#c7d2fe', delay: 1.5 },
    { x: 22, y: 48, size: 8,  color: isDark ? '#2563eb' : '#60a5fa', delay: 2.5 },
    { x: 72, y: 38, size: 4,  color: isDark ? '#4f46e5' : '#818cf8', delay: 3 },
    { x: 60, y: 88, size: 5,  color: isDark ? '#3b82f6' : '#93c5fd', delay: 0.8 },
    { x: 3,  y: 42, size: 3,  color: isDark ? '#6366f1' : '#a5b4fc', delay: 3.5 },
    { x: 94, y: 52, size: 7,  color: isDark ? '#3b82f6' : '#bfdbfe', delay: 1.2 },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden"
      style={{ background: isDark
        ? 'linear-gradient(135deg, #0a0f1e 0%, #0d1117 50%, #111827 100%)'
        : 'linear-gradient(135deg, #f8f7f4 0%, #ffffff 50%, #f0f4ff 100%)'
      }}
    >
      {/* ── Animated grid ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${tw.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${tw.gridColor} 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
        animate={{ backgroundPosition: ['0px 0px', '60px 60px'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      />

      {/* ── Radial glows ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div className="absolute rounded-full"
          style={{ width: 700, height: 700, background: `radial-gradient(circle, ${tw.glow1} 0%, transparent 70%)`, top: '5%', left: '50%', transform: 'translateX(-50%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute rounded-full"
          style={{ width: 350, height: 350, background: `radial-gradient(circle, ${tw.glow2} 0%, transparent 70%)`, bottom: '12%', right: '8%' }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div className="absolute rounded-full"
          style={{ width: 280, height: 280, background: `radial-gradient(circle, ${tw.glow2} 0%, transparent 70%)`, top: '55%', left: '3%' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      {/* ── Particles ── */}
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      {/* ══════════ MAIN CONTENT ══════════ */}
      <motion.div
        className="relative z-10 w-full max-w-xl text-center pb-16"
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
      >
        {/* ── Logo with orbit rings ── */}
        <div className="relative flex items-center justify-center mb-6" style={{ height: 200 }}>
          <div className="relative" style={{ width: 120, height: 120 }}>
            <OrbitRing radius={68}  duration={9}  delay={0}   color="#3b82f6" dotSize={7} />
            <OrbitRing radius={92}  duration={15} delay={0.5} color="#6366f1" dotSize={5} />
            <OrbitRing radius={118} duration={22} delay={1}   color="#60a5fa" dotSize={4} />

            <motion.div
              className="absolute inset-0 rounded-3xl flex items-center justify-center"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(99,102,241,0.15))'
                  : 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.10))',
                border: `1px solid ${tw.cardBorder}`,
                backdropFilter: 'blur(16px)',
              }}
              animate={{
                boxShadow: isDark
                  ? ['0 0 35px rgba(59,130,246,0.35)', '0 0 60px rgba(59,130,246,0.6)', '0 0 35px rgba(59,130,246,0.35)']
                  : ['0 0 20px rgba(59,130,246,0.15)', '0 0 40px rgba(59,130,246,0.3)', '0 0 20px rgba(59,130,246,0.15)'],
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.img
                src="/Tech_wave_logo_1-removebg-preview.png"
                alt="TechWave Logo"
                className="w-full h-full object-contain p-3"
                animate={{ rotate: [0, 3, -3, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                style={{ filter: isDark ? 'none' : 'drop-shadow(0 2px 8px rgba(59,130,246,0.3))' }}
              />
            </motion.div>
          </div>
        </div>

        {/* ── Heading ── */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.65 }}>
          {/* TechWave brand badge */}
          <motion.div
            className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: isDark ? 'rgba(37,99,235,0.15)' : 'rgba(59,130,246,0.1)',
              border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.25)'}`,
              color: isDark ? '#93c5fd' : '#1d4ed8',
            }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
            Premium Software House
          </motion.div>

          <h1
            className="text-5xl md:text-6xl font-black tracking-tight mb-2 leading-tight"
            style={{
              background: isDark
                ? 'linear-gradient(90deg, #60a5fa, #818cf8, #3b82f6, #60a5fa)'
                : 'linear-gradient(90deg, #1d4ed8, #4f46e5, #2563eb, #1d4ed8)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'gradientShift 5s linear infinite',
            }}
          >
            TechWave
          </h1>
          <h2
            className="text-xl md:text-2xl font-bold mb-1"
            style={{ color: tw.subHeading }}
          >
            Smart Attendance System
          </h2>
          <p className="text-sm font-medium mb-8" style={{ color: tw.bodyText }}>
            Powered by QR Technology &amp; Real-time Analytics
          </p>
        </motion.div>

        {/* ── Stats bar ── */}
        <motion.div
          className="flex justify-center gap-0 mb-7"
          initial={{ opacity: 0, scaleX: 0.85 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.55 }}
          style={{
            background: tw.statBg,
            border: `1px solid ${tw.statBorder}`,
            borderRadius: 16, padding: '14px 8px',
            backdropFilter: 'blur(16px)',
            boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.06)',
          }}
        >
          <AnimatedStat value={500} label="Students" icon="🎓" delay={0.55} isDark={isDark} />
          <div style={{ width: 1, background: isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.2)', margin: '8px 0' }} />
          <AnimatedStat value={50}  label="Batches"  icon="📚" delay={0.75} isDark={isDark} />
          <div style={{ width: 1, background: isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.2)', margin: '8px 0' }} />
          <AnimatedStat value={99}  label="Accuracy %" icon="✅" delay={0.9} isDark={isDark} />
        </motion.div>

        {/* ── 3D Tilt Card ── */}
        <TiltCard>
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.65 }}
            style={{
              background: tw.cardBg,
              border: `1px solid ${tw.cardBorder}`,
              borderRadius: 20,
              padding: '28px 24px',
              backdropFilter: 'blur(20px)',
              boxShadow: isDark
                ? '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)'
                : '0 10px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
              transformStyle: 'preserve-3d',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* top shine */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
              background: isDark
                ? 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, transparent 100%)',
              borderRadius: '20px 20px 0 0', pointerEvents: 'none',
            }} />

            {/* Blue accent top-border */}
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)', borderRadius: 2 }} />

            {/* QR floating icon */}
            <motion.div className="flex justify-center mb-5"
              animate={{ y: [0, -7, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div style={{
                width: 68, height: 68,
                background: isDark ? 'rgba(37,99,235,0.15)' : 'rgba(59,130,246,0.08)',
                border: `1px solid ${isDark ? 'rgba(59,130,246,0.35)' : 'rgba(59,130,246,0.2)'}`,
                borderRadius: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isDark ? '0 0 24px rgba(59,130,246,0.25)' : '0 4px 16px rgba(59,130,246,0.15)',
              }}>
                <svg style={{ width: 34, height: 34, color: tw.accentBlue }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
            </motion.div>

            <h3 className="text-lg font-bold mb-4" style={{ color: tw.heading }}>Student Portal</h3>

            {/* Steps */}
            <div className="flex flex-col gap-2.5 mb-6">
              {[
                { step: '01', text: 'Locate the displayed QR code in your classroom', icon: '🔍' },
                { step: '02', text: 'Scan the QR code using your device camera', icon: '📷' },
                { step: '03', text: 'Your attendance is automatically marked instantly', icon: '✨' },
              ].map(({ step, text, icon }, i) => (
                <motion.div
                  key={step}
                  className="flex items-center gap-3 text-left"
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.14 }}
                  style={{
                    background: tw.stepBg,
                    border: `1px solid ${tw.stepBorder}`,
                    borderRadius: 12, padding: '10px 14px',
                  }}
                >
                  <span className="text-base">{icon}</span>
                  <div>
                    <span style={{ fontSize: 9, color: tw.accentBlue, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>Step {step}</span>
                    <p className="text-sm font-medium leading-snug" style={{ color: tw.stepText }}>{text}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Live indicator */}
            <motion.div className="flex items-center justify-center gap-2"
              animate={{ opacity: [0.65, 1, 0.65] }} transition={{ duration: 2.2, repeat: Infinity }}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>System Active &amp; Ready</span>
            </motion.div>
          </motion.div>
        </TiltCard>

        {/* ── Feature badges ── */}
        <motion.div className="flex flex-wrap justify-center gap-2 mt-5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05, duration: 0.5 }}
        >
          {['🔒 Secure', '⚡ Real-time', '📊 Analytics', '🌐 Cloud-based'].map((badge) => (
            <motion.span key={badge}
              whileHover={{ scale: 1.08, y: -2 }}
              style={{
                background: tw.badgeBg,
                border: `1px solid ${tw.badgeBorder}`,
                borderRadius: 999, padding: '5px 13px',
                fontSize: 12, fontWeight: 600,
                color: tw.badgeText,
                cursor: 'default',
              }}
            >{badge}</motion.span>
          ))}
        </motion.div>

        {/* ── Visit website button ── */}
        <motion.div className="mt-5"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
        >
          <motion.a
            href="https://techwaveinfo.com"
            target="_blank" rel="noopener noreferrer"
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #1d4ed8, #4f46e5)',
              border: 'none',
              borderRadius: 999, padding: '11px 26px',
              color: '#ffffff', fontSize: 14, fontWeight: 600,
              textDecoration: 'none',
              boxShadow: isDark
                ? '0 4px 20px rgba(29,78,216,0.5), 0 0 0 1px rgba(59,130,246,0.2)'
                : '0 4px 16px rgba(29,78,216,0.35)',
            }}
          >
            <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Visit techwaveinfo.com
            <svg style={{ width: 12, height: 12, opacity: 0.85 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </motion.a>
        </motion.div>
      </motion.div>

      {/* ── Footer ── */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 text-center py-3"
        style={{ background: isDark ? 'rgba(10,15,30,0.85)' : 'rgba(248,247,244,0.92)', backdropFilter: 'blur(8px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
      >
        <div className="flex items-center justify-center gap-3 flex-wrap" style={{ fontSize: 12, color: tw.footerText }}>
          <span>&copy; {new Date().getFullYear()} TechWave Software House</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: tw.footerText, display: 'inline-block' }} />
          <a
            href="https://techwaveinfo.com" target="_blank" rel="noopener noreferrer"
            style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 700 }}
            onMouseEnter={e => e.target.style.color = '#60a5fa'}
            onMouseLeave={e => e.target.style.color = '#3b82f6'}
          >techwaveinfo.com</a>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: tw.footerText, display: 'inline-block' }} />
          <span>All rights reserved</span>
        </div>
      </motion.div>

      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
