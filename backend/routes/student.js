import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Complaint from '../models/Complaint.js';
import { studentAuthMiddleware } from '../middleware/auth.js';
import { sendOTPEmail } from '../utils/email.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AVATAR_DIR = path.join(__dirname, '..', 'uploads', 'avatars');

if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforadminauth123!';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const VALID_THEMES = ['dark', 'light', 'ocean', 'sunset'];

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.studentId}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed.'));
  }
});

const buildProfilePayload = async (student) => {
  const totalRecords = await Attendance.countDocuments({ student: student._id });
  const presentRecords = await Attendance.countDocuments({ student: student._id, status: 'present' });
  const percentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 100;

  const profilePictureUrl = student.profilePicture
    ? `${student.profilePicture}?t=${Date.now()}`
    : '';

  return {
    id: student._id,
    name: student.name,
    username: student.username || '',
    rollNumber: student.rollNumber,
    field: student.field,
    email: student.email,
    profilePicture: profilePictureUrl,
    portalTheme: student.portalTheme || 'dark',
    accountSetupDone: student.accountSetupDone || false,
    portalSetupComplete: student.portalSetupComplete || false,
    isEnrolled: student.isEnrolled,
    createdAt: student.createdAt,
    totalRecords,
    presentRecords,
    absentRecords: totalRecords - presentRecords,
    percentage
  };
};

const validateUsername = (username) => {
  if (!username || !USERNAME_REGEX.test(username.trim())) {
    return 'Username must be 3–20 characters (letters, numbers, underscore only).';
  }
  return null;
};

