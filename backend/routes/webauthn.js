import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import Settings from '../models/Settings.js';
import { verifyToken } from '../utils/totp.js';
import { getLocalDateString } from '../utils/dateUtils.js';
import { sendAttendanceConfirmation } from '../utils/email.js';
import { calculateDistanceMeters } from '../utils/geoUtils.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const RP_ID   = process.env.RP_ID   || 'localhost';
const RP_NAME = process.env.RP_NAME || 'Institute Attendance System';
const ORIGIN  = process.env.ORIGIN  || 'http://localhost:5173';

// #4 — Rate limiter for registration OPTIONS (prevent spamming challenge generation)
const optionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for verify routes
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// #3 — Challenge expiry: 5 minutes
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ENROLLMENT FLOW (One-time registration)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// POST /api/webauthn/register/options
router.post('/register/options', optionsLimiter, async (req, res, next) => {   // #4 rate limited
  try {
    const { studentId, token } = req.body;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId is required.' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // #5 — Validate one-time enrollment token
    if (!token) {
      return res.status(400).json({ success: false, message: 'Enrollment token is required. Please use the link provided by your admin.' });
    }
    if (student.enrollmentToken !== token) {
      return res.status(403).json({ success: false, message: 'Invalid enrollment token. Please use the correct enrollment link.' });
    }
    if (student.enrollmentTokenUsed) {
      return res.status(403).json({ success: false, message: 'This enrollment link has already been used. Contact your admin for a new link.' });
    }

    // Convert mongoose ID to Uint8Array as required by simplewebauthn v13
    const userIDUint8 = new TextEncoder().encode(student._id.toString());

    const options = await generateRegistrationOptions({
      rpName:   RP_NAME,
      rpID:     RP_ID,
      userID:   userIDUint8,
      userName: student.rollNumber,
      userDisplayName: student.name,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey:            'preferred',
        userVerification:       'preferred',
        authenticatorAttachment: 'platform'
      }
    });

    // #3 — Save challenge with expiry
    student.currentChallenge = options.challenge;
    student.challengeExpiry  = new Date(Date.now() + CHALLENGE_TTL_MS);
    await student.save();

    res.json(options);
  } catch (error) {
    next(error);
  }
});

