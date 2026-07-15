import { authenticator } from 'otplib';
import dotenv from 'dotenv';

dotenv.config();

const TOTP_SECRET = process.env.TOTP_SECRET;

if (!TOTP_SECRET) {
  console.error('CRITICAL: TOTP_SECRET is not defined in environment variables.');
  process.exit(1);
}

// Configure authenticator options
authenticator.options = {
  step: 30,
  window: 1 // allows a window of 1 step before/after to account for minor time sync drift
};

/**
 * Generates the current TOTP token and calculates the remaining seconds until expiry.
 * @returns {Object} { token, expiresInSeconds }
 */
export const generateCurrentToken = () => {
  const token = authenticator.generate(TOTP_SECRET);
  
  // Calculate remaining seconds in current step (30 seconds)
  const epoch = Math.floor(Date.now() / 1000);
  const step = authenticator.options.step || 30;
  const timeUsed = epoch % step;
  const expiresInSeconds = step - timeUsed;
  
  return { token, expiresInSeconds };
};

/**
 * Verifies a TOTP token.
 * @param {string} token 
 * @returns {boolean}
 */
export const verifyToken = (token) => {
  if (!token) return false;
  try {
    return authenticator.check(token, TOTP_SECRET);
  } catch (error) {
    console.error('Error verifying TOTP token:', error);
    return false;
  }
};