/**
 * POST /api/student/login
 * Step 1: Verify Roll Number & Email, generate 6-digit OTP and send via email.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { rollNumber, email } = req.body;
    if (!rollNumber || !email) {
      return res.status(400).json({ success: false, message: 'Roll number and Email are required.' });
    }

    const student = await Student.findOne({
      rollNumber: rollNumber.trim(),
      email: email.trim().toLowerCase()
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'No student found matching this Roll Number and Email address.'
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    student.otpCode = otpCode;
    student.otpExpiry = otpExpiry;
    await student.save();

    sendOTPEmail(student, otpCode).catch((err) => console.error('OTP Send error:', err));

    res.json({
      success: true,
      message: 'OTP verification code sent to your email address.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/student/verify-otp
 */
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { rollNumber, otpCode } = req.body;
    if (!rollNumber || !otpCode) {
      return res.status(400).json({ success: false, message: 'Roll number and OTP code are required.' });
    }

    const student = await Student.findOne({ rollNumber: rollNumber.trim() });
    if (!student || !student.otpCode || !student.otpExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please request a new one.' });
    }

    if (student.otpCode !== otpCode.trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP code.' });
    }

    if (new Date() > student.otpExpiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    student.otpCode = undefined;
    student.otpExpiry = undefined;
    await student.save();

    const token = jwt.sign(
      { studentId: student._id, rollNumber: student.rollNumber, name: student.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('studentToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Logged in successfully.',
      student: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        field: student.field,
        email: student.email,
        portalSetupComplete: student.portalSetupComplete || false,
        accountSetupDone: student.accountSetupDone || false
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('studentToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/student/check-username?username=xxx
 */
router.get('/check-username', studentAuthMiddleware, async (req, res, next) => {
  try {
    const { username } = req.query;
    const err = validateUsername(username);
    if (err) return res.json({ success: true, available: false, message: err });

    const taken = await Student.findOne({
      username: username.trim().toLowerCase(),
      _id: { $ne: req.studentId }
    });

    res.json({
      success: true,
      available: !taken,
      message: taken ? 'This username is already taken.' : 'Username is available.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/student/profile
 */
router.get('/profile', studentAuthMiddleware, async (req, res, next) => {
  try {
    const student = await Student.findById(req.studentId).select('-otpCode -otpExpiry -webauthnCredentials');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    res.json({
      success: true,
      student: await buildProfilePayload(student)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/student/profile/account — Step 1: username + theme
 */
router.patch('/profile/account', studentAuthMiddleware, async (req, res, next) => {
  try {
    const { username, portalTheme } = req.body;
    const err = validateUsername(username);
    if (err) return res.status(400).json({ success: false, message: err });

    if (portalTheme && !VALID_THEMES.includes(portalTheme)) {
      return res.status(400).json({ success: false, message: 'Invalid theme selected.' });
    }

    const taken = await Student.findOne({
      username: username.trim().toLowerCase(),
      _id: { $ne: req.studentId }
    });
    if (taken) {
      return res.status(400).json({ success: false, message: 'This username is already taken. Please choose another.' });
    }

    const student = await Student.findById(req.studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    student.username = username.trim().toLowerCase();
    if (portalTheme) student.portalTheme = portalTheme;
    student.accountSetupDone = true;
    await student.save();

    res.json({
      success: true,
      message: 'Account settings saved.',
      student: await buildProfilePayload(student)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This username is already taken.' });
    }
    next(error);
  }
});

/**
 * POST /api/student/profile/picture — Step 2: upload profile picture
 */
router.post('/profile/picture', studentAuthMiddleware, (req, res, next) => {
  avatarUpload.single('avatar')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    try {
      const student = await Student.findById(req.studentId);
      if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

      student.profilePicture = `/uploads/avatars/${req.file.filename}`;
      await student.save();

      res.json({
        success: true,
        message: 'Profile picture uploaded.',
        profilePicture: student.profilePicture,
        student: await buildProfilePayload(student)
      });
    } catch (error) {
      next(error);
    }
  });
});

/**
 * PATCH /api/student/profile/complete — Finish onboarding (requires picture)
 */
router.patch('/profile/complete', studentAuthMiddleware, async (req, res, next) => {
  try {
    const student = await Student.findById(req.studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    if (!student.accountSetupDone) {
      return res.status(400).json({ success: false, message: 'Please complete account settings first.' });
    }
    if (!student.profilePicture) {
      return res.status(400).json({ success: false, message: 'Please upload a profile picture first.' });
    }

    student.portalSetupComplete = true;
    await student.save();

    res.json({
      success: true,
      message: 'Profile setup complete! Welcome to your portal.',
      student: await buildProfilePayload(student)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/student/profile/settings — Update theme/username later
 */
router.patch('/profile/settings', studentAuthMiddleware, async (req, res, next) => {
  try {
    const { username, portalTheme } = req.body;
    const student = await Student.findById(req.studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    if (username !== undefined) {
      const err = validateUsername(username);
      if (err) return res.status(400).json({ success: false, message: err });
      const taken = await Student.findOne({
        username: username.trim().toLowerCase(),
        _id: { $ne: req.studentId }
      });
      if (taken) return res.status(400).json({ success: false, message: 'Username already taken.' });
      student.username = username.trim().toLowerCase();
    }

    if (portalTheme) {
      if (!VALID_THEMES.includes(portalTheme)) {
        return res.status(400).json({ success: false, message: 'Invalid theme.' });
      }
      student.portalTheme = portalTheme;
    }

    await student.save();
    res.json({
      success: true,
      message: 'Settings updated.',
      student: await buildProfilePayload(student)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Username already taken.' });
    }
    next(error);
  }
});

router.get('/attendance', studentAuthMiddleware, async (req, res, next) => {
  try {
    const records = await Attendance.find({ student: req.studentId })
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, records });
  } catch (error) {
    next(error);
  }
});

router.get('/analytics', studentAuthMiddleware, async (req, res, next) => {
  try {
    const records = await Attendance.find({ student: req.studentId })
      .sort({ date: -1 })
      .lean();

    const presentRecords = records.filter((r) => r.status === 'present');
    const totalRecords = records.length;
    const percentage = totalRecords > 0 ? Math.round((presentRecords.length / totalRecords) * 100) : 100;

    let streak = 0;
    for (const rec of records) {
      if (rec.status === 'present') streak += 1;
      else break;
    }

    const today = new Date();
    const last7 = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const rec = records.find((r) => r.date === dateStr);
      last7.push({
        date: dateStr,
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        status: rec?.status || 'none'
      });
    }

    const monthMap = {};
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = { month: d.toLocaleDateString('en-US', { month: 'short' }), present: 0, absent: 0 };
    }
    records.forEach((rec) => {
      const key = rec.date.slice(0, 7);
      if (monthMap[key]) {
        if (rec.status === 'present') monthMap[key].present += 1;
        else monthMap[key].absent += 1;
      }
    });

    res.json({
      success: true,
      analytics: {
        percentage,
        streak,
        totalRecords,
        presentRecords: presentRecords.length,
        absentRecords: totalRecords - presentRecords.length,
        isAtRisk: percentage < 75,
        last7Days: last7,
        monthlyTrend: Object.values(monthMap)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/leave-requests', studentAuthMiddleware, async (req, res, next) => {
  try {
    const requests = await LeaveRequest.find({ student: req.studentId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, requests });
  } catch (error) {
    next(error);
  }
});

router.post('/leave-requests', studentAuthMiddleware, async (req, res, next) => {
  try {
    const { date, reason } = req.body;
    if (!date || !reason) {
      return res.status(400).json({ success: false, message: 'Date and Reason are required.' });
    }

    const existing = await LeaveRequest.findOne({ student: req.studentId, date });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You have already submitted a leave request for ${date}.`
      });
    }

    const newRequest = await LeaveRequest.create({
      student: req.studentId,
      date,
      reason: reason.trim()
    });

    res.json({
      success: true,
      message: 'Leave request submitted successfully.',
      request: newRequest
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/student/complaints
 */
router.get('/complaints', studentAuthMiddleware, async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ student: req.studentId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, complaints });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/student/complaints
 */
router.post('/complaints', studentAuthMiddleware, async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'Subject and message are required.' });
    }

    const complaint = await Complaint.create({
      student: req.studentId,
      subject: subject.trim(),
      message: message.trim()
    });

    res.json({
      success: true,
      message: 'Complaint submitted to admin successfully.',
      complaint
    });
  } catch (error) {
    next(error);
  }
});

export default router;
