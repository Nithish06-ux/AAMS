import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'manual_review', 'teacher_confirmed'],
      required: true,
    },
    confidenceScore: {
      type: Number,
      default: 0.0,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

attendanceRecordSchema.index({ studentId: 1, markedAt: -1 });
attendanceRecordSchema.index({ sessionId: 1 });

const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);
export default AttendanceRecord;
