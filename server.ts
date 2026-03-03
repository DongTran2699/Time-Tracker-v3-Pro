import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "./src/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = getDb();

// Initialize database
async function initDb() {
  if (process.env.DATABASE_URL) {
    // Postgres initialization
    await db.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT,
        password TEXT,
        avatar TEXT
      );
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL DEFAULT 1,
        type TEXT NOT NULL, -- 'in' or 'out'
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date TEXT NOT NULL, -- YYYY-MM-DD for easy grouping
        note TEXT,
        FOREIGN KEY (member_id) REFERENCES members(id)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        assignee_id INTEGER NOT NULL,
        assigner_id INTEGER NOT NULL,
        project_id INTEGER,
        deadline TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignee_id) REFERENCES members(id),
        FOREIGN KEY (assigner_id) REFERENCES members(id),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );
    `);

    // Add project_id column if it doesn't exist (for existing databases)
    try {
      await db.query("ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id)");
    } catch (e) {
      // Ignore error if column already exists
    }

    // Postgres Migrations
    try {
      await db.query("ALTER TABLE logs ADD COLUMN note TEXT");
      console.log("Migration: Added note column to logs table (Postgres)");
    } catch (e: any) {
      if (!e.message.includes("already exists")) {
        console.error("Migration error (logs note Postgres):", e.message);
      }
    }
  } else {
    // SQLite initialization
    await db.run(`
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT,
        password TEXT,
        avatar TEXT
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL DEFAULT 1,
        type TEXT NOT NULL, -- 'in' or 'out'
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        date TEXT NOT NULL, -- YYYY-MM-DD for easy grouping
        FOREIGN KEY (member_id) REFERENCES members(id)
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.run(`
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
    `);

    // SQLite Migrations
    try {
      await db.run("ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id)");
      console.log("Migration: Added project_id column to tasks table (SQLite)");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) {
        // console.error("Migration error (tasks project_id SQLite):", e.message);
      }
    }
    try {
      await db.run("ALTER TABLE members ADD COLUMN email TEXT");
      console.log("Migration: Added email column to members table");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) {
        console.error("Migration error (members email):", e.message);
      }
    }

    try {
      await db.run("ALTER TABLE members ADD COLUMN password TEXT");
      console.log("Migration: Added password column to members table");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) {
        console.error("Migration error (members password):", e.message);
      }
    }

    try {
      await db.run("ALTER TABLE logs ADD COLUMN member_id INTEGER NOT NULL DEFAULT 1");
      console.log("Migration: Added member_id column to logs table");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) {
        console.error("Migration error:", e.message);
      }
    }

    try {
      await db.run("ALTER TABLE logs ADD COLUMN note TEXT");
      console.log("Migration: Added note column to logs table");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) {
        console.error("Migration error (logs note):", e.message);
      }
    }
  }

  // Seed members if empty
  const memberCount = await db.get("SELECT COUNT(*) as count FROM members");
  const count = process.env.DATABASE_URL ? parseInt(memberCount.count) : memberCount.count;

  if (count === 0) {
    console.log("Database is empty. Seeding initial members...");
    const seedMembers = [
      ["Nguyễn Văn A", "Developer", "a@example.com", null],
      ["Trần Thị B", "Designer", "b@example.com", null],
      ["Lê Văn C", "Project Manager", "c@example.com", null],
      ["Phạm Thị D", "QA Engineer", "d@example.com", null],
      ["Hoàng Văn E", "Backend Dev", "e@example.com", null],
      ["Vũ Thị F", "Frontend Dev", "f@example.com", null],
      ["Đặng Văn G", "DevOps", "g@example.com", null],
      ["Bùi Thị H", "HR Manager", "h@example.com", null],
      ["Lý Văn I", "Business Analyst", "i@example.com", null],
      ["Ngô Thị K", "Marketing", "k@example.com", null],
      ["Đặng Tiến Đông", "Owner", "dongtb@bimhanoi.com.vn", "catalunia2699"]
    ];
    
    for (const m of seedMembers) {
      await db.run("INSERT INTO members (name, role, email, password) VALUES (?, ?, ?, ?)", [m[0], m[1], m[2], m[3]]);
    }
    console.log("Seeding completed.");
  } else {
    console.log(`Database already has ${count} members.`);
  }
}

// initDb().catch(console.error); // Don't run this detached

