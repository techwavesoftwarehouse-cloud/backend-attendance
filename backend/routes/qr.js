import express from 'express';
import QRCode from 'qrcode';
import { generateCurrentToken } from '../utils/totp.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

// GET /api/qr/current
router.get('/current', async (req, res, next) => {
  try {
    const { token, expiresInSeconds } = generateCurrentToken();

    // Build attendance URL
    let attendanceUrl = `${ORIGIN}/attendance?token=${token}`;

    const qrDataUrl = await QRCode.toDataURL(attendanceUrl, {
      errorCorrectionLevel: 'M',
      width: 400
    });

    res.json({ qrDataUrl, expiresInSeconds });
  } catch (error) {
    next(error);
  }
});

export default router;
