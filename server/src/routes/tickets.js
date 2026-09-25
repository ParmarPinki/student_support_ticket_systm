import express from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

const createTicketSchema = z.object({
  title: z.string().min(5).max(160),
  description: z.string().min(10).max(2000),
  categoryId: z.number().int().positive(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'])
});

const updateTicketSchema = z.object({
  status: z
    .enum(['new', 'assigned', 'in_progress', 'pending_student', 'pending_department', 'resolved', 'closed'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  pendingOn: z.string().max(120).nullable().optional()
});

const commentSchema = z.object({
  body: z.string().min(1).max(1500),
  isInternal: z.boolean().optional().default(false)
});

const resolveSchema = z.object({
  resolutionSummary: z.string().min(10).max(1500)
});

function ticketSelect() {
  return `
    SELECT
      t.id,
      t.public_id,
      t.title,
      t.description,
      t.priority,
      t.status,
      t.pending_on,
      t.due_at,
      t.resolved_at,
      t.resolution_summary,
      t.created_at,
      t.updated_at,
      c.id AS category_id,
      c.name AS category_name,
      c.owner_department,
      s.id AS student_id,
      s.name AS student_name,
      s.email AS student_email,
      s.department AS student_department,
      a.id AS assigned_to,
      a.name AS assignee_name,
      EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600 AS age_hours,
      CASE
        WHEN t.status IN ('resolved', 'closed') THEN 'met'
        WHEN t.due_at < NOW() THEN 'breached'
        WHEN t.due_at <= NOW() + INTERVAL '12 hours' THEN 'at_risk'
        ELSE 'healthy'
      END AS sla_state
    FROM tickets t
    JOIN categories c ON c.id = t.category_id
    JOIN profiles s ON s.id = t.student_id
    LEFT JOIN profiles a ON a.id = t.assigned_to
  `;
}

function normalizeTicket(row) {
  return {
    ...row,
    age_hours: Math.round(Number(row.age_hours || 0))
  };
}

async function writeActivity(ticketId, actorId, action, details = {}) {
  await query(
    'INSERT INTO ticket_activity (ticket_id, actor_id, action, details) VALUES ($1, $2, $3, $4)',
    [ticketId, actorId, action, details]
  );
}

async function getTicketForUser(ticketId, user) {
  const clauses = ['(t.public_id = $1 OR t.id::text = $1)'];
  const params = [ticketId];

  if (user.role === 'student') {
    params.push(user.id);
    clauses.push(`t.student_id = $${params.length}`);
  } else if (user.role === 'staff') {
    params.push(user.id);
    clauses.push(`(t.assigned_to = $${params.length} OR t.assigned_to IS NULL)`);
  }

  const { rows } = await query(`${ticketSelect()} WHERE ${clauses.join(' AND ')}`, params);
  return rows[0] ? normalizeTicket(rows[0]) : null;
}

router.get('/categories', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT id, name, owner_department, description FROM categories ORDER BY name');
    res.json({ categories: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, priority, categoryId, owner, search } = req.query;
    const clauses = [];
    const params = [];

    if (req.user.role === 'student') {
      params.push(req.user.id);
      clauses.push(`t.student_id = $${params.length}`);
    } else if (req.user.role === 'staff') {
      params.push(req.user.id);
      clauses.push(`(t.assigned_to = $${params.length} OR t.assigned_to IS NULL)`);
    }

    if (status) {
      params.push(status);
      clauses.push(`t.status = $${params.length}`);
    }

    if (priority) {
      params.push(priority);
      clauses.push(`t.priority = $${params.length}`);
    }

    if (categoryId) {
      params.push(Number(categoryId));
      clauses.push(`t.category_id = $${params.length}`);
    }

    if (owner) {
      if (owner === 'unassigned') {
        clauses.push('t.assigned_to IS NULL');
      } else {
        params.push(Number(owner));
        clauses.push(`t.assigned_to = $${params.length}`);
      }
    }

    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(t.title ILIKE $${params.length} OR t.public_id ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await query(`${ticketSelect()} ${where} ORDER BY t.updated_at DESC`, params);

    res.json({ tickets: rows.map(normalizeTicket) });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = createTicketSchema.parse(req.body);
    const studentId = req.user.role === 'student' ? req.user.id : req.body.studentId || req.user.id;

    const sla = await query(
      `SELECT hours FROM sla_rules
       WHERE category_id = $1 AND priority = $2`,
      [body.categoryId, body.priority]
    );
    const hours = sla.rows[0]?.hours || 48;

    const inserted = await query(
      `INSERT INTO tickets (title, description, student_id, category_id, priority, due_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' hours')::interval)
       RETURNING id`,
      [body.title, body.description, studentId, body.categoryId, body.priority, hours]
    );

    const id = inserted.rows[0].id;
    const publicId = `SUP-${String(id).padStart(5, '0')}`;
    await query('UPDATE tickets SET public_id = $1 WHERE id = $2', [publicId, id]);
    await writeActivity(id, req.user.id, 'ticket_created', { priority: body.priority });

    const ticket = await getTicketForUser(publicId, req.user);
    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const ticket = await getTicketForUser(req.params.id, req.user);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const comments = await query(
      `SELECT tc.id, tc.body, tc.is_internal, tc.created_at, p.name AS author_name, p.role AS author_role
       FROM ticket_comments tc
       JOIN profiles p ON p.id = tc.author_id
       WHERE tc.ticket_id = $1
       AND ($2::text <> 'student' OR tc.is_internal = false)
       ORDER BY tc.created_at ASC`,
      [ticket.id, req.user.role]
    );

    const activity = await query(
      `SELECT ta.id, ta.action, ta.details, ta.created_at, p.name AS actor_name
       FROM ticket_activity ta
       LEFT JOIN profiles p ON p.id = ta.actor_id
       WHERE ta.ticket_id = $1
       ORDER BY ta.created_at ASC`,
      [ticket.id]
    );

    res.json({ ticket, comments: comments.rows, activity: activity.rows });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requireAuth, requireRole('staff', 'manager'), async (req, res, next) => {
  try {
    const body = updateTicketSchema.parse(req.body);
    const existing = await getTicketForUser(req.params.id, req.user);
    if (!existing) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const fields = [];
    const params = [];
    const changes = {};

    const map = {
      status: 'status',
      priority: 'priority',
      assignedTo: 'assigned_to',
      pendingOn: 'pending_on'
    };

    for (const [inputKey, column] of Object.entries(map)) {
      if (Object.prototype.hasOwnProperty.call(body, inputKey)) {
        params.push(body[inputKey]);
        fields.push(`${column} = $${params.length}`);
        changes[inputKey] = body[inputKey];
      }
    }

    if (!fields.length) {
      return res.status(400).json({ message: 'No ticket fields were provided.' });
    }

    params.push(existing.id);
    await query(
      `UPDATE tickets
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length}`,
      params
    );

    await writeActivity(existing.id, req.user.id, 'ticket_updated', changes);
    const ticket = await getTicketForUser(String(existing.id), req.user);
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const body = commentSchema.parse(req.body);
    const ticket = await getTicketForUser(req.params.id, req.user);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (req.user.role === 'student' && body.isInternal) {
      return res.status(403).json({ message: 'Students cannot add internal notes.' });
    }

    const { rows } = await query(
      `INSERT INTO ticket_comments (ticket_id, author_id, body, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING id, body, is_internal, created_at`,
      [ticket.id, req.user.id, body.body, body.isInternal]
    );

    await query('UPDATE tickets SET updated_at = NOW() WHERE id = $1', [ticket.id]);
    await writeActivity(ticket.id, req.user.id, body.isInternal ? 'internal_note_added' : 'comment_added', {});

    res.status(201).json({ comment: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/resolve', requireAuth, requireRole('staff', 'manager'), async (req, res, next) => {
  try {
    const body = resolveSchema.parse(req.body);
    const ticket = await getTicketForUser(req.params.id, req.user);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    await query(
      `UPDATE tickets
       SET status = 'resolved', resolved_at = NOW(), resolution_summary = $1, updated_at = NOW()
       WHERE id = $2`,
      [body.resolutionSummary, ticket.id]
    );
    await writeActivity(ticket.id, req.user.id, 'ticket_resolved', {
      resolutionSummary: body.resolutionSummary
    });

    const updated = await getTicketForUser(String(ticket.id), req.user);
    res.json({ ticket: updated });
  } catch (error) {
    next(error);
  }
});

export default router;

