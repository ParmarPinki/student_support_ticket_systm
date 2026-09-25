# Fast Deployment Checklist

Use this order so the project can be deployed quickly without repeated changes.

## 1. Confirm Local App

Backend:

```bash
cd G:\Projects\edumerge_project\server
npm run dev
```

Frontend:

```bash
cd G:\Projects\edumerge_project\client
npm run dev
```

Open:

```text
http://localhost:5173
```

Demo login:

```text
manager@edumerge.test
Password@123
```

## 2. Push To GitHub

Create a new empty GitHub repo named:

```text
student-support-ticket-system
```

Then run:

```bash
cd G:\Projects\edumerge_project
git remote add origin https://github.com/YOUR_USERNAME/student-support-ticket-system.git
git branch -M main
git push -u origin main
```

Do not upload `.env`, `node_modules`, or `client/dist`.

## 3. Deploy Backend On Render

Create a Render Web Service from the GitHub repo.

Settings:

```text
Root Directory: server
Build Command: npm install
Start Command: npm start
```

Environment variables:

```text
DATABASE_URL=<your Neon pooled PostgreSQL URL>
JWT_SECRET=student-support-ticket-system-secret-2026
CLIENT_URL=<your Vercel frontend URL after frontend deployment>
NODE_ENV=production
```

After the backend deploys, copy the Render URL. It will look like:

```text
https://student-support-api.onrender.com
```

## 4. Seed Production Database

Use Render Shell or local terminal with the same Neon `DATABASE_URL`:

```bash
cd server
npm run seed
```

You already seeded the current Neon database locally. If Render uses the same `DATABASE_URL`, no extra seed is needed unless you reset the DB.

## 5. Deploy Frontend On Vercel

Import the GitHub repo in Vercel.

Settings:

```text
Root Directory: client
Build Command: npm run build
Output Directory: dist
```

Environment variable:

```text
VITE_API_URL=https://YOUR_RENDER_BACKEND_URL/api
```

Deploy, then copy the Vercel URL.

## 6. Final Render Update

Go back to Render and update:

```text
CLIENT_URL=https://YOUR_VERCEL_FRONTEND_URL
```

Redeploy backend once.

## 7. Final Test

Open the Vercel URL and test:

- Login as manager
- View dashboard
- Create a ticket
- Assign ticket to staff
- Add a comment
- Resolve ticket
- Login as student and confirm student can see tickets

## 8. Submission

Submit:

- GitHub repo link
- Vercel live link
- README.md
- AI_USAGE_REPORT.md

