import { Router } from 'itty-router';

// Define the environment interface for Cloudflare Pages Functions
interface Env {
  DB: D1Database;
}

// Create a new router
const router = Router();

// Helper to handle CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Middleware to add CORS headers to every response
const withCors = (response: Response) => {
  if (response) {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  return response;
};

// Handle OPTIONS requests for CORS preflight
router.options('*', () => new Response(null, { headers: corsHeaders }));

// Health Check Route (No DB required)
router.get('/api/ping', () => Response.json({ status: 'ok', message: 'Function is running' }));

// Setup Route (Run once to initialize DB)
router.get('/api/setup', async (req, env: Env) => {
  try {
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

    // Check if members exist, if not seed
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
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

// --- API Routes ---

// Members
router.get('/api/members', async (req, env: Env) => {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM members').all();
    return Response.json(results);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.post('/api/members', async (req, env: Env) => {
  try {
    const { name, role, email, password } = await req.json() as any;
    if (!name || !role) {
      return Response.json({ error: 'Name and role are required' }, { status: 400 });
    }
    const result = await env.DB.prepare(
      'INSERT INTO members (name, role, email, password) VALUES (?, ?, ?, ?)'
    )
      .bind(name, role, email, password)
      .run();
    
    return Response.json({ 
      id: result.meta.last_row_id, 
      name, role, email, password 
    }, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.put('/api/members/:id', async (req, env: Env) => {
  try {
    const { id } = req.params;
    const { name, role, email, password } = await req.json() as any;
    
    const result = await env.DB.prepare(
      'UPDATE members SET name = ?, role = ?, email = ?, password = ? WHERE id = ?'
    )
      .bind(name, role, email, password, id)
      .run();

    if (!result.success) { // D1 doesn't always return changes count reliably in all environments, but success is key
       // Check if member exists separately if needed, but for now assume success means it ran
    }
    
    return Response.json({ id: Number(id), name, role, email, password });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.delete('/api/members/:id', async (req, env: Env) => {
  try {
    const { id } = req.params;
    // Delete logs first
    await env.DB.prepare('DELETE FROM logs WHERE member_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM members WHERE id = ?').bind(id).run();
    return Response.json({ message: 'Member deleted' });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

// Logs
router.get('/api/logs', async (req, env: Env) => {
  try {
    const url = new URL(req.url);
    const memberId = url.searchParams.get('memberId');
    
    let stmt;
    if (memberId) {
      stmt = env.DB.prepare('SELECT * FROM logs WHERE member_id = ? ORDER BY timestamp DESC').bind(memberId);
    } else {
      stmt = env.DB.prepare('SELECT * FROM logs ORDER BY timestamp DESC');
    }
    
    const { results } = await stmt.all();
    return Response.json(results);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.post('/api/logs', async (req, env: Env) => {
  try {
    const { type, memberId, note } = await req.json() as any;
    if (!type || !memberId) {
      return Response.json({ error: 'Type and memberId are required' }, { status: 400 });
    }

    const now = new Date();
    const timestamp = now.toISOString();
    // Use Vietnam time for the date grouping
    const date = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

    const result = await env.DB.prepare(
      'INSERT INTO logs (type, member_id, timestamp, date, note) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(type, memberId, timestamp, date, note || null)
      .run();

    const newLog = await env.DB.prepare('SELECT * FROM logs WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();

    return Response.json(newLog, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.put('/api/logs/:id', async (req, env: Env) => {
  try {
    const { id } = req.params;
    const { note, timestamp } = await req.json() as any;

    let query = 'UPDATE logs SET note = ?';
    let params: any[] = [note];

    if (timestamp) {
      query += ', timestamp = ?, date = ?';
      params.push(timestamp);
      const dateStr = timestamp.split('T')[0];
      params.push(dateStr);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await env.DB.prepare(query).bind(...params).run();
    
    const updatedLog = await env.DB.prepare('SELECT * FROM logs WHERE id = ?').bind(id).first();
    return Response.json(updatedLog);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.delete('/api/logs/:id', async (req, env: Env) => {
  try {
    const { id } = req.params;
    await env.DB.prepare('DELETE FROM logs WHERE id = ?').bind(id).run();
    return Response.json({ message: 'Log deleted' });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.delete('/api/logs', async (req, env: Env) => {
  try {
    const url = new URL(req.url);
    const memberId = url.searchParams.get('memberId');
    if (!memberId) {
      return Response.json({ error: 'Member ID is required' }, { status: 400 });
    }
    await env.DB.prepare('DELETE FROM logs WHERE member_id = ?').bind(memberId).run();
    return Response.json({ message: 'All logs for member deleted' });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

// Projects
router.get('/api/projects', async (req, env: Env) => {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    return Response.json(results);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.post('/api/projects', async (req, env: Env) => {
  try {
    const { name, description } = await req.json() as any;
    if (!name) return Response.json({ error: 'Project name is required' }, { status: 400 });

    const result = await env.DB.prepare(
      'INSERT INTO projects (name, description) VALUES (?, ?)'
    )
      .bind(name, description)
      .run();

    const newProject = await env.DB.prepare('SELECT * FROM projects WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();

    return Response.json(newProject);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.delete('/api/projects/:id', async (req, env: Env) => {
  try {
    const { id } = req.params;
    const tasks = await env.DB.prepare('SELECT id FROM tasks WHERE project_id = ?').bind(id).all();
    if (tasks.results.length > 0) {
      return Response.json({ error: 'Cannot delete project with existing tasks' }, { status: 400 });
    }
    await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

// Tasks
router.get('/api/tasks', async (req, env: Env) => {
  try {
    const url = new URL(req.url);
    const assigneeId = url.searchParams.get('assigneeId');
    const assignerId = url.searchParams.get('assignerId');
    const projectId = url.searchParams.get('projectId');

    let stmt;
    if (assigneeId) {
      stmt = env.DB.prepare('SELECT * FROM tasks WHERE assignee_id = ? ORDER BY created_at DESC').bind(assigneeId);
    } else if (assignerId) {
      stmt = env.DB.prepare('SELECT * FROM tasks WHERE assigner_id = ? ORDER BY created_at DESC').bind(assignerId);
    } else if (projectId) {
      stmt = env.DB.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC').bind(projectId);
    } else {
      stmt = env.DB.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
    }

    const { results } = await stmt.all();
    return Response.json(results);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.post('/api/tasks', async (req, env: Env) => {
  try {
    const { title, description, assignee_id, assigner_id, project_id, deadline, priority } = await req.json() as any;
    if (!title || !assignee_id || !assigner_id) {
      return Response.json({ error: 'Title, assignee_id, and assigner_id are required' }, { status: 400 });
    }

    const result = await env.DB.prepare(
      'INSERT INTO tasks (title, description, assignee_id, assigner_id, project_id, deadline, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(title, description || null, assignee_id, assigner_id, project_id || null, deadline || null, priority || 'medium', 'pending')
      .run();

    const newTask = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();

    return Response.json(newTask, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.put('/api/tasks/:id', async (req, env: Env) => {
  try {
    const { id } = req.params;
    const { title, description, assignee_id, deadline, priority, status } = await req.json() as any;

    const existingTask: any = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    if (!existingTask) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    await env.DB.prepare(
      'UPDATE tasks SET title = ?, description = ?, assignee_id = ?, deadline = ?, priority = ?, status = ? WHERE id = ?'
    )
      .bind(
        title !== undefined ? title : existingTask.title,
        description !== undefined ? description : existingTask.description,
        assignee_id !== undefined ? assignee_id : existingTask.assignee_id,
        deadline !== undefined ? deadline : existingTask.deadline,
        priority !== undefined ? priority : existingTask.priority,
        status !== undefined ? status : existingTask.status,
        id
      )
      .run();

    const updatedTask = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    return Response.json(updatedTask);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

router.delete('/api/tasks/:id', async (req, env: Env) => {
  try {
    const { id } = req.params;
    await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
    return Response.json({ message: 'Task deleted' });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

// Status
router.get('/api/status', async (req, env: Env) => {
  try {
    const url = new URL(req.url);
    const memberId = url.searchParams.get('memberId');
    if (!memberId) {
      return Response.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const lastLog: any = await env.DB.prepare(
      "SELECT type FROM logs WHERE member_id = ? AND type IN ('in', 'out') ORDER BY timestamp DESC LIMIT 1"
    )
      .bind(memberId)
      .first();

    const status = lastLog?.type === 'in' ? 'working' : 'off';
    return Response.json({ status });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

// Backup
router.get('/api/admin/backup', async (req, env: Env) => {
  try {
    const { results: members } = await env.DB.prepare('SELECT * FROM members').all();
    const { results: logs } = await env.DB.prepare('SELECT * FROM logs').all();
    const { results: tasks } = await env.DB.prepare('SELECT * FROM tasks').all();
    
    return Response.json({
      timestamp: new Date().toISOString(),
      members,
      logs,
      tasks
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});

// Restore
router.post('/api/admin/restore', async (req, env: Env) => {
  try {
    const { members, logs, tasks } = await req.json() as any;

    if (!Array.isArray(members) || !Array.isArray(logs)) {
      return Response.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    // Use a batch transaction if possible, or sequential awaits
    // D1 supports batching, but for simplicity we'll do sequential here as batch size is limited
    
    await env.DB.prepare('DELETE FROM tasks').run();
    await env.DB.prepare('DELETE FROM logs').run();
    await env.DB.prepare('DELETE FROM members').run();

    // Restore members
    for (const m of members) {
      await env.DB.prepare(
        'INSERT INTO members (id, name, role, email, password, avatar) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(m.id, m.name, m.role, m.email || null, m.password || null, m.avatar || null)
        .run();
    }

    // Restore logs
    for (const l of logs) {
      await env.DB.prepare(
        'INSERT INTO logs (id, member_id, type, timestamp, date, note) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(l.id, l.member_id || l.memberId, l.type, l.timestamp, l.date, l.note || null)
        .run();
    }

    // Restore tasks
    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        await env.DB.prepare(
          'INSERT INTO tasks (id, title, description, assignee_id, assigner_id, deadline, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(t.id, t.title, t.description || null, t.assignee_id, t.assigner_id, t.deadline || null, t.priority || 'medium', t.status || 'pending', t.created_at)
          .run();
      }
    }

    return Response.json({ message: 'Restore successful' });
  } catch (e: any) {
    return Response.json({ error: 'Failed to restore backup: ' + (e.message || String(e)) }, { status: 500 });
  }
});

// 404 Handler
router.all('*', () => new Response('Not Found', { status: 404 }));

export const onRequest = (context: any) => router.handle(context.request, context.env).then(withCors);