// POST /api/webauthn/register/verify
router.post('/register/verify', verifyLimiter, async (req, res, next) => {
  try {
    const { studentId, credential, registrationResponse } = req.body;
    const bodyResponse = credential || registrationResponse;

    if (!studentId || !bodyResponse) {
      return res.status(400).json({ success: false, message: 'studentId and credential response are required.' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (!student.currentChallenge) {
      return res.status(400).json({ success: false, message: 'Registration challenge not found. Please restart registration.' });
    }

    // #3 — Reject if challenge expired
    if (student.challengeExpiry && new Date() > student.challengeExpiry) {
      student.currentChallenge = undefined;
      student.challengeExpiry  = undefined;
      await student.save();
      return res.status(400).json({ success: false, message: 'Registration challenge has expired. Please start over.' });
    }

    const expectedOrigin = req.headers.origin || ORIGIN;

    const verification = await verifyRegistrationResponse({
      response:        bodyResponse,
      expectedChallenge: student.currentChallenge,
      expectedOrigin:  expectedOrigin,
      expectedRPID:    RP_ID
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      // v13 API: credential data is nested under registrationInfo.credential
      const { credential: cred, credentialDeviceType, credentialBackedUp } = registrationInfo;
      const publicKeyBase64 = Buffer.from(cred.publicKey).toString('base64');

      student.currentChallenge    = undefined;
      student.challengeExpiry     = undefined;
      student.isEnrolled          = true;
      student.enrollmentTokenUsed = true;   // #5 — mark token used

      student.webauthnCredentials.push({
        credentialID: cred.id,
        publicKey:    publicKeyBase64,
        counter:      cred.counter,
        deviceType:   credentialDeviceType,
        backedUp:     credentialBackedUp,
        transports:   cred.transports || bodyResponse.response.transports || []
      });

      await student.save();
      res.json({ verified: true });
    } else {
      res.status(400).json({ success: false, message: 'Registration verification failed.' });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ATTENDANCE FLOW (Verification)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// POST /api/webauthn/authenticate/options
router.post('/authenticate/options', async (req, res, next) => {
  try {
    const { rollNumber, qrToken } = req.body;
    if (!rollNumber) {
      return res.status(400).json({ success: false, message: 'rollNumber is required.' });
    }

    const student = await Student.findOne({ rollNumber: rollNumber.trim() });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (!student.isEnrolled || student.webauthnCredentials.length === 0) {
      return res.json({ isEnrolled: false, studentId: student._id, name: student.name });
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: student.webauthnCredentials.map((cred) => ({
        id:         cred.credentialID,
        type:       'public-key',
        transports: cred.transports
      })),
      userVerification: 'preferred'
    });

    // #3 — Save challenge with expiry
    student.currentChallenge = options.challenge;
    student.challengeExpiry  = new Date(Date.now() + CHALLENGE_TTL_MS);
    await student.save();

    res.json(options);
  } catch (error) {
    next(error);
  }
});

// POST /api/webauthn/authenticate/verify
router.post('/authenticate/verify', verifyLimiter, async (req, res, next) => {
  try {
    const { rollNumber, credential, qrToken, lat, lng } = req.body;

    if (!rollNumber || !credential) {
      return res.status(400).json({ success: false, message: 'rollNumber and credential are required.' });
    }

    // ── ANTI-CHEAT VALIDATION ──
    const settings = await Settings.findOne({ singleton: 'default' });
    if (settings) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
      let ipPassed = false;
      
      // 1. IP Check (if enabled)
      if (settings.enableIPCheck && settings.allowedIPs) {
        const allowedList = settings.allowedIPs.split(',').map(s => s.trim());
        if (allowedList.some(ip => clientIp.includes(ip))) {
          ipPassed = true;
        }
      }

      // 2. Geolocation Check (if IP didn't pass, or IP check is disabled but Location check is enabled)
      if (settings.enableLocationCheck && !ipPassed) {
        if (!lat || !lng) {
          return res.status(403).json({ success: false, message: 'Location required. Please allow GPS access or connect to Institute Wi-Fi.' });
        }
        
        const distance = calculateDistanceMeters(
          settings.instituteLat, settings.instituteLng,
          parseFloat(lat), parseFloat(lng)
        );

        if (distance > settings.allowedRadiusMeters) {
          return res.status(403).json({ success: false, message: `You are too far from the Institute (${Math.round(distance)}m). You must be within ${settings.allowedRadiusMeters}m.` });
        }
      }
    }
    // ───────────────────────────

    // 1. Verify QR token (TOTP) — only if a token was provided (live screen mode)
    // If no token, this is a printed QR — security relies on fingerprint + anti-cheat
    if (qrToken) {
      const isTokenValid = verifyToken(qrToken);
      if (!isTokenValid) {
        return res.status(400).json({ success: false, message: 'This QR code has expired. Please re-scan the screen.' });
      }
    }

    // 2. Fetch Student
    const student = await Student.findOne({ rollNumber: rollNumber.trim() });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (!student.isEnrolled || student.webauthnCredentials.length === 0) {
      return res.status(400).json({ success: false, message: 'Student is not enrolled yet.' });
    }

    if (!student.currentChallenge) {
      return res.status(400).json({ success: false, message: 'Authentication challenge not found. Please retry.' });
    }

    // #3 — Reject expired challenge
    if (student.challengeExpiry && new Date() > student.challengeExpiry) {
      student.currentChallenge = undefined;
      student.challengeExpiry  = undefined;
      await student.save();
      return res.status(400).json({ success: false, message: 'Authentication challenge expired. Please retry.' });
    }

    // 3. Find matched credential
    const matchCred = student.webauthnCredentials.find(
      (c) => c.credentialID === credential.id
    );
    if (!matchCred) {
      return res.status(400).json({ success: false, message: 'This biometric key is not registered for this student.' });
    }

    const expectedOrigin = req.headers.origin || ORIGIN;

    // 4. Verify signature — v13 API uses `credential` param (not `authenticator`)
    const verification = await verifyAuthenticationResponse({
      response:          credential,
      expectedChallenge: student.currentChallenge,
      expectedOrigin:    expectedOrigin,
      expectedRPID:      RP_ID,
      credential: {
        id:         matchCred.credentialID,
        publicKey:  Buffer.from(matchCred.publicKey, 'base64'),
        counter:    matchCred.counter,
        transports: matchCred.transports
      }
    });

    const { verified, authenticationInfo } = verification;

    if (verified && authenticationInfo) {
      const todayStr = getLocalDateString();

      // Check for duplicate attendance (same student, date)
      const existingAttendance = await Attendance.findOne({
        student: student._id,
        date:    todayStr
      });

      if (existingAttendance) {
        student.currentChallenge = undefined;
        student.challengeExpiry  = undefined;
        await student.save();
        return res.status(400).json({ success: false, message: 'Attendance already marked for today.' });
      }

      // 5. Create attendance record
      await Attendance.create({
        student: student._id,
        date:    todayStr,
        status:  'present'
      });

      // Update counter + clear challenge (replay protection)
      matchCred.counter        = authenticationInfo.newCounter;
      student.currentChallenge = undefined;
      student.challengeExpiry  = undefined;
      await student.save();

      // #12 — Send email notification (non-blocking, errors are swallowed)
      sendAttendanceConfirmation(student, todayStr); // fire-and-forget

      res.json({ verified: true, name: student.name });
    } else {
      res.status(400).json({ success: false, message: 'Fingerprint verification failed.' });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
