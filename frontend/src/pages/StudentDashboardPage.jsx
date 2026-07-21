import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';

const StudentDashboardPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active section tab: 'attendance' | 'leave'
  const [activeTab, setActiveTab] = useState('attendance');

  // Leave Modal state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ date: new Date().toISOString().split('T')[0], reason: '' });
  const [leaveSubmitLoading, setLeaveSubmitLoading] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profRes, attRes, leaveRes] = await Promise.all([
        axiosInstance.get('/api/student/profile'),
        axiosInstance.get('/api/student/attendance'),
        axiosInstance.get('/api/student/leave-requests')
      ]);

      setProfile(profRes.data.student);
      setAttendance(attRes.data.records || []);
      setLeaveRequests(leaveRes.data.requests || []);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/student/login', { replace: true });
      } else {
        setError(err.response?.data?.message || 'Failed to load portal data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/api/student/logout');
    } catch {
      // ignore
    } finally {
      navigate('/student/login', { replace: true });
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveForm.date || !leaveForm.reason.trim()) {
      setLeaveError('Please select a date and enter a reason.');
      return;
    }

    setLeaveSubmitLoading(true);
    setLeaveError('');
    setLeaveSuccess('');

    try {
      const { data } = await axiosInstance.post('/api/student/leave-requests', leaveForm);
      setLeaveSuccess(data.message || 'Leave request submitted!');
      setLeaveForm({ date: new Date().toISOString().split('T')[0], reason: '' });

      // Refresh leave requests
      const leaveRes = await axiosInstance.get('/api/student/leave-requests');
      setLeaveRequests(leaveRes.data.requests || []);

      setTimeout(() => {
        setIsLeaveModalOpen(false);
        setLeaveSuccess('');
      }, 1500);
    } catch (err) {
      setLeaveError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setLeaveSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-10 h-10 text-teal-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-400 text-sm">Loading Student Portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4">
        <p className="text-rose-400 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── HEADER ── */}
        <header className="flex items-center justify-between bg-slate-900/60 border border-slate-800 backdrop-blur-xl p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <img src="/Tech_wave_logo_1-removebg-preview.png" alt="Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-white leading-none">TechWave Student Portal</h1>
              <p className="text-xs text-slate-400 mt-0.5">Welcome back, {profile?.name}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700/60 rounded-xl text-xs font-medium text-slate-300 transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </header>

        {/* ── PROFILE & OVERVIEW CARD ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="inline-block px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full text-xs font-medium text-teal-400 mb-3">
                {profile?.field || 'General'} Student
              </div>
              <h2 className="text-2xl font-bold text-white">{profile?.name}</h2>
              <p className="text-sm text-slate-400 mt-1">Roll No: <span className="font-mono text-teal-300 font-semibold">{profile?.rollNumber}</span></p>
              <p className="text-sm text-slate-400 mt-0.5">Email: {profile?.email || 'N/A'}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Status: <strong className={profile?.isEnrolled ? "text-emerald-400" : "text-amber-400"}>{profile?.isEnrolled ? "Biometrics Enrolled ✅" : "Not Enrolled ⚠️"}</strong></span>
              <span>Joined: {new Date().getFullYear()}</span>
            </div>
          </div>

          {/* Stats Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="relative w-24 h-24 flex items-center justify-center mb-3">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={profile?.percentage >= 75 ? "text-emerald-400" : profile?.percentage >= 50 ? "text-amber-400" : "text-rose-400"}
                  strokeDasharray={`${profile?.percentage || 0}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xl font-extrabold text-white">{profile?.percentage}%</span>
            </div>
            <p className="text-sm font-medium text-slate-300">Overall Attendance</p>
            <p className="text-xs text-slate-500 mt-1">{profile?.presentRecords} Present / {profile?.totalRecords} Total Days</p>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'attendance'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📅 Attendance History ({attendance.length})
            </button>
            <button
              onClick={() => setActiveTab('leave')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'leave'
                  ? 'bg-teal-600/20 text-teal-400 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ✉️ Leave Requests ({leaveRequests.length})
            </button>
          </div>

          {activeTab === 'leave' && (
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
            >
              + Request Leave
            </button>
          )}
        </div>

        {/* ── TAB CONTENT ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'attendance' ? (
            <motion.div
              key="att-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden"
            >
              {attendance.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">No attendance records found yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/80 text-slate-400 text-xs border-b border-slate-800">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">Date</th>
                        <th className="px-5 py-3.5 font-semibold">Status</th>
                        <th className="px-5 py-3.5 font-semibold">Time Marked</th>
                        <th className="px-5 py-3.5 font-semibold">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {attendance.map((rec) => (
                        <tr key={rec._id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-slate-300">{rec.date}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              rec.status === 'present'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${rec.status === 'present' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              {rec.status === 'present' ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400">
                            {rec.timeMarked ? new Date(rec.timeMarked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400">
                            {rec.isManual ? 'Manual Override' : 'Biometric / QR Scan'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="leave-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden"
            >
              {leaveRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">No leave requests submitted yet. Click "+ Request Leave" to submit one.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/80 text-slate-400 text-xs border-b border-slate-800">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">Leave Date</th>
                        <th className="px-5 py-3.5 font-semibold">Reason</th>
                        <th className="px-5 py-3.5 font-semibold">Status</th>
                        <th className="px-5 py-3.5 font-semibold">Admin Note</th>
                        <th className="px-5 py-3.5 font-semibold">Submitted On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {leaveRequests.map((req) => (
                        <tr key={req._id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-slate-300">{req.date}</td>
                          <td className="px-5 py-3.5 text-slate-300 max-w-xs truncate">{req.reason}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              req.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : req.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {req.status === 'approved' && 'Approved ✅'}
                              {req.status === 'rejected' && 'Rejected ❌'}
                              {req.status === 'pending' && 'Pending ⏳'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400">{req.adminNote || '—'}</td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── SUBMIT LEAVE MODAL ── */}
      <AnimatePresence>
        {isLeaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLeaveModalOpen(false)}
            />

            <motion.div
              className="relative z-10 bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h3 className="text-lg font-semibold text-white mb-1">Submit Leave Request</h3>
              <p className="text-xs text-slate-400 mb-4">Request leave for a specific date</p>

              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Leave Date</label>
                  <input
                    type="date"
                    value={leaveForm.date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Reason for Leave</label>
                  <textarea
                    rows={3}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="e.g. Medical emergency / Family function"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {leaveError && <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">{leaveError}</p>}
                {leaveSuccess && <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">{leaveSuccess}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLeaveModalOpen(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium py-2.5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={leaveSubmitLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {leaveSubmitLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default StudentDashboardPage;
