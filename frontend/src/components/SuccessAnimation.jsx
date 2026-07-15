import { motion } from 'framer-motion';

/**
 * SuccessAnimation — animated checkmark shown on successful attendance / enrollment.
 * Uses SVG path drawing + Framer Motion orchestration.
 */
const SuccessAnimation = ({ message = 'Success!' }) => {
  return (
    <motion.div
      className="flex flex-col items-center gap-6"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Pulse ring */}
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute w-36 h-36 rounded-full bg-emerald-500/20"
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute w-36 h-36 rounded-full bg-emerald-500/15"
          initial={{ scale: 0.6, opacity: 0.6 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
        />

        {/* Circle */}
        <motion.div
          className="relative z-10 w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/40"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        >
          {/* Checkmark SVG */}
          <svg
            className="w-14 h-14"
            viewBox="0 0 52 52"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M14 27 L22 35 L38 18"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.35 }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Message */}
      <motion.p
        className="text-xl font-semibold text-emerald-400 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        {message}
      </motion.p>
    </motion.div>
  );
};

export default SuccessAnimation;
