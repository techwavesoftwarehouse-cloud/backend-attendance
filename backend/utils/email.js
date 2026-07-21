// #12 — Email notification utility (supports Brevo API, Resend API over HTTPS or SMTP via Nodemailer)
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const isSMTPConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if (BREVO_API_KEY) {
  console.log('✉️  Email service configured via Brevo API (HTTPS)');
} else if (RESEND_API_KEY) {
  console.log('✉️  Email service configured via Resend API (HTTPS)');
} else if (isSMTPConfigured) {
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log('✉️  Email service configured via SMTP:', process.env.SMTP_HOST);
} else {
  console.log('ℹ️  Email service not configured — email notifications disabled. Add BREVO_API_KEY, RESEND_API_KEY or SMTP variables to enable.');
}

/**
 * Common helper to send email via either Brevo API, Resend API (HTTP) or Nodemailer (SMTP)
 */
const sendEmail = async ({ to, subject, html }) => {
  const fromName = process.env.EMAIL_FROM_NAME || "TechWave Software House";
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || "techwavesoftwarehouse@gmail.com";

  if (BREVO_API_KEY) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: to }],
          subject: subject,
          htmlContent: html
        })
      });
      
      // Brevo might return empty response for 201 Created
      let data = {};
      const text = await response.text();
      if (text) {
          data = JSON.parse(text);
      }
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      return data;
    } catch (err) {
      throw new Error(`Brevo API failed: ${err.message}`);
    }
  } else if (RESEND_API_KEY) {
    const fromHeader = `"${fromName}" <${fromEmail}>`;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: fromHeader,
          to: [to],
          subject: subject,
          html: html
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      return data;
    } catch (err) {
      throw new Error(`Resend API failed: ${err.message}`);
    }
  } else if (transporter) {
    const fromHeader = `"${fromName}" <${fromEmail}>`;
    return await transporter.sendMail({
      from: fromHeader,
      to,
      subject,
      html
    });
  } else {
    // Email not configured
    return null;
  }
};

/**
 * Send a welcome / confirmation email when admin adds a new student
 * @param {Object} student  - saved student document
 * @param {string} enrollLink - one-time enrollment URL
 */
