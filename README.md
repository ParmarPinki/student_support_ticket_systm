# Student Support & Ticket Management

Assignment 4 from the Edumerge Product Engineering brief. This is a complete deployable prototype for managing student administrative support requests across fees, attendance, ID cards, documents, certificates, and other college operations.

## Tech Stack

- Frontend: React + Vite
- Backend: Express.js + Node.js
- Database: PostgreSQL
- Auth: JWT + bcrypt
- Charts/UI helpers: Recharts + Lucide React
- Deployment: Vercel for frontend, Render for backend, hosted PostgreSQL such as Supabase/Neon/Render Postgres

## Features

- Role based login for student, staff, and manager
- Students can raise and track tickets
- Staff can own tickets, update status, add comments, and resolve requests
- Managers can monitor SLA health, ageing, priority mix, workload, and category trends
- Ticket workflow supports new, assigned, in progress, pending student, pending department, resolved, and closed
- SLA due dates are calculated from category and priority rules
- Overdue and at-risk tickets are highlighted
- Full activity history and comment timeline
- Search, status, priority, owner, and category filters
- Demo seed data and database schema included

## Local Setup

Do not include `node_modules` or `client/dist` when submitting a zip. They are generated folders and are already ignored by `.gitignore`.

### 1. Create PostgreSQL database

Create a local or hosted PostgreSQL database, then keep the connection string ready:

```bash
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

### 2. Configure backend

```bash
cd server
cp .env.example .env
```

Update `.env`:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=replace-with-a-long-secret
CLIENT_URL=http://localhost:5173
PORT=5000
```

Install dependencies and seed demo data:

```bash
npm install
npm run seed
npm run dev
```

### 3. Configure frontend

In another terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Demo Accounts

All demo users use the password:

```text
Password@123
```

| Role | Email |
| --- | --- |
| Student | student@edumerge.test |
| Staff | staff@edumerge.test |
| Manager | manager@edumerge.test |

## Deployment

### Backend on Render

1. Push this repository to GitHub.
2. Create a new Render Web Service.
3. Root directory: `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CLIENT_URL` with your Vercel frontend URL
   - `NODE_ENV=production`
7. Run `npm run seed` once from Render shell or locally against the hosted database.

### Frontend on Vercel

1. Import the same GitHub repository in Vercel.
2. Root directory: `client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable:
   - `VITE_API_URL=https://your-render-backend-url.onrender.com/api`

## Product Assumptions

- Students can create tickets and see only their own tickets.
- Staff users can see tickets assigned to them plus unassigned/new tickets.
- Managers can see all tickets and operational dashboards.
- SLA duration depends on category and priority.
- Pending states pause ownership work conceptually, but the ticket still ages for visibility.
- Closing a ticket is separate from resolving it so a manager or process owner can review resolution quality.

## Important Edge Cases

- Overdue tickets are automatically derived from `due_at`.
- Tickets close to SLA breach are shown as at risk.
- Every ticket update writes an activity record.
- Resolution requires a resolution summary.
- Role checks are enforced on the backend, not only in the UI.

## API Overview

```text
POST   /api/auth/login
GET    /api/auth/me
GET    /api/users/staff
GET    /api/tickets
POST   /api/tickets
GET    /api/tickets/:id
PATCH  /api/tickets/:id
POST   /api/tickets/:id/comments
POST   /api/tickets/:id/resolve
GET    /api/dashboard
```
