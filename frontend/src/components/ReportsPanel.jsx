import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { motion } from 'framer-motion';

const ReportsPanel = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  // Default to last 7 days
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    
    setFrom(start.toISOString().split('T')[0]);
    setTo(end.toISOString().split('T')[0]);
  }, []);

  const fetchReport = async () => {
    if (!from || !to) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosInstance.get('/api/admin/attendance/report', {
        params: { from, to }
      });
      setReport(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!from || !to) return;
    const url = `/api/admin/attendance/export?from=${from}&to=${to}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">From Date</label>
          <input 
            type="date" 
            value={from} 
            onChange={(e) => setFrom(e.target.value)}
            className="bg-slate-800 border border-slate-600/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">To Date</label>
          <input 
            type="date" 
            value={to} 
            onChange={(e) => setTo(e.target.value)}
            className="bg-slate-800 border border-slate-600/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <button 
            onClick={fetchReport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Loading...' : 'Generate Report'}
          </button>
          {report && (
            <button 
              onClick={handleExport}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-rose-400 mb-4">{error}</div>}

      {report && (
        <div className="overflow-hidden rounded-xl border border-slate-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-slate-400 text-left">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Roll No.</th>
                <th className="px-4 py-3 font-semibold text-center">Present Days</th>
                <th className="px-4 py-3 font-semibold text-center">Absent Days</th>
                <th className="px-4 py-3 font-semibold text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {report.report.map((student, idx) => (
                <tr key={student.id} className={`border-t border-slate-700/40 ${idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/20'}`}>
                  <td className="px-4 py-3 text-white">{student.name}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{student.rollNumber}</td>
                  <td className="px-4 py-3 text-emerald-400 font-medium text-center">{student.presentDays}</td>
                  <td className="px-4 py-3 text-rose-400 font-medium text-center">{student.absentDays}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      student.percentage >= 75 ? 'bg-emerald-500/15 text-emerald-400' :
                      student.percentage >= 50 ? 'bg-amber-500/15 text-amber-400' :
                      'bg-rose-500/15 text-rose-400'
                    }`}>
                      {student.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
              {report.report.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">
                    No students enrolled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default ReportsPanel;
