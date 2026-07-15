import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  date:      { type: String, required: true }, // YYYY-MM-DD
  timeMarked:{ type: Date,   default: Date.now },
  status:    { type: String, enum: ['present', 'absent'], default: 'absent' },

  // #9 — manual override flag
  isManual: { type: Boolean, default: false }
});

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