async function startServer() {
  // Wait for DB init before starting server
  try {
    await initDb();
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/members", async (req, res) => {
    try {
      const members = await db.query("SELECT * FROM members");
      res.json(members);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/members", async (req, res) => {
    const { name, role, email, password } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: "Name and role are required" });
    }
    try {
      const result = await db.run("INSERT INTO members (name, role, email, password) VALUES (?, ?, ?, ?)", [name, role, email, password]);
      const newMember = { id: result.lastInsertRowid, name, role, email, password };
      res.status(201).json(newMember);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create member" });
    }
  });

  app.put("/api/members/:id", async (req, res) => {
    const { id } = req.params;
    const { name, role, email, password } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: "Name and role are required" });
    }
    try {
      const result = await db.run("UPDATE members SET name = ?, role = ?, email = ?, password = ? WHERE id = ?", [name, role, email, password, id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json({ id: Number(id), name, role, email, password });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update member" });
    }
  });

  app.delete("/api/members/:id", async (req, res) => {
    const { id } = req.params;
    try {
      // Delete logs first
      await db.run("DELETE FROM logs WHERE member_id = ?", [id]);
      const result = await db.run("DELETE FROM members WHERE id = ?", [id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json({ message: "Member deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete member" });
    }
  });

  app.get("/api/logs", async (req, res) => {
    const { memberId } = req.query;
    try {
      let logs;
      if (memberId) {
        logs = await db.query("SELECT * FROM logs WHERE member_id = ? ORDER BY timestamp DESC", [memberId]);
      } else {
        logs = await db.query("SELECT * FROM logs ORDER BY timestamp DESC");
      }
      res.json(logs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.post("/api/logs", async (req, res) => {
    const { type, memberId, note } = req.body;
    if (!type || !memberId) {
      return res.status(400).json({ error: "Type and memberId are required" });
    }
    
    const now = new Date();
    const timestamp = now.toISOString();
    // Use Vietnam time for the date grouping
    const date = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    try {
      const result = await db.run(
        "INSERT INTO logs (type, member_id, timestamp, date, note) VALUES (?, ?, ?, ?, ?)",
        [type, memberId, timestamp, date, note || null]
      );
      
      const newLog = await db.get("SELECT * FROM logs WHERE id = ?", [result.lastInsertRowid]);
      res.status(201).json(newLog);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create log" });
    }
  });

  app.put("/api/logs/:id", async (req, res) => {
    const { id } = req.params;
    const { note, timestamp } = req.body;
    
    try {
      let query = "UPDATE logs SET note = ?";
      let params: any[] = [note];
      
      if (timestamp) {
        query += ", timestamp = ?, date = ?";
        params.push(timestamp);
        const dateStr = timestamp.split('T')[0];
        params.push(dateStr);
      }
      
      query += " WHERE id = ?";
      params.push(id);

      const result = await db.run(query, params);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: "Log not found" });
      }
      
      const updatedLog = await db.get("SELECT * FROM logs WHERE id = ?", [id]);
      res.json(updatedLog);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update log" });
    }
  });

  app.delete("/api/logs/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.run("DELETE FROM logs WHERE id = ?", [id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Log not found" });
      }
      res.json({ message: "Log deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete log" });
    }
  });

  // Project API
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await db.query("SELECT * FROM projects ORDER BY created_at DESC");
      res.json(projects);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: "Project name is required" });
      
      const result = await db.run(
        "INSERT INTO projects (name, description) VALUES (?, ?)",
        [name, description]
      );
      
      const newProject = await db.get("SELECT * FROM projects WHERE id = ?", [result.lastInsertRowid]);
      res.json(newProject);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Check if project has tasks
      const tasks = await db.query("SELECT id FROM tasks WHERE project_id = ?", [id]);
      if (tasks.length > 0) {
        return res.status(400).json({ error: "Cannot delete project with existing tasks" });
      }
      
      await db.run("DELETE FROM projects WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Tasks API
  app.get("/api/tasks", async (req, res) => {
    const { assigneeId, assignerId, projectId } = req.query;
    try {
      let tasks;
      if (assigneeId) {
        tasks = await db.query("SELECT * FROM tasks WHERE assignee_id = ? ORDER BY created_at DESC", [assigneeId]);
      } else if (assignerId) {
        tasks = await db.query("SELECT * FROM tasks WHERE assigner_id = ? ORDER BY created_at DESC", [assignerId]);
      } else if (projectId) {
        tasks = await db.query("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC", [projectId]);
      } else {
        tasks = await db.query("SELECT * FROM tasks ORDER BY created_at DESC");
      }
      res.json(tasks);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    const { title, description, assignee_id, assigner_id, project_id, deadline, priority } = req.body;
    if (!title || !assignee_id || !assigner_id) {
      return res.status(400).json({ error: "Title, assignee_id, and assigner_id are required" });
    }
    
    try {
      const result = await db.run(
        "INSERT INTO tasks (title, description, assignee_id, assigner_id, project_id, deadline, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [title, description || null, assignee_id, assigner_id, project_id || null, deadline || null, priority || 'medium', 'pending']
      );
      
      const newTask = await db.get("SELECT * FROM tasks WHERE id = ?", [result.lastInsertRowid]);
      res.status(201).json(newTask);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    const { id } = req.params;
    const { title, description, assignee_id, deadline, priority, status } = req.body;
    
    try {
      // Get existing task to merge fields
      const existingTask = await db.get("SELECT * FROM tasks WHERE id = ?", [id]);
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      const result = await db.run(
        "UPDATE tasks SET title = ?, description = ?, assignee_id = ?, deadline = ?, priority = ?, status = ? WHERE id = ?",
        [
          title !== undefined ? title : existingTask.title,
          description !== undefined ? description : existingTask.description,
          assignee_id !== undefined ? assignee_id : existingTask.assignee_id,
          deadline !== undefined ? deadline : existingTask.deadline,
          priority !== undefined ? priority : existingTask.priority,
          status !== undefined ? status : existingTask.status,
          id
        ]
      );
      
      const updatedTask = await db.get("SELECT * FROM tasks WHERE id = ?", [id]);
      res.json(updatedTask);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.run("DELETE FROM tasks WHERE id = ?", [id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ message: "Task deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.delete("/api/logs", async (req, res) => {
    const { memberId } = req.query;
    if (!memberId) {
      return res.status(400).json({ error: "Member ID is required" });
    }
    try {
      await db.run("DELETE FROM logs WHERE member_id = ?", [memberId]);
      res.json({ message: "All logs for member deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete logs" });
    }
  });

  app.get("/api/status", async (req, res) => {
    const { memberId } = req.query;
    if (!memberId) {
      return res.status(400).json({ error: "Member ID is required" });
    }
    try {
      const lastLog = await db.get(
        "SELECT type FROM logs WHERE member_id = ? AND type IN ('in', 'out') ORDER BY timestamp DESC LIMIT 1",
        [memberId]
      );
      
      const status = lastLog?.type === 'in' ? 'working' : 'off';
      res.json({ status });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  // Backup Endpoint
  app.get("/api/admin/backup", async (req, res) => {
    try {
      const members = await db.query("SELECT * FROM members");
      const logs = await db.query("SELECT * FROM logs");
      const tasks = await db.query("SELECT * FROM tasks");
      res.json({
        timestamp: new Date().toISOString(),
        members,
        logs,
        tasks
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // Restore Endpoint
  app.post("/api/admin/restore", async (req, res) => {
    try {
      const { members, logs, tasks } = req.body;
      
      if (!Array.isArray(members) || !Array.isArray(logs)) {
        return res.status(400).json({ error: "Invalid backup format" });
      }

      // Clear existing data - Order matters due to Foreign Keys!
      // tasks references members, logs references members
      await db.run("DELETE FROM tasks"); 
      await db.run("DELETE FROM logs");
      await db.run("DELETE FROM members");

      // Restore members
      for (const m of members) {
        await db.run(
          "INSERT INTO members (id, name, role, email, password, avatar) VALUES (?, ?, ?, ?, ?, ?)",
          [m.id, m.name, m.role, m.email || null, m.password || null, m.avatar || null]
        );
      }

      // Restore logs
      for (const l of logs) {
        await db.run(
          "INSERT INTO logs (id, member_id, type, timestamp, date, note) VALUES (?, ?, ?, ?, ?, ?)",
          [l.id, l.member_id || l.memberId, l.type, l.timestamp, l.date, l.note || null]
        );
      }

      // Restore tasks (if available in backup)
      if (Array.isArray(tasks)) {
        for (const t of tasks) {
          await db.run(
            "INSERT INTO tasks (id, title, description, assignee_id, assigner_id, deadline, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [t.id, t.title, t.description || null, t.assignee_id, t.assigner_id, t.deadline || null, t.priority || 'medium', t.status || 'pending', t.created_at]
          );
        }
      }

      // Update sequence for Postgres if needed
      if (process.env.DATABASE_URL) {
        try {
          await db.run("SELECT setval('members_id_seq', (SELECT MAX(id) FROM members))");
          await db.run("SELECT setval('logs_id_seq', (SELECT MAX(id) FROM logs))");
          await db.run("SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks))");
        } catch (e) {
          console.error("Failed to update sequences:", e);
        }
      }

      res.json({ message: "Restore successful" });
    } catch (error: any) {
      console.error("Restore error:", error);
      res.status(500).json({ error: "Failed to restore backup: " + (error.message || String(error)) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
