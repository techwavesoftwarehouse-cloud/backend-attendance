import mongoose from 'mongoose';

const credentialSchema = new mongoose.Schema({
  credentialID: { type: String, required: true },
  publicKey:    { type: String, required: true },   // base64
  counter:      { type: Number, required: true, default: 0 },
  deviceType:   { type: String, required: true },
  backedUp:     { type: Boolean, required: true, default: false },
  transports:   [String]
}, { _id: false });

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: {
    type: String, required: true, unique: true, index: true
  },
  field: { type: String, default: '' }, // Class/Department e.g. CS, IT, BBA
  email: { type: String },

  // ── WebAuthn ──
  webauthnCredentials: [credentialSchema],
  isEnrolled:       { type: Boolean, default: false },
  currentChallenge: { type: String },
  challengeExpiry:  { type: Date },   // #3 — auto-expire challenge after 5 min

  // ── Enrollment token (one-time link) ── #5
  enrollmentToken:     { type: String },
  enrollmentTokenUsed: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);
export default Student;
