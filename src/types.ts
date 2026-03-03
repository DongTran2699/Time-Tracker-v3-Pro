export interface Member {
  id: number;
  name: string;
  role: string;
  email?: string;
  password?: string;
  avatar?: string;
  hourly_rate?: number;
  currency?: string;
}

export interface WorkLog {
  id: number;
  memberId: number;
  type: 'in' | 'out' | 'note';
  timestamp: string;
  date: string;
  note?: string;
}

export type WorkStatus = 'working' | 'off';

export interface Project {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  assignee_id: number;
  assigner_id: number;
  project_id?: number;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}