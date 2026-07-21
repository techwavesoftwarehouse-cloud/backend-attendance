import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  date:      { type: String, required: true }, // YYYY-MM-DD
  reason:    { type: String, required: true },
  status:    { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// One leave request per student per day
leaveRequestSchema.index({ student: 1, date: 1 }, { unique: true });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export default LeaveRequest;
