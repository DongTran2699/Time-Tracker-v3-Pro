// Define the environment interface for Cloudflare Pages Functions
interface Env {
  DB: D1Database;
}

// CORS Helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Main Handler
export const onRequest = async (context: any) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname; // e.g., "/api/members"
  const method = request.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let response: Response;

    // --- ROUTING LOGIC ---
    
    // Setup
    if (path === '/api/setup' && method === 'GET') {
      response = await handleSetup(env);
    }
    // Health Check
    else if (path === '/api/ping' && method === 'GET') {
      response = Response.json({ status: 'ok', message: 'Function is running' });
    }
    // Members
    else if (path === '/api/members') {
      if (method === 'GET') response = await getMembers(env);
      else if (method === 'POST') response = await createMember(request, env);
      else response = new Response('Method Not Allowed', { status: 405 });
    }
    else if (path.match(/^\/api\/members\/\d+$/)) {
      const id = path.split('/').pop();
      if (method === 'PUT') response = await updateMember(id!, request, env);
      else if (method === 'DELETE') response = await deleteMember(id!, env);
      else response = new Response('Method Not Allowed', { status: 405 });
    }
    // Logs
    else if (path === '/api/logs') {
      if (method === 'GET') response = await getLogs(request, env);
      else if (method === 'POST') response = await createLog(request, env);
      else if (method === 'DELETE') response = await deleteLogs(request, env);
      else response = new Response('Method Not Allowed', { status: 405 });
    }
    else if (path.match(/^\/api\/logs\/\d+$/)) {
      const id = path.split('/').pop();
      if (method === 'PUT') response = await updateLog(id!, request, env);
      else if (method === 'DELETE') response = await deleteLog(id!, env);
      else response = new Response('Method Not Allowed', { status: 405 });
    }
    // Projects
    else if (path === '/api/projects') {
      if (method === 'GET') response = await getProjects(env);
      else if (method === 'POST') response = await createProject(request, env);
      else response = new Response('Method Not Allowed', { status: 405 });
    }
    else if (path.match(/^\/api\/projects\/\d+$/)) {
      const id = path.split('/').pop();
      if (method === 'DELETE') response = await deleteProject(id!, env);
      else response = new Response('Method Not Allowed', { status: 405 });
    }
    // Tasks
    else if (path === '/api/tasks') {
      if (method === 'GET') response = await getTasks(request, env);
      else if (method === 'POST') response = await createTask(request, env);
      else response = new Response('Method Not Allowed', { status: 405 });
    }
    else if (path.match(/^\/api\/tasks\/\d+$/)) {
      const id = path.split('/').pop();
      if (method === 'PUT') response = await updateTask(id!, request, env);
      else if (method === 'DELETE') response = await deleteTask(id!, env);
      else response = new Response('Method Not Allowed', { status: 405 });
    }
    // Status
    else if (path === '/api/status' && method === 'GET') {
      response = await getStatus(request, env);
    }
    // Backup/Restore
    else if (path === '/api/admin/backup' && method === 'GET') {
      response = await backup(env);
    }
    else if (path === '/api/admin/restore' && method === 'POST') {
      response = await restore(request, env);
    }
    else {
      response = new Response('Not Found', { status: 404 });
    }

    // Attach CORS to the response
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// --- HANDLERS ---

