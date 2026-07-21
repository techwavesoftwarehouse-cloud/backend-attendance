import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';
import Admin from '../models/Admin.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import Settings from '../models/Settings.js';
import LeaveRequest from '../models/LeaveRequest.js';
import { authMiddleware } from '../middleware/auth.js';
import { getLocalDateString } from '../utils/dateUtils.js';
import { sendWarningEmail, sendWelcomeEmail } from '../utils/email.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforadminauth123!';
const FRONTEND_ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

// #14 — multer for CSV bulk import (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed.'));
    }
  }
});

// ── Cookie options ──────────────────────────────────────
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   true, // Required for sameSite: 'none'
  sameSite: 'none',
  maxAge:   24 * 60 * 60 * 1000  // 1 day
};

// ── Helper: Attendance for a date ──
const getAttendanceForDate = async (dateStr) => {
  const query = { date: dateStr };

  const presentRecords = await Attendance.find(query).populate('student');

  const presentStudents = presentRecords
    .filter((r) => r.student)
    .map((r) => ({
      id:         r.student._id,
      name:       r.student.name,
      rollNumber: r.student.rollNumber,
      email:      r.student.email,
      timeMarked: r.timeMarked,
      isManual:   r.isManual,
      attendanceId: r._id
    }));

  const presentIds = presentStudents.map((s) => s.id.toString());
  const enrolledStudents = await Student.find({ isEnrolled: true });

  const absentStudents = enrolledStudents
    .filter((s) => !presentIds.includes(s._id.toString()))
    .map((s) => ({
      id:         s._id,
      name:       s.name,
      rollNumber: s.rollNumber,
      email:      s.email
    }));

  return { present: presentStudents, absent: absentStudents };
};

/**
 * ─────────────────────────────────────────────────────
 * PUBLIC ROUTES
 * ─────────────────────────────────────────────────────
 */

// GET /api/students/:id  (used by EnrollPage — public)
router.get('/students/:id', async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id, 'name rollNumber isEnrolled enrollmentTokenUsed');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json(student);
  } catch (error) { next(error); }
});

// POST /api/admin/login  — #1 sets httpOnly cookie
router.post('/admin/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password are required.' });

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin)
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });

    const token = jwt.sign({ id: admin._id, username: admin.username }, JWT_SECRET, { expiresIn: '1d' });

    // #1 — Set httpOnly cookie instead of returning token in body
    res.cookie('adminToken', token, COOKIE_OPTS);
    res.json({ success: true, username: admin.username });
  } catch (error) { next(error); }
});

// POST /api/admin/logout  — #1
router.post('/admin/logout', (req, res) => {
  res.clearCookie('adminToken', { ...COOKIE_OPTS, maxAge: 0 });
  res.json({ success: true });
});

// GET /api/admin/me  — verify session (used by frontend auth check)
router.get('/admin/me', authMiddleware, (req, res) => {
  res.json({ success: true, username: req.admin.username });
});

/**
 * ─────────────────────────────────────────────────────
 * PROTECTED ROUTES
 * ─────────────────────────────────────────────────────
 */

// POST /api/admin/change-password  — #2
router.post('/admin/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });

    const admin = await Admin.findById(req.admin.id);
    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch)
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    const salt = await bcrypt.genSalt(10);
    admin.passwordHash = await bcrypt.hash(newPassword, salt);
    await admin.save();

    // Invalidate old session — clear cookie and ask to re-login
    res.clearCookie('adminToken', { ...COOKIE_OPTS, maxAge: 0 });
    res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (error) { next(error); }
});

