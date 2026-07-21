// #1 — Read JWT from httpOnly cookie (set by login endpoint)
// Falls back to Authorization header for backward compatibility during transition.
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforadminauth123!';

export const authMiddleware = (req, res, next) => {
  // Primary: read from httpOnly cookie
  let token = req.cookies?.adminToken;

  // Fallback: Authorization header (for any tools/scripts using Bearer tokens)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
};

export const studentAuthMiddleware = (req, res, next) => {
  let token = req.cookies?.studentToken;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.studentId) {
      return res.status(403).json({ success: false, message: 'Invalid token structure.' });
    }
    req.studentId = decoded.studentId;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
};

