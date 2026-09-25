import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Ticket,
  UserRound
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { api, clearSession, getStoredUser, setSession } from './api';

const demoAccounts = [
  { role: 'Student', email: 'student@edumerge.test' },
  { role: 'Staff', email: 'staff@edumerge.test' },
  { role: 'Manager', email: 'manager@edumerge.test' }
];

const statuses = [
  'new',
  'assigned',
  'in_progress',
  'pending_student',
  'pending_department',
  'resolved',
  'closed'
];

const priorities = ['low', 'medium', 'high', 'urgent'];
const chartColors = ['#1d4ed8', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#4b5563'];

function label(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function MetricCard({ title, value, icon: Icon, tone }) {
  return (
    <section className={`metric ${tone || ''}`}>
      <div>
        <span>{title}</span>
        <strong>{value ?? 0}</strong>
      </div>
      <Icon size={24} />
    </section>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('manager@edumerge.test');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await api('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      setSession(session);
      onLogin(session.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-mark">
          <Ticket size={26} />
        </div>
        <h1>Student Support Desk</h1>
        <p>Role based support workflow for student administrative requests.</p>

        <form onSubmit={submit} className="login-form">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="demo-grid">
          {demoAccounts.map((account) => (
            <button key={account.email} type="button" onClick={() => setEmail(account.email)}>
              {account.role}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function Dashboard({ user, dashboard }) {
  if (user.role === 'student' || !dashboard) {
    return null;
  }

  return (
    <>
      <div className="metrics-grid">
        <MetricCard title="Open Tickets" value={dashboard.summary.open} icon={Ticket} />
        <MetricCard title="Overdue" value={dashboard.summary.overdue} icon={AlertTriangle} tone="danger" />
        <MetricCard title="At Risk" value={dashboard.summary.at_risk} icon={Clock} tone="warning" />
        <MetricCard title="Resolved" value={dashboard.summary.resolved} icon={CheckCircle2} tone="success" />
      </div>

      <div className="charts-grid">
        <section className="panel">
          <div className="panel-title">
            <BarChart3 size={18} />
            <h2>Tickets by Category</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dashboard.byCategory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#1d4ed8" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <div className="panel-title">
            <ShieldCheck size={18} />
            <h2>Owner Workload</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={dashboard.byOwner} dataKey="value" nameKey="name" outerRadius={78} label>
                {dashboard.byOwner.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>
    </>
  );
}

function Filters({ filters, setFilters, categories, staff }) {
  return (
    <section className="filters">
      <label className="search-box">
        <Search size={18} />
        <input
          placeholder="Search ticket, title, student"
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
        />
      </label>
      <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
        <option value="">All statuses</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {label(status)}
          </option>
        ))}
      </select>
      <select value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
        <option value="">All priorities</option>
        {priorities.map((priority) => (
          <option key={priority} value={priority}>
            {label(priority)}
          </option>
        ))}
      </select>
      <select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}>
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select value={filters.owner} onChange={(event) => setFilters({ ...filters, owner: event.target.value })}>
        <option value="">All owners</option>
        <option value="unassigned">Unassigned</option>
        {staff.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </section>
  );
}

function TicketList({ tickets, selectedId, onSelect }) {
  return (
    <section className="ticket-list">
      {tickets.map((ticket) => (
        <button
          type="button"
          className={`ticket-row ${selectedId === ticket.public_id ? 'active' : ''}`}
          key={ticket.public_id}
          onClick={() => onSelect(ticket.public_id)}
        >
          <div className="ticket-row-top">
            <strong>{ticket.public_id}</strong>
            <span className={`pill priority-${ticket.priority}`}>{label(ticket.priority)}</span>
          </div>
          <h3>{ticket.title}</h3>
          <div className="ticket-meta">
            <span>{ticket.category_name}</span>
            <span>{label(ticket.status)}</span>
            <span>{ticket.age_hours}h old</span>
          </div>
          <div className={`sla ${ticket.sla_state}`}>SLA {label(ticket.sla_state)}</div>
        </button>
      ))}
      {tickets.length === 0 && <div className="empty-state">No tickets match the selected filters.</div>}
    </section>
  );
}

function NewTicketForm({ categories, onCreate }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    priority: 'medium'
  });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await onCreate({
        ...form,
        categoryId: Number(form.categoryId)
      });
      setForm({ title: '', description: '', categoryId: '', priority: 'medium' });
      setOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel">
      <button className="primary-action" type="button" onClick={() => setOpen(!open)}>
        <Plus size={18} />
        New Ticket
      </button>
      {open && (
        <form className="ticket-form" onSubmit={submit}>
          <label>
            Title
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            Category
            <select
              value={form.categoryId}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              required
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {label(priority)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Description
            <textarea
              rows="4"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit">Create Ticket</button>
        </form>
      )}
    </section>
  );
}

function TicketDetail({ user, ticketData, staff, onUpdate, onComment, onResolve }) {
  const [draft, setDraft] = useState('');
  const [internal, setInternal] = useState(false);
  const [resolution, setResolution] = useState('');

  const ticket = ticketData?.ticket;
  if (!ticket) {
    return (
      <section className="detail-placeholder">
        <Ticket size={36} />
        <p>Select a ticket to review ownership, SLA, activity, and resolution details.</p>
      </section>
    );
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    await onComment(ticket.public_id, { body: draft, isInternal: internal });
    setDraft('');
    setInternal(false);
  }

  async function submitResolution(event) {
    event.preventDefault();
    if (!resolution.trim()) return;
    await onResolve(ticket.public_id, resolution);
    setResolution('');
  }

  const canManage = user.role !== 'student';

  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div>
          <span className="eyebrow">{ticket.public_id}</span>
          <h2>{ticket.title}</h2>
          <p>{ticket.description}</p>
        </div>
        <span className={`pill priority-${ticket.priority}`}>{label(ticket.priority)}</span>
      </div>

      <div className="detail-grid">
        <div>
          <span>Student</span>
          <strong>{ticket.student_name}</strong>
        </div>
        <div>
          <span>Category</span>
          <strong>{ticket.category_name}</strong>
        </div>
        <div>
          <span>Owner</span>
          <strong>{ticket.assignee_name || 'Unassigned'}</strong>
        </div>
        <div>
          <span>Due</span>
          <strong>{formatDate(ticket.due_at)}</strong>
        </div>
      </div>

      {canManage && (
        <div className="workflow-card">
          <select value={ticket.status} onChange={(event) => onUpdate(ticket.public_id, { status: event.target.value })}>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {label(status)}
              </option>
            ))}
          </select>
          <select
            value={ticket.assigned_to || ''}
            onChange={(event) =>
              onUpdate(ticket.public_id, {
                assignedTo: event.target.value ? Number(event.target.value) : null,
                status: ticket.status === 'new' ? 'assigned' : ticket.status
              })
            }
          >
            <option value="">Unassigned</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Pending action"
            defaultValue={ticket.pending_on || ''}
            onBlur={(event) => onUpdate(ticket.public_id, { pendingOn: event.target.value || null })}
          />
        </div>
      )}

      {ticket.resolution_summary && (
        <div className="resolution">
          <CheckCircle2 size={18} />
          <span>{ticket.resolution_summary}</span>
        </div>
      )}

      <div className="timeline-layout">
        <section>
          <div className="panel-title">
            <MessageSquare size={18} />
            <h3>Comments</h3>
          </div>
          <div className="timeline">
            {ticketData.comments.map((comment) => (
              <article key={comment.id} className="timeline-item">
                <strong>{comment.author_name}</strong>
                <span>{formatDate(comment.created_at)} {comment.is_internal ? 'Internal' : ''}</span>
                <p>{comment.body}</p>
              </article>
            ))}
          </div>
          <form className="comment-form" onSubmit={submitComment}>
            <textarea
              rows="3"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a comment or update"
            />
            {canManage && (
              <label className="checkbox-line">
                <input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
                Internal note
              </label>
            )}
            <button type="submit">Add Comment</button>
          </form>
        </section>

        <section>
          <h3>Activity</h3>
          <div className="timeline">
            {ticketData.activity.map((item) => (
              <article key={item.id} className="timeline-item">
                <strong>{label(item.action)}</strong>
                <span>{formatDate(item.created_at)} by {item.actor_name || 'System'}</span>
              </article>
            ))}
          </div>
          {canManage && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <form className="comment-form" onSubmit={submitResolution}>
              <textarea
                rows="3"
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                placeholder="Resolution summary"
              />
              <button type="submit">Resolve Ticket</button>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    categoryId: '',
    owner: ''
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  async function loadLookups(currentUser = user) {
    const categoryData = await api('/tickets/categories');
    setCategories(categoryData.categories);
    if (currentUser?.role !== 'student') {
      const staffData = await api('/users/staff');
      setStaff(staffData.users);
    }
  }

  async function loadTickets() {
    const data = await api(`/tickets${queryString ? `?${queryString}` : ''}`);
    setTickets(data.tickets);
    if (!selectedId && data.tickets[0]) {
      setSelectedId(data.tickets[0].public_id);
    }
  }

  async function loadDashboard() {
    if (user?.role === 'student') return;
    const data = await api('/dashboard');
    setDashboard(data);
  }

  async function loadTicket(id) {
    if (!id) return;
    const data = await api(`/tickets/${id}`);
    setTicketData(data);
  }

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    Promise.all([loadLookups(user), loadTickets(), loadDashboard()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, queryString]);

  useEffect(() => {
    if (user && selectedId) {
      loadTicket(selectedId).catch((err) => setError(err.message));
    }
  }, [selectedId, user]);

  async function refresh(id = selectedId) {
    await Promise.all([loadTickets(), loadDashboard()]);
    if (id) {
      await loadTicket(id);
    }
  }

  async function createTicket(payload) {
    const data = await api('/tickets', { method: 'POST', body: payload });
    setSelectedId(data.ticket.public_id);
    await refresh(data.ticket.public_id);
  }

  async function updateTicket(id, payload) {
    await api(`/tickets/${id}`, { method: 'PATCH', body: payload });
    await refresh(id);
  }

  async function addComment(id, payload) {
    await api(`/tickets/${id}/comments`, { method: 'POST', body: payload });
    await refresh(id);
  }

  async function resolveTicket(id, resolutionSummary) {
    await api(`/tickets/${id}/resolve`, {
      method: 'POST',
      body: { resolutionSummary }
    });
    await refresh(id);
  }

  function logout() {
    clearSession();
    setUser(null);
    setTickets([]);
    setTicketData(null);
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Ticket size={23} />
          </div>
          <div>
            <strong>Support Desk</strong>
            <span>Edumerge assignment</span>
          </div>
        </div>
        <nav>
          <a className="nav-item active" href="#tickets">
            <Ticket size={18} />
            Tickets
          </a>
          {user.role !== 'student' && (
            <a className="nav-item" href="#dashboard">
              <BarChart3 size={18} />
              Dashboard
            </a>
          )}
        </nav>
        <div className="user-card">
          <UserRound size={20} />
          <div>
            <strong>{user.name}</strong>
            <span>{label(user.role)} · {user.department}</span>
          </div>
        </div>
        <button className="logout" type="button" onClick={logout}>
          <LogOut size={17} />
          Logout
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Assignment 4</span>
            <h1>Student Support & Ticket Management</h1>
          </div>
          <NewTicketForm categories={categories} onCreate={createTicket} />
        </header>

        {error && <div className="error global-error">{error}</div>}
        {loading && <div className="loading">Loading workspace...</div>}

        <section id="dashboard">
          <Dashboard user={user} dashboard={dashboard} />
        </section>

        <section id="tickets" className="content-grid">
          <div>
            <Filters filters={filters} setFilters={setFilters} categories={categories} staff={staff} />
            <TicketList tickets={tickets} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <TicketDetail
            user={user}
            ticketData={ticketData}
            staff={staff}
            onUpdate={updateTicket}
            onComment={addComment}
            onResolve={resolveTicket}
          />
        </section>
      </section>
    </main>
  );
}

