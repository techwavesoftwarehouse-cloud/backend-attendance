import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import Admin from './models/Admin.js';
import adminRouter from './routes/admin.js';
import webauthnRouter from './routes/webauthn.js';
import qrRouter from './routes/qr.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1); // Trust Render proxy headers



// Seed default admin
const seedAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin', salt);
      await Admin.create({ username: 'admin', passwordHash });
      console.log('--------------------------------------------------');
      console.log('Seeded default admin  →  username: admin / password: admin');
      console.log('--------------------------------------------------');
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
};

const ALLOWED_ORIGINS = (process.env.ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

connectDB().then(() => { seedAdmin(); });

// ── Middleware ──
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, Postman, etc.)
    if (!origin) return callback(null, true);

    const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
                      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
                      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

    if (isAllowed) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true   // #1 — required for cookies
}));
app.use(express.json());
app.use(cookieParser());  // #1 — parse httpOnly cookies

// ── Routes ──
app.use('/api', adminRouter);
app.use('/api/webauthn', webauthnRouter);
app.use('/api/qr', qrRouter);

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