export const sendWelcomeEmail = async (student, enrollLink) => {
  if (!student.email) return;

  try {
    const res = await sendEmail({
      to:   student.email,
      subject: `🎉 Welcome to TechWave Software House — ${student.name}!`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0f172a;color:#f1f5f9;border-radius:18px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.5)">
          <!-- Header gradient bar -->
          <div style="background:linear-gradient(90deg,#0d9488,#3b82f6,#8b5cf6);height:6px"></div>

          <!-- Logo / Title area -->
          <div style="padding:36px 36px 0;text-align:center">
            <div style="display:inline-block;background:linear-gradient(135deg,#0d9488,#3b82f6);border-radius:14px;padding:12px 20px;margin-bottom:20px">
              <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:1px">TechWave</span>
            </div>
            <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#f1f5f9">Welcome Aboard! 🎉</h1>
            <p style="margin:0;color:#94a3b8;font-size:14px">You've been registered in the TechWave Attendance System</p>
          </div>

          <!-- Body -->
          <div style="padding:28px 36px">
            <p style="font-size:15px;color:#cbd5e1;margin:0 0 20px">
              Dear <strong style="color:#f1f5f9">${student.name}</strong>, your account has been successfully created by the administration. Here are your details:
            </p>

            <!-- Info table -->
            <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px">
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:10px 0;color:#64748b;font-size:13px;width:40%">Student Name</td>
                  <td style="padding:10px 0;font-weight:600;font-size:14px">${student.name}</td>
                </tr>
                <tr style="border-top:1px solid #334155">
                  <td style="padding:10px 0;color:#64748b;font-size:13px">Roll Number</td>
                  <td style="padding:10px 0;font-family:monospace;font-size:15px;color:#34d399">${student.rollNumber}</td>
                </tr>
                ${student.field ? `
                <tr style="border-top:1px solid #334155">
                  <td style="padding:10px 0;color:#64748b;font-size:13px">Class / Field</td>
                  <td style="padding:10px 0;font-weight:600">${student.field}</td>
                </tr>` : ''}
              </table>
            </div>

            <!-- Enroll CTA -->
            <p style="font-size:14px;color:#94a3b8;margin:0 0 16px">
              To activate your account and set up your biometric (fingerprint/face), click the button below on your mobile phone:
            </p>
            <div style="text-align:center;margin-bottom:24px">
              <a href="${enrollLink}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#3b82f6);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;letter-spacing:0.5px">
                📱 Setup My Account
              </a>
            </div>
            <p style="font-size:12px;color:#475569;margin:0 0 8px;text-align:center">
              This link is <strong>one-time use</strong> and will expire after enrollment.
            </p>
          </div>

          <!-- Footer -->
          <div style="padding:20px 36px;border-top:1px solid #1e293b;text-align:center">
            <p style="margin:0;font-size:12px;color:#334155">TechWave Software House Attendance System &nbsp;|&nbsp; Automated Message</p>
          </div>
        </div>
      `
    });
    if (res) {
      console.log(`✉️  Welcome email sent to ${student.email}`);
    }
  } catch (err) {
    console.error('Welcome email send failed (non-fatal):', err.message);
  }
};

/**
 * Send an automated email when attendance is marked
 * @param {Object} student - student document
 * @param {string} date - YYYY-MM-DD
 */
export const sendAttendanceConfirmation = async (student, date) => {
  if (!student.email) return;

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  try {
    const res = await sendEmail({
      to:   student.email,
      subject: `✅ Attendance Marked — ${displayDate}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0f172a;color:#f1f5f9;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(90deg,#0d9488,#3b82f6);height:6px"></div>
          <div style="padding:32px">
            <h2 style="margin:0 0 8px;font-size:20px">Attendance Confirmed ✅</h2>
            <p style="color:#94a3b8;margin:0 0 24px">Your attendance has been recorded.</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px">Student</td><td style="padding:8px 0;font-weight:600">${student.name}</td></tr>
              <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px">Roll No.</td><td style="padding:8px 0;font-family:monospace">${student.rollNumber}</td></tr>
              <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px">Date</td><td style="padding:8px 0">${displayDate}</td></tr>
            </table>
            <p style="margin:24px 0 0;color:#475569;font-size:12px">TechWave Software House Attendance System</p>
          </div>
        </div>
      `
    });
    if (res) {
      console.log(`✉️  Attendance email sent to ${student.email}`);
    }
  } catch (err) {
    console.error('Email send failed (non-fatal):', err.message);
  }
};

/**
 * Send an automated warning email for low attendance
 */
export const sendWarningEmail = async (student, percentage) => {
  if (!student.email) return;

  try {
    const res = await sendEmail({
      to: student.email,
      subject: '⚠️ Urgent: Low Attendance Warning',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #f43f5e; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Attendance Warning</h2>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #334155;">Dear <strong>${student.name}</strong>,</p>
            <p style="font-size: 16px; color: #334155;">
              This is an automated notice regarding your attendance at TechWave Software House. 
              Your current attendance has fallen to <strong>${percentage}%</strong>.
            </p>
            <p style="font-size: 16px; color: #334155;">
              Maintaining an attendance of 75% or higher is mandatory. Please ensure you attend upcoming classes regularly.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 14px; color: #64748b; margin: 0;">
              If you believe this is an error, please contact the administration immediately.
            </p>
          </div>
        </div>
      `
    });
    if (res) {
      console.log(`✉️  Warning email sent to ${student.email}`);
    }
  } catch (error) {
    console.error('Failed to send warning email:', error.message);
  }
};

/**
 * Send an OTP code for student login
 */
export const sendOTPEmail = async (student, otpCode) => {
  if (!student.email) return;

  try {
    const res = await sendEmail({
      to: student.email,
      subject: `🔑 Your TechWave Login OTP Code: ${otpCode}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0f172a;color:#f1f5f9;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(90deg,#0d9488,#3b82f6);height:6px"></div>
          <div style="padding:32px;text-align:center">
            <h2 style="margin:0 0 8px;font-size:22px;color:#fff">Login Verification Code</h2>
            <p style="color:#94a3b8;margin:0 0 24px;font-size:14px">Hello <strong>${student.name}</strong>, use the verification code below to log in to your Student Portal:</p>
            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;margin:0 auto 24px;display:inline-block;letter-spacing:6px;font-size:28px;font-weight:bold;color:#38bdf8">
              ${otpCode}
            </div>
            <p style="color:#64748b;font-size:12px;margin:0">This code is valid for 10 minutes. Do not share it with anyone.</p>
          </div>
        </div>
      `
    });
    if (res) {
      console.log(`✉️ OTP email sent to ${student.email}`);
    }
  } catch (error) {
    console.error('Failed to send OTP email:', error.message);
  }
};
