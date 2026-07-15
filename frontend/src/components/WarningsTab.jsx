import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { motion } from 'framer-motion';

const WarningsTab = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch all students, we filter <75% client side for simplicity here since we reuse stats
    Promise.all([
      axiosInstance.get('/api/admin/students'),
      axiosInstance.get('/api/admin/students/stats')
    ]).then(([stRes, statRes]) => {
      const statsMap = {};
      (statRes.data.stats || []).forEach(s => {
        statsMap[s.id] = s.percentage;
      });

      const enriched = (stRes.data.students || []).map(s => ({
        ...s,
        percentage: statsMap[s._id] || 0
      }));

      // Filter only those below 75%
      setStudents(enriched.filter(s => s.percentage < 75));
      setLoading(false);
    }).catch(err => {
      setError('Failed to load warning list.');
      setLoading(false);
    });
  }, []);

  const handleSendEmails = async () => {
    if (!window.confirm(`Send warning emails to all ${students.length} students currently on this list?`)) return;
    setSending(true);
    try {
      const { data } = await axiosInstance.post('/api/admin/warnings/send');
      alert(data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to trigger emails.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="py-12 flex justify-center"><svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Low Attendance Warnings</h2>
          <p className="text-sm text-slate-400 mt-1">Students below the mandatory 75% threshold.</p>
        </div>
        <button
          onClick={handleSendEmails}
          disabled={sending || students.length === 0}
          className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-md flex items-center gap-2"
        >
          {sending ? 'Processing...' : 'Send Bulk Warning Emails'}
        </button>
      </div>

      {error && <div className="text-rose-400 mb-4">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/60 text-slate-400 text-left">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Roll No.</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold text-right">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                  Great job! No students have attendance below 75%.
                </td>
              </tr>
            ) : (
              students.map((student, idx) => (
                <tr key={student._id} className={`border-t border-slate-700/40 ${idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/20'}`}>
                  <td className="px-4 py-3 text-white font-medium">{student.name}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{student.rollNumber}</td>
                  <td className="px-4 py-3 text-slate-400">{student.email || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      student.percentage >= 50 ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'
                    }`}>
                      {student.percentage}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default WarningsTab;
