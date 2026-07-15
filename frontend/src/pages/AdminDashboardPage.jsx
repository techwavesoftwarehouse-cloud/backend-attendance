import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';
import StatCard from '../components/StatCard';
import StudentTable from '../components/StudentTable';
import AddStudentModal from '../components/AddStudentModal';
import BulkImportModal from '../components/BulkImportModal';
import ThemeToggle from '../components/ThemeToggle';
import ReportsPanel from '../components/ReportsPanel';
import OverviewTab from '../components/OverviewTab';
import WarningsTab from '../components/WarningsTab';
import SecuritySettingsTab from '../components/SecuritySettingsTab';
import PrintQRModal from '../components/PrintQRModal';

// Format date as YYYY-MM-DD for the API and <input type="date">
const toDateString = (d) => d.toISOString().split('T')[0];

const AdminDashboardPage = () => {
  const navigate = useNavigate();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminUsername, setAdminUsername] = useState('');

  // Auth guard: Check cookie via /api/admin/me
  useEffect(() => {
    axiosInstance.get('/api/admin/me')
      .then((res) => {
        setAdminUsername(res.data.username);
        setCheckingAuth(false);
      })
      .catch(() => {
        navigate('/admin/login', { replace: true });
      });
  }, [navigate]);

  const today = toDateString(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendanceData, setAttendanceData] = useState({ present: [], absent: [] });
  const [fieldStats, setFieldStats] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [attendanceError, setAttendanceError] = useState('');

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance' | 'students' | 'reports' | 'subjects' | 'warnings' | 'settings'
  const [subTab, setSubTab] = useState('present'); // 'present' | 'absent'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isPrintQROpen, setIsPrintQROpen] = useState(false);

  // Password change state
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '' });
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Fetch attendance + field stats for the selected date
  const fetchAttendance = useCallback(async () => {
    setLoadingAttendance(true);
    setAttendanceError('');
    try {
      const endpoint = selectedDate === today ? '/api/admin/attendance/today' : `/api/admin/attendance/${selectedDate}`;
      const [{ data }, { data: fsData }] = await Promise.all([
        axiosInstance.get(endpoint),
        axiosInstance.get(`/api/admin/attendance/fieldstats?date=${selectedDate}`),
      ]);
      setAttendanceData({
        present: data.present || [],
        absent: data.absent || [],
      });
      setFieldStats(fsData.stats || []);
    } catch (err) {
      setAttendanceError(err.response?.data?.message || 'Failed to load attendance data.');
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedDate, today]);

  // Fetch full student list + stats
  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      // First get students, then their overall stats
      const { data: studentsData } = await axiosInstance.get('/api/admin/students');
      const { data: statsData } = await axiosInstance.get('/api/admin/students/stats');
      
      const statsMap = {};
      (statsData.stats || []).forEach(s => {
        statsMap[s.id] = s.percentage;
      });

      const enrichedStudents = (studentsData.students || []).map(s => ({
        ...s,
        percentage: statsMap[s._id] || 0
      }));

      setAllStudents(enrichedStudents);
    } catch {
      // Silently fail
    } finally {
      setLoadingStudents(false);
    }
  }, []);



  useEffect(() => {
    if (!checkingAuth && activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [checkingAuth, fetchAttendance, activeTab]);

  useEffect(() => {
    if (!checkingAuth && activeTab === 'students') {
      fetchStudents();
    }
  }, [checkingAuth, fetchStudents, activeTab]);

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/api/admin/logout');
    } catch (err) {
      console.error(err);
    }
    navigate('/admin/login', { replace: true });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    setPassError('');
    try {
      const { data } = await axiosInstance.post('/api/admin/change-password', passForm);
      alert(data.message);
      setIsPassModalOpen(false);
      navigate('/admin/login', { replace: true }); // Will require re-login
    } catch (err) {
      setPassError(err.response?.data?.message || 'Password change failed.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await axiosInstance.delete(`/api/admin/students/${deleteConfirm}`);
      setAllStudents((prev) => prev.filter((s) => (s.id || s._id) !== deleteConfirm));
      setDeleteConfirm(null);
      fetchAttendance(); // refresh attendance too
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete student.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResetEnrollment = async (studentId) => {
    if (!window.confirm('Reset this student\'s enrollment? They will need to register a new fingerprint.')) return;
    try {
      const { data } = await axiosInstance.post(`/api/admin/students/${studentId}/reset-enrollment`);
      alert(`Reset successful. New link:\n${data.enrollLink}`);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset enrollment.');
    }
  };

  const handleManualOverride = async (studentId, action) => { // action: 'present' | 'absent'
    try {
      if (action === 'present') {
        await axiosInstance.post('/api/admin/attendance/manual', {
          studentId, date: selectedDate
        });
      } else {
        await axiosInstance.delete('/api/admin/attendance/manual', {
          data: { studentId, date: selectedDate }
        });
      }
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to override attendance.');
    }
  };

  const handleExportCSV = () => {
    const url = `/api/admin/attendance/export?date=${selectedDate}`;
    window.open(url, '_blank');
  };

  // Derived stats
  const totalEnrolled = attendanceData.present.length + attendanceData.absent.length;
  const presentCount = attendanceData.present.length;
  const absentCount = attendanceData.absent.length;
  const percentage = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;
  const isToday = selectedDate === today;
  const displayDate = isToday ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  if (checkingAuth) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* ─── Top Navigation Bar ─── */}
      <header className="bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center">
              <img src="/Tech_wave_logo_1-removebg-preview.png" alt="TechWave Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">TechWave Software House</p>
              <p className="text-xs text-slate-500 leading-none mt-0.5">Admin Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => setIsPassModalOpen(true)}
              className="text-slate-400 hover:text-white text-sm hidden sm:inline transition-colors"
            >
              Change Password
            </button>
            {/* ── Print QR button ── */}
            <button
              onClick={() => setIsPrintQROpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-all shadow-md shadow-indigo-700/30"
              title="Permanent QR print karein aur class mein lagaein"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span className="hidden sm:inline">Print QR</span>
            </button>
            {/* ── QR Screen launcher ── */}
            <button
              onClick={() => window.open('/qr-screen', '_blank')}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-all shadow-md shadow-teal-700/30"
              title="Open this screen in class — students will scan the QR to mark attendance"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="hidden sm:inline">QR Screen</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ─── Page title + tab switcher ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              {activeTab === 'overview' ? 'Dashboard Overview' :
               activeTab === 'attendance' ? `Attendance — ${displayDate}` : 
               activeTab === 'students' ? 'Student Management' :
               activeTab === 'reports' ? 'Attendance Reports' :
               activeTab === 'warnings' ? 'Low Attendance Warnings' :
               'Security & Settings'}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 gap-1 flex-wrap">
              {[
                { key: 'overview', label: 'Overview', icon: '📊' },
                { key: 'attendance', label: 'Attendance', icon: '📝' },
                { key: 'students', label: 'Students', icon: '👥' },
                { key: 'reports', label: 'Reports', icon: '📈' },
                { key: 'warnings', label: 'Warnings', icon: '⚠️' },
                { key: 'settings', label: 'Settings', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
            
            {activeTab === 'students' && (
              <>
                <button
                  onClick={() => setIsBulkImportOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-md shadow-emerald-700/20"
                >
                  Bulk Import
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-md shadow-blue-700/20"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Student
                </button>
              </>
            )}
            
            {activeTab === 'attendance' && (
              <button
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-md shadow-emerald-700/20 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Filters specific to Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="flex gap-4 items-center mb-6 bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-800 border border-slate-600/50 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════ OVERVIEW TAB ═══ */}
          {activeTab === 'overview' && (
            <OverviewTab />
          )}

          {/* ═══════════════════════════════════════════ ATTENDANCE TAB ═══ */}
          {activeTab === 'attendance' && (
            <motion.div key="attendance-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
                <StatCard icon="👥" label="Total Students" value={totalEnrolled} accent="blue" />
                <StatCard icon="✅" label="Present" value={presentCount} accent="emerald" />
                <StatCard icon="❌" label="Absent" value={absentCount} accent="rose" />
                <StatCard icon="📈" label="Attendance Rate" value={`${percentage}%`} accent={percentage >= 75 ? 'emerald' : percentage >= 50 ? 'amber' : 'rose'} />
              </div>

              {/* ── Field-wise Breakdown ── */}
              {fieldStats.length > 1 && (
                <div className="mb-5 bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-700/40 flex items-center gap-2">
                    <span>🏫</span>
                    <span className="text-sm font-semibold text-slate-300">Field / Class Breakdown</span>
                  </div>
                  <div className="divide-y divide-slate-700/30">
                    {fieldStats.map((f) => (
                      <div key={f.field} className="flex items-center px-4 py-2.5 gap-4">
                        <span className="text-slate-300 font-medium text-sm w-28 shrink-0">{f.field}</span>
                        <div className="flex-1 bg-slate-700/40 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${f.percentage >= 75 ? 'bg-emerald-500' : f.percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${f.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 w-24 text-right">
                          {f.present}/{f.total} &nbsp;·&nbsp;
                          <span className={f.percentage >= 75 ? 'text-emerald-400' : f.percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                            {f.percentage}%
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mb-4">
                {[
                  { key: 'present', label: `Present (${presentCount})` },
                  { key: 'absent', label: `Absent (${absentCount})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setSubTab(t.key)}
                    className={`text-sm font-medium px-4 py-1.5 rounded-full transition-all border ${
                      subTab === t.key
                        ? t.key === 'present' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'text-slate-400 border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {loadingAttendance ? (
                <div className="flex justify-center py-16"><svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>
              ) : attendanceError ? (
                <div className="text-center py-12"><p className="text-rose-400">{attendanceError}</p><button onClick={fetchAttendance} className="mt-3 text-blue-400">Retry</button></div>
              ) : (
                <StudentTable
                  students={subTab === 'present' ? attendanceData.present : attendanceData.absent}
                  type={subTab}
                  showTime={subTab === 'present'}
                  onOverride={handleManualOverride}
                />
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════ STUDENTS TAB ══════ */}
          {activeTab === 'students' && (
            <motion.div key="students-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {loadingStudents ? (
                <div className="flex justify-center py-16"><svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>
              ) : (
                <StudentTable
                  students={allStudents}
                  type="management"
                  onDelete={(id) => setDeleteConfirm(id)}
                  onReset={handleResetEnrollment}
                  showTime={false}
                />
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════ REPORTS TAB ══════ */}
          {activeTab === 'reports' && (
            <ReportsPanel />
          )}


          {/* ═══════════════════════════════════════════ WARNINGS TAB ══════ */}
          {activeTab === 'warnings' && (
            <WarningsTab />
          )}

          {/* ═══════════════════════════════════════════ SETTINGS TAB ══════ */}
          {activeTab === 'settings' && (
            <SecuritySettingsTab />
          )}
        </AnimatePresence>
      </main>

      {/* ─── Modals ─── */}
      <AddStudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { fetchStudents(); fetchAttendance(); }} />
      <BulkImportModal isOpen={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} onSuccess={() => { fetchStudents(); fetchAttendance(); }} />

      {/* ─── Delete Confirmation Dialog ─── */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !deleteLoading && setDeleteConfirm(null)} />
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
              <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                <h3 className="text-white font-semibold text-center text-lg mb-2">Delete Student</h3>
                <p className="text-slate-400 text-sm text-center">This will permanently remove the student and all attendance records.</p>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setDeleteConfirm(null)} disabled={deleteLoading} className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl">Cancel</button>
                  <button onClick={handleDeleteConfirmed} disabled={deleteLoading} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl">
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Password Change Dialog ─── */}
      <AnimatePresence>
        {isPassModalOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !passLoading && setIsPassModalOpen(false)} />
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
              <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                <h3 className="text-white font-semibold text-lg mb-4">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Current Password</label>
                    <input type="password" required value={passForm.currentPassword} onChange={e => setPassForm({...passForm, currentPassword: e.target.value})} className="w-full bg-slate-800 border border-slate-600/50 text-white rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">New Password</label>
                    <input type="password" required minLength={6} value={passForm.newPassword} onChange={e => setPassForm({...passForm, newPassword: e.target.value})} className="w-full bg-slate-800 border border-slate-600/50 text-white rounded-lg px-3 py-2" />
                  </div>
                  {passError && <p className="text-rose-400 text-xs">{passError}</p>}
                  <div className="flex gap-3 mt-4">
                    <button type="button" onClick={() => setIsPassModalOpen(false)} className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl">Cancel</button>
                    <button type="submit" disabled={passLoading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl">{passLoading ? 'Updating...' : 'Update'}</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PrintQRModal
        isOpen={isPrintQROpen}
        onClose={() => setIsPrintQROpen(false)}
        origin={window.location.origin}
      />

    </div>
  );
};

export default AdminDashboardPage;
