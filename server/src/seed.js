import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { query, pool } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const password = 'Password@123';

async function upsertProfile({ name, email, role, department }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO profiles (name, email, password_hash, role, department)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, department = EXCLUDED.department
     RETURNING id`,
    [name, email, passwordHash, role, department]
  );

  return rows[0].id;
}

async function seed() {
  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await query(schema);

  const studentId = await upsertProfile({
    name: 'Aarav Sharma',
    email: 'student@edumerge.test',
    role: 'student',
    department: 'BCA - Section A'
  });
  const staffId = await upsertProfile({
    name: 'Priya Nair',
    email: 'staff@edumerge.test',
    role: 'staff',
    department: 'Student Services'
  });
  const managerId = await upsertProfile({
    name: 'Rahul Mehta',
    email: 'manager@edumerge.test',
    role: 'manager',
    department: 'Administration'
  });

  const categoryRows = [
    ['Fees', 'Accounts', 'Fee receipts, concessions, payment failures, refunds'],
    ['Attendance', 'Academic Office', 'Attendance corrections and shortage clarification'],
    ['ID Card', 'Student Services', 'Lost, damaged, or new student ID card requests'],
    ['Documents', 'Administration', 'Bonafide letters, transcripts, migration documents'],
    ['Certificates', 'Examination Cell', 'Course completion and exam certificates'],
    ['Other', 'Student Services', 'General administrative requests']
  ];

  const categoryIds = {};
  for (const category of categoryRows) {
    const { rows } = await query(
      `INSERT INTO categories (name, owner_department, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (name)
       DO UPDATE SET owner_department = EXCLUDED.owner_department, description = EXCLUDED.description
       RETURNING id, name`,
      category
    );
    categoryIds[rows[0].name] = rows[0].id;
  }

  const priorities = {
    low: 96,
    medium: 48,
    high: 24,
    urgent: 8
  };

  for (const categoryId of Object.values(categoryIds)) {
    for (const [priority, hours] of Object.entries(priorities)) {
      await query(
        `INSERT INTO sla_rules (category_id, priority, hours)
         VALUES ($1, $2, $3)
         ON CONFLICT (category_id, priority)
         DO UPDATE SET hours = EXCLUDED.hours`,
        [categoryId, priority, hours]
      );
    }
  }

  const existingTickets = await query('SELECT COUNT(*)::int AS count FROM tickets');
  if (existingTickets.rows[0].count === 0) {
    const demoTickets = [
      {
        title: 'Fee receipt not visible after online payment',
        description: 'I paid semester fees yesterday but the receipt is not available in the portal.',
        category: 'Fees',
        priority: 'high',
        status: 'in_progress',
        assignedTo: staffId,
        dueOffsetHours: 12
      },
      {
        title: 'Attendance correction for data structures lecture',
        description: 'I was present on Monday but attendance is marked absent for the DS lecture.',
        category: 'Attendance',
        priority: 'medium',
        status: 'pending_department',
        assignedTo: staffId,
        pendingOn: 'Waiting for faculty confirmation',
        dueOffsetHours: -5
      },
      {
        title: 'Need bonafide certificate for scholarship',
        description: 'Please issue a bonafide certificate for my scholarship application before Friday.',
        category: 'Documents',
        priority: 'urgent',
        status: 'assigned',
        assignedTo: managerId,
        dueOffsetHours: 6
      },
      {
        title: 'Lost ID card replacement',
        description: 'I lost my ID card during sports practice and need a replacement.',
        category: 'ID Card',
        priority: 'low',
        status: 'new',
        assignedTo: null,
        dueOffsetHours: 72
      }
    ];

    for (const item of demoTickets) {
      const { rows } = await query(
        `INSERT INTO tickets
          (title, description, student_id, category_id, priority, status, assigned_to, pending_on, due_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + ($9 || ' hours')::interval)
         RETURNING id`,
        [
          item.title,
          item.description,
          studentId,
          categoryIds[item.category],
          item.priority,
          item.status,
          item.assignedTo,
          item.pendingOn || null,
          item.dueOffsetHours
        ]
      );
      const ticketId = rows[0].id;
      await query('UPDATE tickets SET public_id = $1 WHERE id = $2', [
        `SUP-${String(ticketId).padStart(5, '0')}`,
        ticketId
      ]);
      await query(
        'INSERT INTO ticket_activity (ticket_id, actor_id, action, details) VALUES ($1, $2, $3, $4)',
        [ticketId, managerId, 'seeded_demo_ticket', { status: item.status }]
      );
    }
  }

  console.log('Database seeded successfully.');
  console.log('Demo password for all users:', password);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

