import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, requireRole('staff', 'manager'), async (req, res, next) => {
  try {
    const scope = req.user.role === 'manager' ? '' : 'WHERE t.assigned_to = $1 OR t.assigned_to IS NULL';
    const params = req.user.role === 'manager' ? [] : [req.user.id];

    const [summary, byStatus, byPriority, byCategory, byOwner, ageing] = await Promise.all([
      query(
        `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed'))::int AS open,
          COUNT(*) FILTER (WHERE due_at < NOW() AND status NOT IN ('resolved', 'closed'))::int AS overdue,
          COUNT(*) FILTER (
            WHERE due_at BETWEEN NOW() AND NOW() + INTERVAL '12 hours'
            AND status NOT IN ('resolved', 'closed')
          )::int AS at_risk,
          COUNT(*) FILTER (WHERE priority = 'urgent' AND status NOT IN ('resolved', 'closed'))::int AS urgent_open,
          COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved
        FROM tickets t ${scope}`,
        params
      ),
      query(
        `SELECT status AS name, COUNT(*)::int AS value
         FROM tickets t ${scope}
         GROUP BY status
         ORDER BY status`,
        params
      ),
      query(
        `SELECT priority AS name, COUNT(*)::int AS value
         FROM tickets t ${scope}
         GROUP BY priority
         ORDER BY priority`,
        params
      ),
      query(
        `SELECT c.name, COUNT(*)::int AS value
         FROM tickets t
         JOIN categories c ON c.id = t.category_id
         ${scope}
         GROUP BY c.name
         ORDER BY value DESC`,
        params
      ),
      query(
        `SELECT COALESCE(p.name, 'Unassigned') AS name, COUNT(*)::int AS value
         FROM tickets t
         LEFT JOIN profiles p ON p.id = t.assigned_to
         ${scope}
         GROUP BY p.name
         ORDER BY value DESC`,
        params
      ),
      query(
        `SELECT t.public_id, t.title, t.priority, t.status, t.due_at,
          EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600 AS age_hours
         FROM tickets t
         ${scope}
         ORDER BY t.created_at ASC
         LIMIT 6`,
        params
      )
    ]);

    res.json({
      summary: summary.rows[0],
      byStatus: byStatus.rows,
      byPriority: byPriority.rows,
      byCategory: byCategory.rows,
      byOwner: byOwner.rows,
      ageing: ageing.rows.map((row) => ({
        ...row,
        age_hours: Math.round(Number(row.age_hours))
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;