// POST /api/admin/students  (Add student — generates enrollment token)
router.post('/admin/students', authMiddleware, async (req, res, next) => {
  try {
    const { name, rollNumber, email, field } = req.body;
    if (!name || !rollNumber)
      return res.status(400).json({ success: false, message: 'Name and roll number are required.' });

    const existing = await Student.findOne({ rollNumber: rollNumber.trim() });
    if (existing)
      return res.status(400).json({ success: false, message: 'Roll number already exists.' });

    // #5 — generate one-time enrollment token
    const enrollmentToken = crypto.randomUUID();

    const student = await Student.create({
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      field: field ? field.trim() : '',
      email: email ? email.trim() : undefined,
      enrollmentToken
    });

    // Build enrollment link for the frontend
    const enrollLink = `${FRONTEND_ORIGIN}/enroll?studentId=${student._id}&token=${enrollmentToken}`;

    // Send welcome / confirmation email (non-blocking — don't await)
    sendWelcomeEmail(student, enrollLink).catch(() => {});

    res.status(201).json({ success: true, student, enrollLink });
  } catch (error) { next(error); }
});

// GET /api/admin/students  (List all students)
router.get('/admin/students', authMiddleware, async (req, res, next) => {
  try {
    const students = await Student.find().sort({ name: 1 });
    res.json({ success: true, students });
  } catch (error) { next(error); }
});

// POST /api/admin/students/bulk-import  — #14
router.post('/admin/students/bulk-import', authMiddleware, upload.single('csv'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded.' });

    const content = req.file.buffer.toString('utf-8');
    let rows;
    try {
      rows = csvParse(content, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid CSV format.' });
    }

    const results = { created: [], skipped: [], errors: [] };

    for (const row of rows) {
      const name       = (row.name || row.Name || '').trim();
      const rollNumber = (row.rollNumber || row.roll_number || row['Roll Number'] || row['Roll No'] || '').trim();
      const email      = (row.email || row.Email || '').trim();

      if (!name || !rollNumber) {
        results.errors.push({ row, reason: 'Missing name or rollNumber' });
        continue;
      }

      const exists = await Student.findOne({ rollNumber });
      if (exists) {
        results.skipped.push({ rollNumber, reason: 'Already exists' });
        continue;
      }

      const enrollmentToken = crypto.randomUUID();
      const student = await Student.create({
        name, rollNumber,
        email: email || undefined,
        enrollmentToken
      });

      const enrollLink = `${FRONTEND_ORIGIN}/enroll?studentId=${student._id}&token=${enrollmentToken}`;
      
      // Fire-and-forget the welcome email
      sendWelcomeEmail(student, enrollLink).catch(() => {});

      results.created.push({
        name, rollNumber,
        enrollLink
      });
    }

    res.json({ success: true, ...results });
  } catch (error) { next(error); }
});

// POST /api/admin/students/:id/resend-welcome
router.post('/admin/students/:id/resend-welcome', authMiddleware, async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    if (!student.email) return res.status(400).json({ success: false, message: 'Student has no email address.' });
    
    const enrollLink = `${FRONTEND_ORIGIN}/enroll?studentId=${student._id}&token=${student.enrollmentToken}`;
    
    // We await this to know if it actually failed to send
    await sendWelcomeEmail(student, enrollLink);
    
    res.json({ success: true, message: 'Welcome email resent successfully.' });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to resend email.' });
  }
});

// DELETE /api/admin/students/:id
router.delete('/admin/students/:id', authMiddleware, async (req, res, next) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    await Attendance.deleteMany({ student: req.params.id });
    res.json({ success: true, message: 'Student and attendance records deleted.' });
  } catch (error) { next(error); }
});

// POST /api/admin/students/:id/reset-enrollment  — #11
router.post('/admin/students/:id/reset-enrollment', authMiddleware, async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const enrollmentToken = crypto.randomUUID();
    student.webauthnCredentials = [];
    student.isEnrolled           = false;
    student.currentChallenge     = undefined;
    student.challengeExpiry      = undefined;
    student.enrollmentToken      = enrollmentToken;
    student.enrollmentTokenUsed  = false;
    await student.save();

    const enrollLink = `${FRONTEND_ORIGIN}/enroll?studentId=${student._id}&token=${enrollmentToken}`;
    res.json({ success: true, message: 'Enrollment reset. Share the new link.', enrollLink });
  } catch (error) { next(error); }
});

