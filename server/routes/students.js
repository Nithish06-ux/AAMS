import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import AttendanceRecord from '../models/AttendanceRecord.js';
import Session from '../models/Session.js';
import Dispute from '../models/Dispute.js';
import AuditLog from '../models/AuditLog.js';

const router = Router();

// ── GET /api/students/:id/attendance ───────────────────────
// View-only attendance dashboard for students (role-checked: students can only access their own records)
router.get('/:id/attendance', protect, async (req, res) => {
  try {
    const requestedStudentId = req.params.id;

    // Role check: if user is student, they can only view their own attendance
    if (req.user.role === 'student' && req.user._id.toString() !== requestedStudentId) {
      return res.status(403).json({ message: 'Forbidden: Students can only view their own attendance' });
    }

    const { range = 'month', subject } = req.query;

    // Calculate start date based on range
    const now = new Date();
    let startDate = new Date();
    if (range === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      startDate.setDate(now.getDate() - 30);
    } else if (range === '6month') {
      startDate.setDate(now.getDate() - 180);
    }

    // Query attendance records
    const filter = {
      studentId: requestedStudentId,
      markedAt: { $gte: startDate },
    };

    const records = await AttendanceRecord.find(filter)
      .populate('sessionId', 'subject period teacherId date')
      .sort({ markedAt: -1 })
      .lean();

    // Filter by subject if specified
    const filteredRecords = subject
      ? records.filter((r) => r.sessionId?.subject === subject)
      : records;

    // Calculate per-subject attendance percentages
    const subjectStats = {};
    filteredRecords.forEach((r) => {
      const subName = r.sessionId?.subject || 'General';
      if (!subjectStats[subName]) {
        subjectStats[subName] = { total: 0, present: 0 };
      }
      subjectStats[subName].total += 1;
      if (r.status === 'present' || r.status === 'teacher_confirmed') {
        subjectStats[subName].present += 1;
      }
    });

    const MINIMUM_ATTENDANCE_THRESHOLD = 75; // Institutional threshold
    const subjectSummary = Object.keys(subjectStats).map((subName) => {
      const { total, present } = subjectStats[subName];
      const percentage = Math.round((present / total) * 100);
      return {
        subject: subName,
        totalClasses: total,
        attendedClasses: present,
        percentage,
        belowThreshold: percentage < MINIMUM_ATTENDANCE_THRESHOLD,
      };
    });

    // Today's summary
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRecords = records.filter((r) => new Date(r.markedAt) >= todayStart);

    res.json({
      range,
      records: filteredRecords.map((r) => ({
        _id: r._id,
        markedAt: r.markedAt,
        subject: r.sessionId?.subject || 'N/A',
        period: r.sessionId?.period || 'N/A',
        status: r.status,
        confidenceScore: r.confidenceScore,
        sessionId: r.sessionId?._id,
      })),
      subjectSummary,
      todaySummary: todayRecords.map((r) => ({
        _id: r._id,
        subject: r.sessionId?.subject,
        period: r.sessionId?.period,
        status: r.status,
      })),
    });
  } catch (err) {
    console.error('Error fetching student attendance:', err);
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
});

// ── POST /api/disputes ──────────────────────────────────────
// Raise a flag on an absent attendance record (audited)
router.post('/disputes', protect, authorize('student'), async (req, res) => {
  try {
    const { attendanceRecordId, claim } = req.body;

    if (!attendanceRecordId || !claim || !claim.trim()) {
      return res.status(400).json({ message: 'Attendance record ID and claim reason are required' });
    }

    const record = await AttendanceRecord.findById(attendanceRecordId).populate('sessionId');
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Verify record belongs to current student
    if (record.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You can only raise flags for your own records' });
    }

    // Verify record status is absent
    if (record.status !== 'absent') {
      return res.status(400).json({ message: 'Flags can only be raised on records marked absent' });
    }

    // Check if dispute already exists
    const existing = await Dispute.findOne({
      attendanceRecordId,
      studentId: req.user._id,
      status: 'open',
    });

    if (existing) {
      return res.status(409).json({ message: 'A flag is already open for this attendance record' });
    }

    const dispute = await Dispute.create({
      studentId: req.user._id,
      sessionId: record.sessionId._id,
      attendanceRecordId: record._id,
      claim: claim.trim(),
      status: 'open',
    });

    // Write Mandatory AuditLog
    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'DISPUTE_RAISED',
      targetType: 'Dispute',
      targetId: dispute._id,
      reason: claim.trim(),
      previousValue: { status: record.status },
      newValue: { disputeId: dispute._id, status: 'disputed' },
    });

    res.status(201).json({
      message: 'Flag submitted successfully to teacher review queue',
      dispute,
    });
  } catch (err) {
    console.error('Error creating dispute:', err);
    res.status(500).json({ message: 'Failed to submit flag' });
  }
});

// ── GET /api/disputes/my ────────────────────────────────────
// Student view of their raised disputes
router.get('/disputes/my', protect, authorize('student'), async (req, res) => {
  try {
    const disputes = await Dispute.find({ studentId: req.user._id })
      .populate('sessionId', 'subject period date')
      .sort({ createdAt: -1 });

    res.json({ disputes });
  } catch (err) {
    console.error('Error fetching disputes:', err);
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
});

export default router;