async function handleSetup(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      password TEXT,
      avatar TEXT
    );
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL DEFAULT 1,
      type TEXT NOT NULL, -- 'in' or 'out'
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      date TEXT NOT NULL, -- YYYY-MM-DD for easy grouping
      note TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      assignee_id INTEGER NOT NULL,
      assigner_id INTEGER NOT NULL,
      project_id INTEGER,
      deadline TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignee_id) REFERENCES members(id),
      FOREIGN KEY (assigner_id) REFERENCES members(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );
  `).run();

  const { results } = await env.DB.prepare('SELECT count(*) as count FROM members').all();
  const count = (results[0] as any).count;

  if (count === 0) {
    await env.DB.prepare(`
      INSERT INTO members (name, role, email, password) VALUES 
      ('Nguyễn Văn A', 'Developer', 'a@example.com', NULL),
      ('Trần Thị B', 'Designer', 'b@example.com', NULL),
      ('Lê Văn C', 'Project Manager', 'c@example.com', NULL),
      ('Phạm Thị D', 'QA Engineer', 'd@example.com', NULL),
      ('Hoàng Văn E', 'Backend Dev', 'e@example.com', NULL),
      ('Vũ Thị F', 'Frontend Dev', 'f@example.com', NULL),
      ('Đặng Văn G', 'DevOps', 'g@example.com', NULL),
      ('Bùi Thị H', 'HR Manager', 'h@example.com', NULL),
      ('Lý Văn I', 'Business Analyst', 'i@example.com', NULL),
      ('Ngô Thị K', 'Marketing', 'k@example.com', NULL),
      ('Đặng Tiến Đông', 'Owner', 'dongtb@bimhanoi.com.vn', 'catalunia2699');
    `).run();
    return Response.json({ message: 'Database initialized and seeded successfully' });
  }

  return Response.json({ message: 'Database initialized (already seeded)' });
}

async function getMembers(env: Env) {
  const { results } = await env.DB.prepare('SELECT * FROM members').all();
  return Response.json(results);
}

async function createMember(req: Request, env: Env) {
  const { name, role, email, password } = await req.json() as any;
  if (!name || !role) return Response.json({ error: 'Name and role are required' }, { status: 400 });
  
  const result = await env.DB.prepare('INSERT INTO members (name, role, email, password) VALUES (?, ?, ?, ?)')
    .bind(name, role, email, password).run();
  
  return Response.json({ id: result.meta.last_row_id, name, role, email, password }, { status: 201 });
}

async function updateMember(id: string, req: Request, env: Env) {
  const { name, role, email, password } = await req.json() as any;
  await env.DB.prepare('UPDATE members SET name = ?, role = ?, email = ?, password = ? WHERE id = ?')
    .bind(name, role, email, password, id).run();
  return Response.json({ id: Number(id), name, role, email, password });
}

async function deleteMember(id: string, env: Env) {
  await env.DB.prepare('DELETE FROM logs WHERE member_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM members WHERE id = ?').bind(id).run();
  return Response.json({ message: 'Member deleted' });
}

async function getLogs(req: Request, env: Env) {
  const url = new URL(req.url);
  const memberId = url.searchParams.get('memberId');
  let stmt = memberId 
    ? env.DB.prepare('SELECT * FROM logs WHERE member_id = ? ORDER BY timestamp DESC').bind(memberId)
    : env.DB.prepare('SELECT * FROM logs ORDER BY timestamp DESC');
  const { results } = await stmt.all();
  return Response.json(results);
}

async function createLog(req: Request, env: Env) {
  const { type, memberId, note } = await req.json() as any;
  if (!type || !memberId) return Response.json({ error: 'Type and memberId are required' }, { status: 400 });

  const now = new Date();
  const timestamp = now.toISOString();
  const date = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

  const result = await env.DB.prepare('INSERT INTO logs (type, member_id, timestamp, date, note) VALUES (?, ?, ?, ?, ?)')
    .bind(type, memberId, timestamp, date, note || null).run();
  
  const newLog = await env.DB.prepare('SELECT * FROM logs WHERE id = ?').bind(result.meta.last_row_id).first();
  return Response.json(newLog, { status: 201 });
}

async function updateLog(id: string, req: Request, env: Env) {
  const { note, timestamp } = await req.json() as any;
  let query = 'UPDATE logs SET note = ?';
  let params: any[] = [note];
  if (timestamp) {
    query += ', timestamp = ?, date = ?';
    params.push(timestamp);
    params.push(timestamp.split('T')[0]);
  }
  query += ' WHERE id = ?';
  params.push(id);
  await env.DB.prepare(query).bind(...params).run();
  const updated = await env.DB.prepare('SELECT * FROM logs WHERE id = ?').bind(id).first();
  return Response.json(updated);
}

async function deleteLog(id: string, env: Env) {
  await env.DB.prepare('DELETE FROM logs WHERE id = ?').bind(id).run();
  return Response.json({ message: 'Log deleted' });
}

async function deleteLogs(req: Request, env: Env) {
  const url = new URL(req.url);
  const memberId = url.searchParams.get('memberId');
  if (!memberId) return Response.json({ error: 'Member ID is required' }, { status: 400 });
  await env.DB.prepare('DELETE FROM logs WHERE member_id = ?').bind(memberId).run();
  return Response.json({ message: 'All logs for member deleted' });
}

async function getProjects(env: Env) {
  const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  return Response.json(results);
}

async function createProject(req: Request, env: Env) {
  const { name, description } = await req.json() as any;
  if (!name) return Response.json({ error: 'Project name is required' }, { status: 400 });
  const result = await env.DB.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').bind(name, description).run();
  const newProject = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(result.meta.last_row_id).first();
  return Response.json(newProject);
}

async function deleteProject(id: string, env: Env) {
  const tasks = await env.DB.prepare('SELECT id FROM tasks WHERE project_id = ?').bind(id).all();
  if (tasks.results.length > 0) return Response.json({ error: 'Cannot delete project with existing tasks' }, { status: 400 });
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  return Response.json({ success: true });
}

async function getTasks(req: Request, env: Env) {
  const url = new URL(req.url);
  const assigneeId = url.searchParams.get('assigneeId');
  const assignerId = url.searchParams.get('assignerId');
  const projectId = url.searchParams.get('projectId');
  let stmt;
  if (assigneeId) stmt = env.DB.prepare('SELECT * FROM tasks WHERE assignee_id = ? ORDER BY created_at DESC').bind(assigneeId);
  else if (assignerId) stmt = env.DB.prepare('SELECT * FROM tasks WHERE assigner_id = ? ORDER BY created_at DESC').bind(assignerId);
  else if (projectId) stmt = env.DB.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC').bind(projectId);
  else stmt = env.DB.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
  const { results } = await stmt.all();
  return Response.json(results);
}

async function createTask(req: Request, env: Env) {
  const { title, description, assignee_id, assigner_id, project_id, deadline, priority } = await req.json() as any;
  if (!title || !assignee_id || !assigner_id) return Response.json({ error: 'Required fields missing' }, { status: 400 });
  
  const result = await env.DB.prepare(
    'INSERT INTO tasks (title, description, assignee_id, assigner_id, project_id, deadline, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(title, description || null, assignee_id, assigner_id, project_id || null, deadline || null, priority || 'medium', 'pending').run();
  
  const newTask = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(result.meta.last_row_id).first();
  return Response.json(newTask, { status: 201 });
}

async function updateTask(id: string, req: Request, env: Env) {
  const { title, description, assignee_id, deadline, priority, status } = await req.json() as any;
  const existing: any = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  if (!existing) return Response.json({ error: 'Task not found' }, { status: 404 });

  await env.DB.prepare(
    'UPDATE tasks SET title = ?, description = ?, assignee_id = ?, deadline = ?, priority = ?, status = ? WHERE id = ?'
  ).bind(
    title !== undefined ? title : existing.title,
    description !== undefined ? description : existing.description,
    assignee_id !== undefined ? assignee_id : existing.assignee_id,
    deadline !== undefined ? deadline : existing.deadline,
    priority !== undefined ? priority : existing.priority,
    status !== undefined ? status : existing.status,
    id
  ).run();
  
  const updated = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  return Response.json(updated);
}

async function deleteTask(id: string, env: Env) {
  await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
  return Response.json({ message: 'Task deleted' });
}

async function getStatus(req: Request, env: Env) {
  const url = new URL(req.url);
  const memberId = url.searchParams.get('memberId');
  if (!memberId) return Response.json({ error: 'Member ID is required' }, { status: 400 });
  const lastLog: any = await env.DB.prepare("SELECT type FROM logs WHERE member_id = ? AND type IN ('in', 'out') ORDER BY timestamp DESC LIMIT 1").bind(memberId).first();
  return Response.json({ status: lastLog?.type === 'in' ? 'working' : 'off' });
}

async function backup(env: Env) {
  const { results: members } = await env.DB.prepare('SELECT * FROM members').all();
  const { results: logs } = await env.DB.prepare('SELECT * FROM logs').all();
  const { results: tasks } = await env.DB.prepare('SELECT * FROM tasks').all();
  return Response.json({ timestamp: new Date().toISOString(), members, logs, tasks });
}

async function restore(req: Request, env: Env) {
  const { members, logs, tasks } = await req.json() as any;
  await env.DB.prepare('DELETE FROM tasks').run();
  await env.DB.prepare('DELETE FROM logs').run();
  await env.DB.prepare('DELETE FROM members').run();
  
  for (const m of members) {
    await env.DB.prepare('INSERT INTO members (id, name, role, email, password, avatar) VALUES (?, ?, ?, ?, ?, ?)').bind(m.id, m.name, m.role, m.email || null, m.password || null, m.avatar || null).run();
  }
  for (const l of logs) {
    await env.DB.prepare('INSERT INTO logs (id, member_id, type, timestamp, date, note) VALUES (?, ?, ?, ?, ?, ?)').bind(l.id, l.member_id || l.memberId, l.type, l.timestamp, l.date, l.note || null).run();
  }
  if (Array.isArray(tasks)) {
    for (const t of tasks) {
      await env.DB.prepare('INSERT INTO tasks (id, title, description, assignee_id, assigner_id, deadline, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(t.id, t.title, t.description || null, t.assignee_id, t.assigner_id, t.deadline || null, t.priority || 'medium', t.status || 'pending', t.created_at).run();
    }
  }
  return Response.json({ message: 'Restore successful' });
}
