import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Student from '../models/Student.js';
import { pool } from '../db.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// ── Helper: sign a JWT for a user ───────────────────────────
const signToken = (user) => {
  return jwt.sign({ id: user._id || user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ── POST /api/auth/signup ───────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, rollNo, department, section, employeeCode } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check for existing user in MongoDB
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    // Validate role if provided
    const validRoles = ['student', 'teacher', 'admin'];
    const userRole = role && validRoles.includes(role) ? role : 'student';

    // 1. Create primary User record in MongoDB
    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role: userRole,
    });

    // 2. Simultaneously create domain-specific record based on role
    if (userRole === 'student') {
      const generatedRollNo = rollNo || `STU-${Date.now().toString().slice(-6)}`;
      await Student.create({
        userId: user._id,
        rollNo: generatedRollNo,
        department: department || 'Computer Science',
        section: section || 'A',
        enrollmentStatus: 'pending',
      });
    }

    // 3. Simultaneously write to PostgreSQL tables if PostgreSQL is connected
    try {
      if (userRole === 'teacher') {
        const empCode = employeeCode || `EMP-${Date.now().toString().slice(-6)}`;
        await pool.query(
          `INSERT INTO teachers (employee_code, full_name, email, password_hash) 
           VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
          [empCode, name, email.toLowerCase(), user.passwordHash || 'HASHED_PWD']
        );
      } else if (userRole === 'student') {
        // Ensure a default class exists in classes table
        let classRes = await pool.query(`SELECT class_id FROM classes LIMIT 1`);
        let classId = classRes.rows[0]?.class_id;
        if (!classId) {
          const newClass = await pool.query(
            `INSERT INTO classes (class_code, class_name, department, semester, section, academic_year)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING class_id`,
            ['CS101', 'Computer Science 101', department || 'CSE', 1, section || 'A', '2024-2025']
          );
          classId = newClass.rows[0].class_id;
        }

        const regNo = rollNo || `REG-${Date.now().toString().slice(-6)}`;
        await pool.query(
          `INSERT INTO students (register_number, full_name, email, class_id, status)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (register_number) DO NOTHING`,
          [regNo, name, email.toLowerCase(), classId, 'active']
        );
      }
    } catch (pgErr) {
      // Log PostgreSQL sync info without blocking MongoDB signups if PG server is offline
      console.log(`ℹ️ PostgreSQL sync check: ${pgErr.message}`);
    }

    const token = signToken(user);

    res.status(201).json({
      message: 'Account and profile created simultaneously',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── POST /api/auth/login ────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── GET /api/auth/me ────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

export default router;