// GET /api/admin/students/stats  — #8 per-student attendance %
router.get('/admin/students/stats', authMiddleware, async (req, res, next) => {
  try {
    const { from, to, subjectId } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = from;
    if (to)   dateFilter.$lte = to;

    const attendanceQuery = {};
    if (from || to) attendanceQuery.date = dateFilter;
    if (subjectId)  attendanceQuery.subject = subjectId;

    // Get distinct dates that have any attendance records in range
    const allRecords = await Attendance.find(attendanceQuery).lean();
    const distinctDates = [...new Set(allRecords.map(r => r.date))];
    const totalDays = distinctDates.length;

    const students = await Student.find({ isEnrolled: true }).lean();

    const stats = await Promise.all(students.map(async (s) => {
      const presentCount = allRecords.filter(r => r.student.toString() === s._id.toString()).length;
      return {
        id:          s._id,
        name:        s.name,
        rollNumber:  s.rollNumber,
        email:       s.email,
        presentDays: presentCount,
        totalDays,
        percentage:  totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0
      };
    }));

    res.json({ success: true, totalDays, stats });
  } catch (error) { next(error); }
});

// GET /api/admin/attendance/today
router.get('/admin/attendance/today', authMiddleware, async (req, res, next) => {
  try {
    const data = await getAttendanceForDate(getLocalDateString());
    res.json(data);
  } catch (error) { next(error); }
});

// GET /api/admin/attendance/fieldstats?date=YYYY-MM-DD — field-wise breakdown for a date
router.get('/admin/attendance/fieldstats', authMiddleware, async (req, res, next) => {
  try {
    const date = req.query.date || getLocalDateString();

    // Get all present students for this date
    const presentRecords = await Attendance.find({ date }).populate('student').lean();
    const presentStudentIds = new Set(
      presentRecords.filter(r => r.student).map(r => r.student._id.toString())
    );

    // Get all enrolled students
    const allStudents = await Student.find({ isEnrolled: true }).lean();

    // Group by field
    const fieldMap = {};
    for (const s of allStudents) {
      const f = s.field?.trim() || 'General';
      if (!fieldMap[f]) fieldMap[f] = { field: f, total: 0, present: 0, absent: 0 };
      fieldMap[f].total++;
      if (presentStudentIds.has(s._id.toString())) {
        fieldMap[f].present++;
      } else {
        fieldMap[f].absent++;
      }
    }

    const stats = Object.values(fieldMap).map(f => ({
      ...f,
      percentage: f.total > 0 ? Math.round((f.present / f.total) * 100) : 0
    }));

    res.json({ success: true, date, stats });
  } catch (error) { next(error); }
});


// GET /api/admin/attendance/report  — #7 date-range aggregated report
router.get('/admin/attendance/report', authMiddleware, async (req, res, next) => {
  try {
    const { from, to, subjectId } = req.query;
    if (!from || !to)
      return res.status(400).json({ success: false, message: 'from and to query params required (YYYY-MM-DD).' });

    const query = { date: { $gte: from, $lte: to } };
    if (subjectId) query.subject = subjectId;

    const allRecords = await Attendance.find(query).lean();
    const distinctDates = [...new Set(allRecords.map(r => r.date))];
    const totalDays = distinctDates.length;

    const students = await Student.find({ isEnrolled: true }).lean();

    const report = students.map((s) => {
      const presentCount = allRecords.filter(r => r.student.toString() === s._id.toString()).length;
      return {
        id:          s._id,
        name:        s.name,
        rollNumber:  s.rollNumber,
        email:       s.email,
        presentDays: presentCount,
        absentDays:  totalDays - presentCount,
        percentage:  totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0
      };
    });

    res.json({ success: true, from, to, totalDays, report });
  } catch (error) { next(error); }
});

