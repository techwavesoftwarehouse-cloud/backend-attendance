import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import axiosInstance from '../api/axiosInstance';
import { motion } from 'framer-motion';

const OverviewTab = () => {
  const [data, setData] = useState({ trend: [], distribution: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosInstance.get('/api/admin/analytics')
      .then(res => {
        setData({ 
          trend: res.data.trend || [], 
          distribution: res.data.distribution || [],
          stats: res.data.stats || {}
        });
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load analytics.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="py-12 flex justify-center"><svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>;
  if (error) return <div className="text-rose-400 py-4 text-center">{error}</div>;

  const { totalStudents = 0, totalRecords = 0, enableLocationCheck = false, enableIPCheck = false, allowedRadiusMeters = 100 } = data.stats;

  // Calculate sum of warning and critical students from distribution data
  const criticalCount = data.distribution.find(d => d.name.includes('Critical'))?.value || 0;
  const warningCount = data.distribution.find(d => d.name.includes('Warning'))?.value || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="flex flex-col gap-6"
    >
      
      {/* ─── Stats Grid (Top row) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* Total Students */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-xs font-medium">Total Registered Students</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalStudents}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-lg">
            👥
          </div>
        </div>

        {/* Total Attendance Records */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-xs font-medium">All-time Present Logs</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalRecords}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-lg">
            ✅
          </div>
        </div>

        {/* Security / Anti-Cheat Status */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-xs font-medium">Anti-Cheat Mode</p>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${enableLocationCheck ? 'bg-teal-500/15 text-teal-400 border border-teal-500/20' : 'bg-slate-700/30 text-slate-400 border border-slate-700/30'}`}>
                📍 GPS {enableLocationCheck ? 'ON' : 'OFF'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${enableIPCheck ? 'bg-teal-500/15 text-teal-400 border border-teal-500/20' : 'bg-slate-700/30 text-slate-400 border border-slate-700/30'}`}>
                📡 Wi-Fi {enableIPCheck ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-lg">
            🛡️
          </div>
        </div>

        {/* Action items counter */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-xs font-medium">Critical Students (&lt;50%)</p>
            <h3 className={`text-2xl font-bold mt-1 ${criticalCount > 0 ? 'text-rose-400' : 'text-white'}`}>{criticalCount}</h3>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${criticalCount > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700/10 text-slate-400'}`}>
            ⚠️
          </div>
        </div>

      </div>

      {/* ─── Charts (Middle row) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Trend Chart */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-white">Attendance Trend (Last 7 Days)</h3>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700/40">Present counts</span>
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#334155', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                />
                <Bar dataKey="present" name="Present Students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Chart */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-white">Student Health Distribution</h3>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700/40">Safety statuses</span>
          </div>
          <div className="h-72 w-full text-xs flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                >
                  {data.distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ─── Management Guidelines & Quick Status (Bottom row) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Anti-cheat summary panel */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white mb-2.5 flex items-center gap-1.5">
              <span>🛡️</span> Active Security Configuration
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Cheat prevention runs locally in browser and checks location permissions. Distance matches coordinates.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Allowed Distance:</span>
                <span className="text-white font-medium">{allowedRadiusMeters} meters</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Dynamic Challenge Token:</span>
                <span className="text-white font-medium">30s Auto-expiry</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-400">Printed QR support:</span>
                <span className="text-emerald-400 font-medium">Active (Static)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning panel details */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white mb-2.5 flex items-center gap-1.5">
              <span>⚠️</span> Student Attendance Status
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Students falling below the threshold are marked for warning actions.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Safe (≥75%):</span>
                <span className="text-emerald-400 font-semibold">{data.distribution.find(d => d.name.includes('Safe'))?.value || 0}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Warning (50-74%):</span>
                <span className="text-amber-400 font-semibold">{warningCount}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-400">Total Critical (&lt;50%):</span>
                <span className="text-rose-400 font-semibold">{criticalCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white mb-2.5 flex items-center gap-1.5">
              <span>📋</span> Administrative Checklist
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Print QR code for classroom wall
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Setup Institute location in Settings
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Email notification configuration
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">→</span> Check "Warnings" tab to send low attendance alerts
              </li>
            </ul>
          </div>
        </div>

      </div>

    </motion.div>
  );
};

export default OverviewTab;
