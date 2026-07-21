import { motion, AnimatePresence } from 'framer-motion';

/**
 * StudentTable — dynamic table used for attendance list AND student management list.
 * Props:
 *   students: array of student objects
 *   type: 'present' | 'absent' | 'management'
 *   onDelete: (id) => void  (management tab only)
 *   onReset: (id) => void   (management tab only - reset enrollment)
 *   onOverride: (id, action) => void (present/absent tabs - manual attendance toggle)
 *   showTime: boolean
 */
const StudentTable = ({ students = [], type = 'present', onDelete, onReset, onResendEmail, onOverride, showTime = false }) => {
  const isEmpty = students.length === 0;
  const isManagement = type === 'management';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800/60 text-slate-400 text-left">
            <th className="px-4 py-3 font-semibold">#</th>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Roll No.</th>
            {isManagement && <th className="px-4 py-3 font-semibold text-center">Attendance %</th>}
            {showTime && <th className="px-4 py-3 font-semibold">Time</th>}
            {type === 'present' && !showTime && <th className="px-4 py-3 font-semibold">Status</th>}
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {isEmpty ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                  {type === 'present' ? 'No students present yet.' : 
                   type === 'absent' ? 'All students present! 🎉' : 
                   'No students found.'}
                </td>
              </tr>
            ) : (
              students.map((student, idx) => (
                <motion.tr
                  key={student.id || student._id || idx}
                  className={`border-t border-slate-700/40 ${
                    idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/20'
                  } hover:bg-slate-700/30 transition-colors`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                >
                  <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-white font-medium">{student.name}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono">{student.rollNumber}</td>
                  
                  {isManagement && (
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        (student.percentage || 0) >= 75 ? 'bg-emerald-500/15 text-emerald-400' :
                        (student.percentage || 0) >= 50 ? 'bg-amber-500/15 text-amber-400' :
                        'bg-rose-500/15 text-rose-400'
                      }`}>
                        {student.percentage || 0}%
                      </span>
                    </td>
                  )}

                  {showTime && (
                    <td className="px-4 py-3 text-emerald-400 font-mono text-xs">
                      {student.timeMarked ? new Date(student.timeMarked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      {student.isManual && <span className="ml-2 text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">Manual</span>}
                    </td>
                  )}

                  {type === 'present' && !showTime && (
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Present
                      </span>
                    </td>
                  )}

                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    {/* Management Actions */}
                    {isManagement && onResendEmail && (
                      <button onClick={() => onResendEmail(student.id || student._id)} className="text-blue-400 hover:text-blue-300 text-xs font-medium px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-all border border-transparent hover:border-blue-500/20">
                        Resend Email
                      </button>
                    )}
                    {isManagement && onReset && (
                      <button onClick={() => onReset(student.id || student._id)} className="text-amber-400 hover:text-amber-300 text-xs font-medium px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-all border border-transparent hover:border-amber-500/20">
                        Reset Enroll
                      </button>
                    )}
                    {isManagement && onDelete && (
                      <button onClick={() => onDelete(student.id || student._id)} className="text-rose-400 hover:text-rose-300 text-xs font-medium px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20">
                        Delete
                      </button>
                    )}
                    
                    {/* Attendance Override Actions */}
                    {type === 'absent' && onOverride && (
                      <button onClick={() => onOverride(student.id || student._id, 'present')} className="text-emerald-400 hover:text-emerald-300 text-xs font-medium px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/20">
                        Mark Present
                      </button>
                    )}
                    {type === 'present' && onOverride && (
                      <button onClick={() => onOverride(student.id || student._id, 'absent')} className="text-rose-400 hover:text-rose-300 text-xs font-medium px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20">
                        Mark Absent
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;
