import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Only one settings document should exist
  singleton: { type: String, default: 'default', unique: true },
  
  instituteLat: { type: Number, default: 0 },
  instituteLng: { type: Number, default: 0 },
  allowedRadiusMeters: { type: Number, default: 100 },
  
  // Allowed IPs (comma-separated or single)
  allowedIPs: { type: String, default: '' },
  
  // Toggle switches
  enableLocationCheck: { type: Boolean, default: false },
  enableIPCheck: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
