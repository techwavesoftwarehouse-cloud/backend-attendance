import { motion } from 'framer-motion';

/**
 * StatCard — summary metric card for the admin dashboard.
 * Props: icon (emoji or ReactNode), label, value, accent (tailwind color key)
 */
const StatCard = ({ icon, label, value, accent = 'blue' }) => {
  const accentMap = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    rose: 'from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400',
  };

  const classes = accentMap[accent] || accentMap.blue;

  return (
    <motion.div
      className={`bg-gradient-to-br ${classes} border rounded-xl p-5 flex flex-col gap-2`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="text-2xl">{icon}</div>
      <p className="text-sm text-slate-400 font-medium">{label}</p>
      <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
    </motion.div>
  );
};

export default StatCard;
