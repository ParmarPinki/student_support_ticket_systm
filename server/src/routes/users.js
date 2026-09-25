import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/staff', requireAuth, requireRole('staff', 'manager'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, email, role, department
       FROM profiles
       WHERE role IN ('staff', 'manager')
       ORDER BY role, name`
    );

    res.json({ users: rows });
  } catch (error) {
    next(error);
  }
});

export default router;

