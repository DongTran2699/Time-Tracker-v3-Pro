-- Initial Schema
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  password TEXT,
  avatar TEXT
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL, -- 'in' or 'out'
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  date TEXT NOT NULL, -- YYYY-MM-DD for easy grouping
  note TEXT,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

-- Seed Data (Optional, run if empty)
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
