import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import { studentAuthMiddleware } from '../middleware/auth.js';
import { sendOTPEmail } from '../utils/email.js';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforadminauth123!';

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

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    student.otpCode = otpCode;
    student.otpExpiry = otpExpiry;
    await student.save();

    // Send email asynchronously
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
 * Step 2: Verify OTP code and issue JWT cookie.
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

    // Clear OTP after successful use
    student.otpCode = undefined;
    student.otpExpiry = undefined;
    await student.save();

    // Sign JWT
    const token = jwt.sign(
      { studentId: student._id, rollNumber: student.rollNumber, name: student.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('studentToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Logged in successfully.',
      student: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        field: student.field,
        email: student.email
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/student/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('studentToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/student/profile
 * Get student profile & attendance summary stats
 */
router.get('/profile', studentAuthMiddleware, async (req, res, next) => {
  try {
    const student = await Student.findById(req.studentId).select('-otpCode -otpExpiry -webauthnCredentials');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    // Calculate attendance percentage
    const totalRecords = await Attendance.countDocuments({ student: student._id });
    const presentRecords = await Attendance.countDocuments({ student: student._id, status: 'present' });
    const percentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 100;

    res.json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        field: student.field,
        email: student.email,
        isEnrolled: student.isEnrolled,
        totalRecords,
        presentRecords,
        absentRecords: totalRecords - presentRecords,
        percentage
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/student/attendance
 * Get all attendance history records for the student
 */
router.get('/attendance', studentAuthMiddleware, async (req, res, next) => {
  try {
    const records = await Attendance.find({ student: req.studentId })
      .sort({ date: -1 })
      .lean();

    res.json({
      success: true,
      records
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/student/leave-requests
 * Get leave requests for the logged-in student
 */
router.get('/leave-requests', studentAuthMiddleware, async (req, res, next) => {
  try {
    const requests = await LeaveRequest.find({ student: req.studentId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/student/leave-requests
 * Submit a new leave request
 */
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

export default router;