// GET /api/admin/attendance/export  — #6 CSV export
router.get('/admin/attendance/export', authMiddleware, async (req, res, next) => {
  try {
    const { date, from, to } = req.query;

    let records;
    if (date) {
      // Single-day export
      const data = await getAttendanceForDate(date);
      const rows = [
        ...data.present.map(s => ({ ...s, status: 'Present' })),
        ...data.absent.map(s => ({ ...s, status: 'Absent', timeMarked: '' }))
      ];
      records = rows;
    } else if (from && to) {
      // Date-range export
      const query = { date: { $gte: from, $lte: to } };
      if (subjectId) query.subject = subjectId;
      const attendance = await Attendance.find(query).populate('student').lean();
      records = attendance.map(r => ({
        date:        r.date,
        name:        r.student?.name,
        rollNumber:  r.student?.rollNumber,
        email:       r.student?.email,
        status:      'Present',
        timeMarked:  r.timeMarked ? new Date(r.timeMarked).toLocaleTimeString() : '',
        isManual:    r.isManual ? 'Yes' : 'No'
      }));
    } else {
      return res.status(400).json({ success: false, message: 'Provide date or from+to params.' });
    }

    // Build CSV
    const headers = Object.keys(records[0] || { name: '', rollNumber: '', status: '', timeMarked: '' }).join(',');
    const csvRows = records.map(r =>
      Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...csvRows].join('\r\n');

    const filename = date ? `attendance_${date}.csv` : `attendance_${from}_to_${to}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) { next(error); }
});

// GET /api/admin/attendance/:date
router.get('/admin/attendance/:date', authMiddleware, async (req, res, next) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
    const data = await getAttendanceForDate(date);
    res.json(data);
  } catch (error) { next(error); }
});

// POST /api/admin/attendance/manual
router.post('/admin/attendance/manual', authMiddleware, async (req, res, next) => {
  try {
    const { studentId, date } = req.body;
    if (!studentId || !date)
      return res.status(400).json({ success: false, message: 'studentId and date required.' });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const record = await Attendance.create({
      student:  studentId,
      date,
      status:   'present',
      isManual: true
    });

    res.status(201).json({ success: true, record });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ success: false, message: 'Attendance already marked for this student on this date.' });
    next(error);
  }
});

// DELETE /api/admin/attendance/manual
router.delete('/admin/attendance/manual', authMiddleware, async (req, res, next) => {
  try {
    const { studentId, date } = req.body;
    if (!studentId || !date)
      return res.status(400).json({ success: false, message: 'studentId and date required.' });

    const query = { student: studentId, date };

    const result = await Attendance.findOneAndDelete(query);
    if (!result) return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    res.json({ success: true, message: 'Attendance record removed.' });
  } catch (error) { next(error); }
});

// ==========================================
// ANTI-CHEAT SETTINGS ROUTES
// ==========================================

// GET /api/admin/settings
router.get('/admin/settings', authMiddleware, async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ singleton: 'default' });
    if (!settings) {
      settings = await Settings.create({
        singleton: 'default',
        instituteLat: 31.5204,
        instituteLng: 74.3587,
        allowedRadiusMeters: 100
      });
    } else if (settings.instituteLat === 0 && settings.instituteLng === 0) {
      // If it exists but has raw 0 values, update to realistic Lahore coordinates
      settings.instituteLat = 31.5204;
      settings.instituteLng = 74.3587;
      await settings.save();
    }
    res.json({ success: true, settings });
  } catch (error) { next(error); }
});

// PUT /api/admin/settings
router.put('/admin/settings', authMiddleware, async (req, res, next) => {
  try {
    const updated = await Settings.findOneAndUpdate(
      { singleton: 'default' },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json({ success: true, settings: updated });
  } catch (error) { next(error); }
});

// ==========================================
// ANALYTICS & WARNINGS ROUTES
// ==========================================

// GET /api/admin/analytics
router.get('/admin/analytics', authMiddleware, async (req, res, next) => {
  try {
    // 1. Last 7 Days Trend
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const presentCount = await Attendance.countDocuments({ date: dateStr, status: 'present' });
      trend.push({
        date: dateStr,
        present: presentCount
      });
    }

    // 2. Attendance Distribution
    const students = await Student.find({ isEnrolled: true });
    const studentCount = students.length;
    let safe = 0;
    let warning = 0;
    let critical = 0;

    if (studentCount > 0) {
      const allAttendance = await Attendance.find({ status: 'present' });
      const presentMap = {};
      allAttendance.forEach(a => {
        const sId = a.student.toString();
        presentMap[sId] = (presentMap[sId] || 0) + 1;
      });

      // Find total unique days attendance was taken to calculate total possible days
      const uniqueDates = await Attendance.distinct('date');
      const totalDays = uniqueDates.length || 1;

      students.forEach(s => {
        const p = presentMap[s._id.toString()] || 0;
        const percentage = Math.round((p / totalDays) * 100);
        
        if (percentage >= 75) safe++;
        else if (percentage >= 50) warning++;
        else critical++;
      });
    }

    const settings = await Settings.findOne({ singleton: 'default' });
    const totalRecords = await Attendance.countDocuments({ status: 'present' });

    res.json({
      success: true,
      stats: {
        totalStudents: studentCount,
        totalRecords,
        enableLocationCheck: settings?.enableLocationCheck || false,
        enableIPCheck: settings?.enableIPCheck || false,
        allowedRadiusMeters: settings?.allowedRadiusMeters || 100
      },
      trend,
      distribution: [
        { name: 'Safe (≥75%)', value: safe, fill: '#10b981' }, // emerald-500
        { name: 'Warning (50-74%)', value: warning, fill: '#f59e0b' }, // amber-500
        { name: 'Critical (<50%)', value: critical, fill: '#f43f5e' } // rose-500
      ]
    });
  } catch (error) { next(error); }
});

// POST /api/admin/warnings/send
router.post('/admin/warnings/send', authMiddleware, async (req, res, next) => {
  try {
    const students = await Student.find({ isEnrolled: true, email: { $exists: true, $ne: '' } });
    const allAttendance = await Attendance.find({ status: 'present' });
    const presentMap = {};
    allAttendance.forEach(a => {
      const sId = a.student.toString();
      presentMap[sId] = (presentMap[sId] || 0) + 1;
    });

    const uniqueDates = await Attendance.distinct('date');
    const totalDays = uniqueDates.length || 1;

    let emailsSent = 0;
    
    // Process asynchronously so we don't block the request for too long
    // If it's a huge list, we might want a background worker, but for this scale it's fine
    for (const student of students) {
      const p = presentMap[student._id.toString()] || 0;
      const percentage = Math.round((p / totalDays) * 100);
      
      if (percentage < 75) {
        await sendWarningEmail(student, percentage);
        emailsSent++;
      }
    }

    res.json({ success: true, message: `Successfully queued ${emailsSent} warning emails.` });
  } catch (error) { next(error); }
});

// GET /api/admin/leave-requests
router.get('/admin/leave-requests', authMiddleware, async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await LeaveRequest.find(filter)
      .populate('student', 'name rollNumber field email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, requests });
  } catch (error) { next(error); }
});

// PATCH /api/admin/leave-requests/:id
router.patch('/admin/leave-requests/:id', authMiddleware, async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const leaveReq = await LeaveRequest.findById(req.params.id);
    if (!leaveReq) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    leaveReq.status = status;
    if (adminNote !== undefined) leaveReq.adminNote = adminNote;
    await leaveReq.save();

    res.json({ success: true, message: `Leave request ${status}.`, leaveReq });
  } catch (error) { next(error); }
});

export default router;

