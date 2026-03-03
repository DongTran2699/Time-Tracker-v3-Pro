import React, { useState, useEffect, useMemo } from 'react';
import { Clock, LogIn, LogOut, History, Calendar, CheckCircle2, Circle, Trash2, Archive, Activity, ChevronRight, ChevronDown, Users, User, Settings, X, Plus, Lock, Unlock, StickyNote, FileText, Edit2, QrCode, Smartphone, Upload, Moon, Sun, LayoutGrid, PieChart, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkLog, WorkStatus, Member, Task, Project } from './types';

type Tab = 'track' | 'members' | 'archive' | 'summary' | 'tasks' | 'dashboard';

export default function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<WorkStatus>('off');
  const [memberStatuses, setMemberStatuses] = useState<Record<number, WorkStatus>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('track');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<Member | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [summaryLogs, setSummaryLogs] = useState<WorkLog[]>([]);
  const [summaryDate, setSummaryDate] = useState(new Date());
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', role: '', email: '', password: '' });
  const [addForm, setAddForm] = useState({ name: '', role: '', email: '', password: '' });
  
  // Note Modal State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [pendingLogType, setPendingLogType] = useState<'in' | 'out' | 'note' | null>(null);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editingLogTime, setEditingLogTime] = useState<string>('');
  const [showQRModal, setShowQRModal] = useState(false);

  // Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignee_id: '', deadline: '', priority: 'medium', project_id: '' });
  const [taskSubTab, setTaskSubTab] = useState<'tasks' | 'notes'>('tasks');

  // Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const isOwner = (user: Member | null) => {
    if (!user) return false;
    const role = user.role?.trim().toLowerCase();
    return user.email === "dongtb@bimhanoi.com.vn" || role === 'owner' || role === 'quản trị viên' || role === 'admin';
  };

  // Helper to map API response to WorkLog type
  const mapLog = (log: any): WorkLog => ({
    ...log,
    memberId: Number(log.member_id || log.memberId),
    timestamp: log.timestamp || log.date // Fallback for old data
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim().toLowerCase();
    const user = members.find(m => m.email?.toLowerCase() === email);
    
    if (!user) {
      // If members list is empty, it might be a connection issue
      if (members.length === 0) {
        setLoginError('Không thể kết nối đến dữ liệu hệ thống. Vui lòng tải lại trang.');
        fetchInitialData(); // Try fetching again
        return;
      }
      setLoginError('Email không tồn tại trong hệ thống. Vui lòng liên hệ quản trị viên.');
      return;
    }

    const hasPassword = user.password && user.password.trim() !== '';
    const requiresPassword = isOwner(user) || hasPassword;

    // If it's the owner or they have a password, we need a password
    if (requiresPassword) {
      if (!showPasswordInput) {
        setShowPasswordInput(true);
        setLoginError('');
        return;
      }

      // Check against hardcoded password OR database password
      if (user.email === "dongtb@bimhanoi.com.vn" && loginPassword === "catalunia2699") {
        // Allow hardcoded fallback
      } else if (loginPassword !== user.password) {
        setLoginError('Mật khẩu không chính xác.');
        return;
      }
    }

    setLoggedInUser(user);
    setLoginError('');
    setShowPasswordInput(false);
    setLoginPassword('');
    // Auto-select the logged in user
    setSelectedMember(user);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setIsAdmin(false);
    setSelectedMember(null);
    setLoginEmail('');
    setLoginPassword('');
    setShowPasswordInput(false);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchInitialData();
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedMember) {
      fetchMemberData(selectedMember.id);
    }
  }, [selectedMember]);

  useEffect(() => {
    if (activeTab === 'summary' || activeTab === 'tasks') {
      fetchSummaryLogs();
    }
  }, [activeTab]);

  const fetchSummaryLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setSummaryLogs(Array.isArray(data) ? data.map(mapLog) : []);
    } catch (error) {
      console.error('Failed to fetch summary logs:', error);
    }
  };

  const fetchInitialData = async () => {
    try {
      const res = await fetch('/api/members');
      
      // Check if response is HTML (which means API is not running/found and falling back to index.html)
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error("API chưa được triển khai đúng (nhận được HTML thay vì JSON). Vui lòng kiểm tra lại thư mục 'functions' trên Git và đảm bảo D1 Database đã được bind.");
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text.substring(0, 100)}`);
      }
      const data = await res.json();
      setMembers(data);
      
      // Fetch statuses for all members for the members list
      const statusPromises = data.map((m: Member) => 
        fetch(`/api/status?memberId=${m.id}`).then(r => r.json().then(d => ({ id: m.id, status: d.status })))
      );
      const statuses = await Promise.all(statusPromises);
      const statusMap: Record<number, WorkStatus> = {};
      statuses.forEach(s => statusMap[s.id] = s.status);
      setMemberStatuses(statusMap);

      // Fetch tasks
      const tasksRes = await fetch('/api/tasks');
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }

      // Fetch projects
      const projectsRes = await fetch('/api/projects');
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }

    } catch (error: any) {
      console.error('Failed to fetch initial data:', error);
      setLoginError(`Lỗi kết nối: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberData = async (memberId: number) => {
    try {
      const [logsRes, statusRes] = await Promise.all([
        fetch(`/api/logs?memberId=${memberId}`),
        fetch(`/api/status?memberId=${memberId}`)
      ]);
      
      if (!logsRes.ok || !statusRes.ok) {
        throw new Error('Failed to fetch member data');
      }

      const logsData = await logsRes.json();
      const statusData = await statusRes.json();
      
      setLogs(Array.isArray(logsData) ? logsData.map(mapLog) : []);
      setStatus(statusData.status || 'off');
    } catch (error) {
      console.error('Failed to fetch member data:', error);
      setLogs([]);
      setStatus('off');
    }
  };

  const handleTrackClick = (type: 'in' | 'out') => {
    if (type === 'in') {
      setPendingLogType('in');
      setNoteContent('');
      setShowNoteModal(true);
    } else {
      handleTrack('out');
    }
  };

  const handleAddNoteClick = () => {
    setPendingLogType('note');
    setNoteContent('');
    setShowNoteModal(true);
  };

  const handleEditLog = (log: WorkLog) => {
    setEditingLogId(log.id);
    setNoteContent(log.note || '');
    setPendingLogType(log.type);
    
    let dateStr = log.timestamp;
    if (log.timestamp && !log.timestamp.endsWith('Z') && !log.timestamp.includes('+')) {
      dateStr = log.timestamp + 'Z';
    }
    const date = new Date(dateStr);
    const localDateStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setEditingLogTime(localDateStr);
    
    setShowNoteModal(true);
  };

  const confirmTrack = async () => {
    if (editingLogId) {
      // Update existing log
      try {
        const payload: any = { note: noteContent };
        if (editingLogTime) {
          const date = new Date(editingLogTime);
          payload.timestamp = date.toISOString();
        }

        const res = await fetch(`/api/logs/${editingLogId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error('Failed to update log');
        
        const updatedLog = await res.json();
        setLogs(prev => prev.map(l => l.id === editingLogId ? mapLog(updatedLog) : l));
        
        // Also update summary logs if needed
        setSummaryLogs(prev => prev.map(l => l.id === editingLogId ? mapLog(updatedLog) : l));
      } catch (error) {
        console.error('Failed to update log:', error);
        alert('Có lỗi xảy ra khi cập nhật.');
      }
      
      setShowNoteModal(false);
      setEditingLogId(null);
      setNoteContent('');
      setEditingLogTime('');
      setPendingLogType(null);
      return;
    }

    if (!pendingLogType) return;
    await handleTrack(pendingLogType, noteContent);
    setShowNoteModal(false);
    setPendingLogType(null);
    setNoteContent('');
  };

  const handleTrack = async (type: 'in' | 'out' | 'note', note?: string) => {
    const targetMemberId = selectedMember?.id || loggedInUser?.id;
    if (!targetMemberId) return;
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, memberId: targetMemberId, note })
      });
      const newLog = await res.json();
      setLogs([mapLog(newLog), ...logs]);
      setSummaryLogs([mapLog(newLog), ...summaryLogs]);
      
      if (type === 'in' || type === 'out') {
        const newStatus = type === 'in' ? 'working' : 'off';
        setStatus(newStatus);
        setMemberStatuses(prev => ({ ...prev, [targetMemberId]: newStatus }));
      }
    } catch (error) {
      console.error('Failed to track time:', error);
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!isOwner(loggedInUser)) {
      alert("Chỉ Owner mới có quyền xóa bản ghi.");
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
    try {
      const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa thất bại');
      
      setLogs(prevLogs => {
        const updatedLogs = prevLogs.filter(l => l.id !== id);
        // Update status based on the new latest log
        if (updatedLogs.length > 0) {
          setStatus(updatedLogs[0].type === 'in' ? 'working' : 'off');
        } else {
          setStatus('off');
        }
        return updatedLogs;
      });
    } catch (error) {
      console.error('Failed to delete log:', error);
      alert('Có lỗi xảy ra khi xóa bản ghi.');
    }
  };

  const handleClearHistory = async () => {
    if (!isOwner(loggedInUser)) {
      alert("Chỉ Owner mới có quyền xóa lịch sử.");
      return;
    }
    if (!selectedMember) return;
    if (!window.confirm(`BẠN CÓ CHẮC CHẮN muốn xóa TOÀN BỘ lịch sử của ${selectedMember.name}? Hành động này không thể hoàn tác.`)) return;
    try {
      const res = await fetch(`/api/logs?memberId=${selectedMember.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa toàn bộ thất bại');
      
      setLogs([]);
      setStatus('off');
      setMemberStatuses(prev => ({ ...prev, [selectedMember.id]: 'off' }));
    } catch (error) {
      console.error('Failed to clear history:', error);
      alert('Có lỗi xảy ra khi xóa lịch sử.');
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !isAdmin) return;

    try {
      const res = await fetch(`/api/members/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!res.ok) throw new Error('Cập nhật thất bại');

      const updatedMember = await res.json();
      setMembers(prev => prev.map(m => m.id === updatedMember.id ? { ...m, ...updatedMember } : m));
      if (selectedMember?.id === updatedMember.id) {
        setSelectedMember({ ...selectedMember, ...updatedMember });
      }
      setEditingMember(null);
    } catch (error) {
      console.error('Failed to update member:', error);
      alert('Có lỗi xảy ra khi cập nhật thông tin.');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });

      if (!res.ok) throw new Error('Thêm thành viên thất bại');

      const newMember = await res.json();
      setMembers(prev => [...prev, newMember]);
      setMemberStatuses(prev => ({ ...prev, [newMember.id]: 'off' }));
      setIsAddingMember(false);
      setAddForm({ name: '', role: '', email: '', password: '' });
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Có lỗi xảy ra khi thêm thành viên.');
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!isAdmin) return;
    if (!confirm('Bạn có chắc chắn muốn xóa thành viên này? Toàn bộ lịch sử công của họ cũng sẽ bị xóa.')) return;

    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa thất bại');

      setMembers(prev => prev.filter(m => m.id !== id));
      if (selectedMember?.id === id) setSelectedMember(null);
      setEditingMember(null);
    } catch (error) {
      console.error('Failed to delete member:', error);
      alert('Có lỗi xảy ra khi xóa thành viên.');
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const calculateTotalHours = React.useCallback((dayLogs: WorkLog[]) => {
    // Filter out notes and sort by timestamp
    const sortedLogs = [...dayLogs]
      .filter(log => log.type === 'in' || log.type === 'out')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
    let totalMs = 0;
    let lastIn: number | null = null;

    sortedLogs.forEach(log => {
      let dateStr = log.timestamp;
      if (log.timestamp && !log.timestamp.endsWith('Z') && !log.timestamp.includes('+')) {
        dateStr = log.timestamp + 'Z';
      }
      const logTime = new Date(dateStr).getTime();

      if (log.type === 'in') {
        // If we have a previous IN without an OUT, we ignore it and start fresh
        // This handles cases where someone forgot to clock out
        lastIn = logTime;
      } else if (log.type === 'out' && lastIn !== null) {
        totalMs += logTime - lastIn;
        lastIn = null;
      }
    });

    return totalMs / (1000 * 60 * 60);
  }, []);

  const formatDuration = React.useCallback((hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0 && m === 0) return '0h';
    if (h === 0) return `${m}p`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}p`;
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getLogTime = (timestamp: string) => {
    // If timestamp is missing timezone info (e.g. from Postgres TIMESTAMP without timezone), treat as UTC
    let dateStr = timestamp;
    if (timestamp && !timestamp.endsWith('Z') && !timestamp.includes('+')) {
      dateStr = timestamp + 'Z';
    }
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getLogDate = (timestamp: string) => {
    let dateStr = timestamp;
    if (timestamp && !timestamp.endsWith('Z') && !timestamp.includes('+')) {
      dateStr = timestamp + 'Z';
    }
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Group logs by Year -> Month -> Day
  const groupedLogs = useMemo(() => {
    const groups: Record<string, Record<string, Record<string, WorkLog[]>>> = {};
    
    if (!Array.isArray(logs)) return groups;

    // Sort logs chronologically
    const sortedLogs = [...logs]
      .filter(l => l.type !== 'note')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let lastInLog: WorkLog | null = null;

    sortedLogs.forEach(log => {
      let dateStr = log.timestamp;
      if (log.timestamp && !log.timestamp.endsWith('Z') && !log.timestamp.includes('+')) {
        dateStr = log.timestamp + 'Z';
      }
      let date = new Date(dateStr);

      // If this is an OUT log and we have a pending IN log, use the IN log's date
      if (log.type === 'out' && lastInLog) {
        let inDateStr = lastInLog.timestamp;
        if (lastInLog.timestamp && !lastInLog.timestamp.endsWith('Z') && !lastInLog.timestamp.includes('+')) {
          inDateStr = lastInLog.timestamp + 'Z';
        }
        date = new Date(inDateStr);
        lastInLog = null;
      } else if (log.type === 'in') {
        lastInLog = log;
      }

      const year = date.getFullYear().toString();
      const month = `Tháng ${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const day = `Ngày ${date.getDate().toString().padStart(2, '0')}`;

      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = {};
      if (!groups[year][month][day]) groups[year][month][day] = [];
      
      groups[year][month][day].push(log);
    });

    return groups;
  }, [logs]);

  // Group notes for tasks tab
  const groupedNotes = useMemo(() => {
    const groups: Record<string, Record<string, Record<string, WorkLog[]>>> = {};
    
    if (!Array.isArray(logs)) return groups;

    const notesToGroup = logs.filter(log => {
      // Only include logs with notes or type 'note'
      if (!log.note && log.type !== 'note') return false;
      return true;
    });

    notesToGroup.forEach(log => {
      let dateStr = log.timestamp;
      if (log.timestamp && !log.timestamp.endsWith('Z') && !log.timestamp.includes('+')) {
        dateStr = log.timestamp + 'Z';
      }
      const date = new Date(dateStr);
      const year = date.getFullYear().toString();
      const month = `Tháng ${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const day = `Ngày ${date.getDate().toString().padStart(2, '0')}`;

      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = {};
      if (!groups[year][month][day]) groups[year][month][day] = [];
      
      groups[year][month][day].push(log);
    });

    return groups;
  }, [logs]);

  const monthlySummary = useMemo(() => {
    const memberHours: Record<number, number> = {};
    const targetMonth = summaryDate.getMonth();
    const targetYear = summaryDate.getFullYear();

    // Group all logs by member first
    const allMemberLogs: Record<number, WorkLog[]> = {};
    summaryLogs.forEach(log => {
      if (!allMemberLogs[log.memberId]) allMemberLogs[log.memberId] = [];
      allMemberLogs[log.memberId].push(log);
    });

    // Process each member's logs
    Object.entries(allMemberLogs).forEach(([memberId, logs]) => {
      // Sort logs
      const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      const targetLogs: WorkLog[] = [];
      let lastInLog: WorkLog | null = null;

      sortedLogs.forEach(log => {
        let dateStr = log.timestamp;
        if (log.timestamp && !log.timestamp.endsWith('Z') && !log.timestamp.includes('+')) {
          dateStr = log.timestamp + 'Z';
        }
        let date = new Date(dateStr);

        // Apply effective date logic
        if (log.type === 'out' && lastInLog) {
            let inDateStr = lastInLog.timestamp;
            if (lastInLog.timestamp && !lastInLog.timestamp.endsWith('Z') && !lastInLog.timestamp.includes('+')) {
                inDateStr = lastInLog.timestamp + 'Z';
            }
            date = new Date(inDateStr);
            lastInLog = null;
        } else if (log.type === 'in') {
            lastInLog = log;
        }

        // Check if effective date is in target month
        if (date.getMonth() === targetMonth && date.getFullYear() === targetYear) {
            targetLogs.push(log);
        }
      });

      memberHours[Number(memberId)] = calculateTotalHours(targetLogs);
    });

    return memberHours;
  }, [summaryLogs, summaryDate, calculateTotalHours]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExportExcel = () => {
    if (!isOwner(loggedInUser)) return;

    const summaryMembers = members.filter(m => isOwner(loggedInUser) || m.email?.toLowerCase() === loggedInUser?.email?.toLowerCase());
    const targetMonth = summaryDate.getMonth();
    const targetYear = summaryDate.getFullYear();

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += 'Họ và tên,Chức danh,Email,Tổng giờ công,Số ngày đi làm\n';

    summaryMembers.forEach(member => {
      const memberLogs = summaryLogs.filter(log => {
        if (log.memberId !== member.id) return false;
        let dateStr = log.timestamp;
        if (log.timestamp && !log.timestamp.endsWith('Z') && !log.timestamp.includes('+')) {
          dateStr = log.timestamp + 'Z';
        }
        const date = new Date(dateStr);
        return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
      });

      const uniqueDates = new Set(memberLogs.map(l => l.date));
      const daysWorked = uniqueDates.size;
      
      const name = `"${member.name.replace(/"/g, '""')}"`;
      const role = `"${member.role.replace(/"/g, '""')}"`;
      const email = `"${(member.email || '').replace(/"/g, '""')}"`;
      const hours = `"${formatDuration(monthlySummary[member.id] || 0)}"`;
      const days = `"${daysWorked}"`;
      
      csvContent += `${name},${role},${email},${hours},${days}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const monthStr = summaryDate.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }).replace('/', '-');
    link.setAttribute('download', `Bao_Cao_Cham_Cong_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReload = async () => {
    setLoading(true);
    await fetchInitialData();
    if (selectedMember) {
      await fetchMemberData(selectedMember.id);
    }
    if (activeTab === 'summary' || activeTab === 'tasks') {
      await fetchSummaryLogs();
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] dark:bg-gray-950 flex items-center justify-center transition-colors duration-300">
        <div className="animate-pulse text-gray-400 dark:text-gray-500 font-medium tracking-widest uppercase text-xs">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] p-12 shadow-2xl shadow-black/5 dark:shadow-black/50 border border-black/5 dark:border-white/5"
        >
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-black dark:bg-white rounded-3xl flex items-center justify-center text-white dark:text-black mx-auto mb-6 shadow-xl shadow-black/20 dark:shadow-white/10">
              <Clock size={40} />
            </div>
            <h1 className="text-4xl font-light tracking-tighter mb-2 dark:text-white">WorkTime</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em]">Hệ thống quản lý công</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 ml-1">Email thành viên</label>
              <div className="relative">
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setShowPasswordInput(false);
                    setLoginError('');
                  }}
                  placeholder="VD: dongtb@bimhanoi.com.vn"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-2xl px-6 py-4 text-sm transition-all outline-none pl-12 dark:text-white dark:placeholder-gray-500"
                  required
                  disabled={showPasswordInput}
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-500" size={18} />
                {showPasswordInput && (
                  <button 
                    type="button"
                    onClick={() => setShowPasswordInput(false)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase"
                  >
                    Thay đổi
                  </button>
                )}
              </div>
            </div>

            {showPasswordInput && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 ml-1">Mật khẩu</label>
                <div className="relative">
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-2xl px-6 py-4 text-sm transition-all outline-none pl-12 dark:text-white dark:placeholder-gray-500"
                    required
                    autoFocus
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-500" size={18} />
                </div>
              </motion.div>
            )}

            {loginError && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider text-center"
              >
                {loginError}
              </motion.p>
            )}

            <button
              type="submit"
              className="w-full bg-black dark:bg-white text-white dark:text-black py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 dark:shadow-white/10 flex items-center justify-center gap-3"
            >
              Tiếp tục <ChevronRight size={16} />
            </button>
          </form>

          <p className="mt-10 text-center text-[10px] text-gray-300 dark:text-gray-600 font-medium leading-relaxed">
            Vui lòng sử dụng email đã được đăng ký<br />để truy cập vào hệ thống.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-gray-950 text-[#1A1A1A] dark:text-gray-100 font-sans p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12 flex flex-col gap-8">
          {/* Top Section */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            {/* User Info Box */}
            <div className="flex flex-col w-full md:w-auto">
              <div className="bg-white dark:bg-gray-900 px-6 py-4 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 w-full md:min-w-[220px]">
                <p className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-100 leading-tight">{loggedInUser?.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1 leading-tight">{loggedInUser?.role}</p>
                <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1 leading-tight">{loggedInUser?.email}</p>
                <button 
                  onClick={handleLogout}
                  className="text-[9px] text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 font-black uppercase tracking-widest transition-colors mt-4 block border-t border-gray-50 dark:border-white/5 pt-3 w-full text-left"
                >
                  Đăng xuất
                </button>
              </div>
            </div>

            {/* Mode and Clock */}
            <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleReload}
                  className="flex items-center justify-center p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Tải lại dữ liệu"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="flex items-center justify-center p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/50 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                  title="Quét mã QR để dùng trên điện thoại"
                >
                  <QrCode size={12} /> App Mobile
                </button>
                {isOwner(loggedInUser) && (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/admin/backup');
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `worktime-backup-${new Date().toISOString().split('T')[0]}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        } catch (error) {
                          alert('Sao lưu thất bại');
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      title="Tải về dữ liệu backup"
                    >
                      <Archive size={12} /> Sao lưu
                    </button>
                    <label
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800/50 hover:bg-orange-100 dark:hover:bg-orange-900/50 cursor-pointer"
                      title="Phục hồi dữ liệu từ file backup"
                    >
                      <Upload size={12} /> Phục hồi
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          if (!confirm('CẢNH BÁO: Phục hồi sẽ XÓA TOÀN BỘ dữ liệu hiện tại và thay thế bằng dữ liệu trong file. Bạn có chắc chắn?')) {
                            e.target.value = '';
                            return;
                          }

                          try {
                            const text = await file.text();
                            const data = JSON.parse(text);
                            
                            const res = await fetch('/api/admin/restore', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(data)
                            });
                            
                            if (!res.ok) {
                              const errorData = await res.json();
                              throw new Error(errorData.error || 'Restore failed');
                            }
                            
                            alert('Phục hồi dữ liệu thành công! Trang sẽ được tải lại.');
                            window.location.reload();
                          } catch (error: any) {
                            console.error(error);
                            alert(`Phục hồi thất bại: ${error.message}`);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </>
                )}
                <button 
                  onClick={() => {
                    if (isOwner(loggedInUser)) {
                      setIsAdmin(!isAdmin);
                    } else {
                      alert("Chỉ tài khoản Owner mới có quyền truy cập chế độ Owner.");
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    isAdmin ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {isAdmin ? <Unlock size={12} /> : <Lock size={12} />}
                  {isAdmin ? 'Chế độ Owner' : 'Chế độ Nhân viên'}
                </button>
              </div>
              <div className="text-5xl md:text-7xl font-mono font-light tracking-tighter text-gray-900 dark:text-gray-100 leading-none">
                {formatTime(currentTime)}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              {selectedMember && activeTab !== 'members' ? (
                <div className="mb-3">
                  <h1 className="text-3xl md:text-4xl font-light tracking-tighter dark:text-white">{selectedMember.name}</h1>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-[0.2em] mt-1">{selectedMember.role}</p>
                </div>
              ) : (
                <h1 className="text-5xl md:text-7xl font-light tracking-tighter mb-3 dark:text-white">WorkTime</h1>
              )}
              <p className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                <Calendar size={12} className="opacity-50" />
                {formatDate(currentTime)}
              </p>
            </div>

            <div className="flex justify-end">
              <div className="flex bg-white dark:bg-gray-900 p-1 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    activeTab === 'dashboard' ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/10' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white'
                  }`}
                  title="Dashboard"
                >
                  <LayoutGrid size={16} /> <span className={`${activeTab === 'dashboard' ? 'inline' : 'hidden'} md:inline`}>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('track')}
                  className={`px-3 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    activeTab === 'track' ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/10' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white'
                  }`}
                  title="Chấm công"
                >
                  <Clock size={16} /> <span className={`${activeTab === 'track' ? 'inline' : 'hidden'} md:inline`}>Chấm công</span>
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`px-3 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    activeTab === 'tasks' ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/10' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white'
                  }`}
                  title="Giao việc"
                >
                  <FileText size={16} /> <span className={`${activeTab === 'tasks' ? 'inline' : 'hidden'} md:inline`}>Giao việc</span>
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`px-3 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    activeTab === 'members' ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/10' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white'
                  }`}
                  title="Thành viên"
                >
                  <Users size={16} /> <span className={`${activeTab === 'members' ? 'inline' : 'hidden'} md:inline`}>Thành viên</span>
                </button>
                
                <div className="relative z-50">
                  <button
                    onClick={() => setShowReportMenu(!showReportMenu)}
                    className={`px-3 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                      ['summary', 'archive'].includes(activeTab) ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/10' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white'
                    }`}
                    title="Báo cáo"
                  >
                    <PieChart size={16} /> <span className={`${['summary', 'archive'].includes(activeTab) ? 'inline' : 'hidden'} md:inline`}>Báo cáo</span> <ChevronDown size={12} />
                  </button>
                  
                  <AnimatePresence>
                    {showReportMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowReportMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-black/5 dark:border-white/5 overflow-hidden z-50"
                        >
                          <button
                            onClick={() => {
                              setActiveTab('summary');
                              setShowReportMenu(false);
                            }}
                            className={`w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                              activeTab === 'summary' ? 'text-emerald-500' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            <History size={14} /> Tổng hợp công
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('archive');
                              setShowReportMenu(false);
                            }}
                            className={`w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                              activeTab === 'archive' ? 'text-emerald-500' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            <Archive size={14} /> Lịch sử chi tiết
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'members' ? (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {isAdmin && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsAddingMember(true)}
                    className="bg-black text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-black/10"
                  >
                    <Plus size={16} /> Thêm thành viên
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => {
                    if (isOwner(loggedInUser) || member.email?.toLowerCase() === loggedInUser?.email?.toLowerCase()) {
                      setSelectedMember(member);
                      setActiveTab('track');
                    } else {
                      alert("Bạn chỉ có quyền truy cập vào hồ sơ của mình.");
                    }
                  }}
                  className={`bg-white dark:bg-gray-900 p-3 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 transition-all text-left group relative overflow-hidden flex items-center gap-3 ${
                    (isOwner(loggedInUser) || member.email?.toLowerCase() === loggedInUser?.email?.toLowerCase())
                      ? 'hover:shadow-md cursor-pointer hover:border-black/10 dark:hover:border-white/10'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (isOwner(loggedInUser) || member.email?.toLowerCase() === loggedInUser?.email?.toLowerCase()) {
                        setSelectedMember(member);
                        setActiveTab('track');
                      }
                    }
                  }}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                      <User size={18} />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${memberStatuses[member.id] === 'working' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate pr-2">{member.name}</h3>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMember(member);
                            setEditForm({ 
                              name: member.name, 
                              role: member.role, 
                              email: member.email || '',
                              password: member.password || ''
                            });
                          }}
                          className="p-1 text-gray-300 hover:text-black dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                          title="Chỉnh sửa"
                        >
                          <Settings size={12} />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{member.role}</p>
                  </div>
                </div>
              ))}
              </div>
            </motion.div>
          ) : activeTab === 'tasks' ? (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex bg-white dark:bg-gray-900 p-1 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
                  <button
                    onClick={() => setTaskSubTab('tasks')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      taskSubTab === 'tasks' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Giao việc
                  </button>
                  <button
                    onClick={() => setTaskSubTab('notes')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      taskSubTab === 'notes' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Ghi chú
                  </button>
                </div>
                
                {taskSubTab === 'notes' ? (
                  <button
                    onClick={handleAddNoteClick}
                    className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-black/10 dark:shadow-white/10"
                  >
                    <Plus size={14} /> Thêm ghi chú
                  </button>
                ) : (
                  isOwner(loggedInUser) && (
                    <button
                      onClick={() => {
                        setEditingTask(null);
                        setTaskForm({ title: '', description: '', assignee_id: '', deadline: '', priority: 'medium', project_id: '' });
                        setShowTaskModal(true);
                      }}
                      className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-black/10 dark:shadow-white/10"
                    >
                      <Plus size={14} /> Giao việc mới
                    </button>
                  )
                )}
              </div>

              {taskSubTab === 'tasks' ? (
                <div className="space-y-4">
                  {tasks.filter(t => isOwner(loggedInUser) || t.assignee_id === loggedInUser?.id).length === 0 ? (
                    <div className="text-center py-20 text-gray-400 dark:text-gray-600">
                      <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">Chưa có công việc nào được giao</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tasks
                        .filter(t => isOwner(loggedInUser) || t.assignee_id === loggedInUser?.id)
                        .map(task => {
                          const assignee = members.find(m => m.id === task.assignee_id);
                          const assigner = members.find(m => m.id === task.assigner_id);
                          
                          return (
                            <div key={task.id} className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col h-full relative group">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col gap-2 items-start">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                    task.priority === 'high' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' :
                                    task.priority === 'medium' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                                    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                  }`}>
                                    Ưu tiên: {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'TB' : 'Thấp'}
                                  </span>
                                  {task.project_id && (
                                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md truncate max-w-[150px]">
                                      {projects.find(p => p.id === task.project_id)?.name}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                  task.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                  task.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                  'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                }`}>
                                  {task.status === 'completed' ? 'Hoàn thành' : task.status === 'in_progress' ? 'Đang làm' : 'Chờ xử lý'}
                                </span>
                              </div>
                              
                              <h3 className="text-lg font-bold mb-2 dark:text-white">{task.title}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1 whitespace-pre-wrap">{task.description}</p>
                              
                              <div className="space-y-2 mt-auto pt-4 border-t border-gray-50 dark:border-gray-800">
                                <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                                  <span>Người nhận:</span>
                                  <span className="text-gray-900 dark:text-gray-100">{assignee?.name || 'Unknown'}</span>
                                </div>
                                {task.deadline && (
                                  <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                                    <span>Hạn chót:</span>
                                    <span className={new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'text-rose-500 dark:text-rose-400' : 'text-gray-900 dark:text-gray-100'}>
                                      {new Date(task.deadline).toLocaleString('vi-VN')}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isOwner(loggedInUser) && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingTask(task);
                                        setTaskForm({
                                          title: task.title,
                                          description: task.description || '',
                                          assignee_id: task.assignee_id.toString(),
                                          deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
                                          priority: task.priority,
                                          project_id: task.project_id ? String(task.project_id) : ''
                                        });
                                        setShowTaskModal(true);
                                      }}
                                      className="p-1.5 bg-white dark:bg-gray-800 text-blue-500 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-sm border border-gray-100 dark:border-gray-700"
                                      title="Sửa công việc"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (confirm('Bạn có chắc muốn xóa công việc này?')) {
                                          try {
                                            const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
                                            if (res.ok) {
                                              setTasks(prev => prev.filter(t => t.id !== task.id));
                                            }
                                          } catch (e) {
                                            console.error(e);
                                          }
                                        }
                                      }}
                                      className="p-1.5 bg-white dark:bg-gray-800 text-rose-500 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 shadow-sm border border-gray-100 dark:border-gray-700"
                                      title="Xóa công việc"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Status update buttons for assignee */}
                              {(loggedInUser?.id === task.assignee_id || isOwner(loggedInUser)) && task.status !== 'completed' && (
                                <div className="mt-4 flex gap-2">
                                  {task.status === 'pending' && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`/api/tasks/${task.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ status: 'in_progress' })
                                          });
                                          if (res.ok) {
                                            const updated = await res.json();
                                            setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
                                          }
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }}
                                      className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                    >
                                      Bắt đầu làm
                                    </button>
                                  )}
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/tasks/${task.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ status: 'completed' })
                                        });
                                        if (res.ok) {
                                          const updated = await res.json();
                                          setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
                                        }
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }}
                                    className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                  >
                                    Hoàn thành
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {Object.entries(groupedNotes).map(([year, months]) => (
                    <div key={year} className="space-y-8">
                      {Object.entries(months).map(([month, days]) => (
                        <div key={month} className="space-y-6">
                          {Object.entries(days).map(([day, dayLogs]) => {
                            const notes = dayLogs as WorkLog[];
                            if (notes.length === 0) return null;

                            return (
                              <div key={day} className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/5">
                                <h3 className="text-lg font-medium mb-4 flex items-center gap-2 dark:text-white">
                                  <Calendar size={16} className="text-gray-400 dark:text-gray-500" />
                                  {day}, {month}, {year}
                                </h3>
                                <div className="space-y-3">
                                  {notes.map(log => (
                                    <div key={log.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 relative group">
                                      <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                          log.type === 'in' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                                          log.type === 'out' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 
                                          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                        }`}>
                                          {log.type === 'in' ? 'Vào làm' : log.type === 'out' ? 'Tan ca' : 'Ghi chú'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                            {members.find(m => m.id === log.memberId)?.name || 'Unknown'}
                                          </span>
                                          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{getLogTime(log.timestamp)}</span>
                                        </div>
                                      </div>
                                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{log.note}</p>
                                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {(isOwner(loggedInUser) || loggedInUser?.id === log.memberId) && (
                                          <button
                                            onClick={() => handleEditLog(log)}
                                            className="p-1.5 bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-sm"
                                            title="Sửa ghi chú"
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                        )}
                                        {isAdmin && (
                                          <button
                                            onClick={() => handleDeleteLog(log.id)}
                                            className="p-1.5 bg-white dark:bg-gray-700 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 shadow-sm"
                                            title="Xóa ghi chú"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  {Object.keys(groupedNotes).length === 0 && (
                    <div className="text-center py-20 text-gray-400 dark:text-gray-600">
                      <FileText size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">Chưa có ghi chú nào</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ) : activeTab === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {selectedProject ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedProject(null)}
                      className="p-2 bg-white dark:bg-gray-800 rounded-xl hover:scale-105 transition-transform shadow-sm border border-black/5 dark:border-white/5"
                    >
                      <ChevronDown size={20} className="rotate-90" />
                    </button>
                    <div>
                      <h2 className="text-2xl font-light dark:text-white">{selectedProject.name}</h2>
                      {selectedProject.description && <p className="text-sm text-gray-500 dark:text-gray-400">{selectedProject.description}</p>}
                    </div>
                    <div className="ml-auto flex gap-2">
                       {isOwner(loggedInUser) && (
                        <>
                          <button
                            onClick={() => {
                              setEditingTask(null);
                              setTaskForm({ 
                                title: '', 
                                description: '', 
                                assignee_id: '', 
                                deadline: '', 
                                priority: 'medium', 
                                project_id: selectedProject.id === -1 ? '' : String(selectedProject.id) 
                              });
                              setShowTaskModal(true);
                            }}
                            className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-black/10 dark:shadow-white/10"
                          >
                            <Plus size={14} /> Thêm việc
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Bạn có chắc chắn muốn xóa dự án này? Các công việc liên quan sẽ bị xóa.')) {
                                try {
                                  const res = await fetch(`/api/projects/${selectedProject.id}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
                                    setTasks(prev => prev.filter(t => t.project_id !== selectedProject.id));
                                    setSelectedProject(null);
                                  } else {
                                    const data = await res.json();
                                    alert(data.error || 'Failed to delete project');
                                  }
                                } catch (e) {
                                  console.error(e);
                                  alert('Failed to delete project');
                                }
                              }
                            }}
                            className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                          >
                            <Trash2 size={14} /> Xóa dự án
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(selectedProject.id === -1 
                      ? tasks.filter(t => !t.project_id) 
                      : tasks.filter(t => t.project_id === selectedProject.id)
                    ).length > 0 ? (
                      (selectedProject.id === -1 
                        ? tasks.filter(t => !t.project_id) 
                        : tasks.filter(t => t.project_id === selectedProject.id)
                      ).map(task => {
                        const assignee = members.find(m => m.id === task.assignee_id);
                        return (
                          <div key={task.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                task.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                task.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                              }`}>
                                {task.status === 'completed' ? 'Hoàn thành' : task.status === 'in_progress' ? 'Đang làm' : 'Chờ'}
                              </span>
                              {isOwner(loggedInUser) && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingTask(task);
                                      setTaskForm({
                                        title: task.title,
                                        description: task.description || '',
                                        assignee_id: String(task.assignee_id),
                                        deadline: task.deadline || '',
                                        priority: task.priority,
                                        project_id: task.project_id ? String(task.project_id) : ''
                                      });
                                      setShowTaskModal(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Xóa công việc này?')) {
                                        fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }).then(res => {
                                          if (res.ok) setTasks(prev => prev.filter(t => t.id !== task.id));
                                        });
                                      }
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                            <h5 className="font-bold text-sm dark:text-white mb-2 line-clamp-2">{task.title}</h5>
                            {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>}
                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                  {assignee?.name.charAt(0)}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{assignee?.name}</span>
                              </div>
                              {task.deadline && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                  {new Date(task.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        <FileText size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Chưa có công việc nào</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Stats Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-1">Tổng số dự án</p>
                      <p className="text-2xl font-light dark:text-white">{projects.length}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-1">Tổng số công việc</p>
                      <p className="text-2xl font-light dark:text-white">{tasks.length}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-1">Công việc hoàn thành</p>
                      <p className="text-2xl font-light dark:text-white">{tasks.filter(t => t.status === 'completed').length}</p>
                    </div>
                  </div>

                  {/* Projects List */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-light dark:text-white">Dự án</h2>
                      <div className="flex gap-3">
                        {isOwner(loggedInUser) && (
                          <>
                            <button
                              onClick={() => {
                                setEditingTask(null);
                                setTaskForm({ title: '', description: '', assignee_id: '', deadline: '', priority: 'medium', project_id: '' });
                                setShowTaskModal(true);
                              }}
                              className="bg-white dark:bg-gray-800 text-black dark:text-white border border-black/10 dark:border-white/10 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform shadow-sm"
                            >
                              <Plus size={14} /> Giao việc
                            </button>
                            <button
                              onClick={() => {
                                setProjectForm({ name: '', description: '' });
                                setShowProjectModal(true);
                              }}
                              className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-black/10 dark:shadow-white/10"
                            >
                              <Plus size={14} /> Tạo dự án
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {projects.length === 0 && tasks.filter(t => !t.project_id).length === 0 ? (
                      <div className="text-center py-20 text-gray-400 dark:text-gray-600">
                        <Activity size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium">Chưa có dự án nào</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* General Project Card */}
                        {tasks.filter(t => !t.project_id).length > 0 && (() => {
                          const generalTasks = tasks.filter(t => !t.project_id);
                          const completedTasks = generalTasks.filter(t => t.status === 'completed').length;
                          const progress = generalTasks.length > 0 ? (completedTasks / generalTasks.length) * 100 : 0;
                          
                          return (
                            <div 
                              key="general" 
                              onClick={() => setSelectedProject({ id: -1, name: 'General', created_at: new Date().toISOString(), description: 'Công việc chung' })}
                              className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-black/5 dark:border-white/5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all group"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="text-base font-bold dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">General</h3>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">Công việc chung</p>
                                </div>
                                <div className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-500 transition-colors">
                                  <ChevronRight size={14} />
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                                  <span>Tiến độ</span>
                                  <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                                <span>{generalTasks.length} công việc</span>
                                <span>{completedTasks} hoàn thành</span>
                              </div>
                            </div>
                          );
                        })()}

                        {projects.map(project => {
                          const projectTasks = tasks.filter(t => t.project_id === project.id);
                          const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
                          const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;

                          return (
                            <div 
                              key={project.id} 
                              onClick={() => setSelectedProject(project)}
                              className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-black/5 dark:border-white/5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all group"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="text-base font-bold dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{project.name}</h3>
                                  {project.description && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{project.description}</p>}
                                </div>
                                <div className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-500 transition-colors">
                                  <ChevronRight size={14} />
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                                  <span>Tiến độ</span>
                                  <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                                <span>{projectTasks.length} công việc</span>
                                <span>{completedTasks} hoàn thành</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          ) : activeTab === 'track' ? (
            <motion.div
              key="track"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {!selectedMember ? (
                <div className="md:col-span-3 bg-white dark:bg-gray-900 rounded-[2rem] p-20 text-center border border-dashed border-gray-200 dark:border-gray-800">
                  <Users size={48} className="mx-auto mb-6 text-gray-200 dark:text-gray-700" />
                  <h2 className="text-xl font-light mb-4 dark:text-white">Vui lòng chọn thành viên để chấm công</h2>
                  <button 
                    onClick={() => setActiveTab('members')}
                    className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                  >
                    Xem danh sách thành viên
                  </button>
                </div>
              ) : (
                <>
                  <div className="md:col-span-2 space-y-8">
                    <section className="bg-white dark:bg-gray-900 rounded-[2rem] p-10 shadow-sm border border-black/5 dark:border-white/5 relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-12">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
                              <User size={24} />
                            </div>
                            <div>
                              <h2 className="text-2xl font-light dark:text-white">{selectedMember.name}</h2>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">{selectedMember.role}</p>
                              {selectedMember.email && <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">{selectedMember.email}</p>}
                            </div>
                          </div>
                          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] ${
                            status === 'working' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${status === 'working' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            {status === 'working' ? 'Đang làm việc' : 'Đã tan ca'}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <button
                            onClick={() => handleTrackClick('in')}
                            disabled={status === 'working'}
                            className={`group flex flex-col items-center justify-center p-8 md:p-12 rounded-3xl transition-all duration-500 border ${
                              status === 'working' 
                                ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-200 dark:text-gray-700 border-transparent cursor-not-allowed' 
                                : 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white hover:border-emerald-600 dark:hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20 active:scale-95'
                            }`}
                          >
                            <LogIn size={40} className="mb-4 transition-transform group-hover:scale-110" />
                            <span className="font-black uppercase tracking-[0.2em] text-[10px]">Vào làm</span>
                          </button>

                          <button
                            onClick={() => handleTrackClick('out')}
                            disabled={status === 'off'}
                            className={`group flex flex-col items-center justify-center p-8 md:p-12 rounded-3xl transition-all duration-500 border ${
                              status === 'off' 
                                ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-200 dark:text-gray-700 border-transparent cursor-not-allowed' 
                                : 'bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/50 hover:bg-rose-600 dark:hover:bg-rose-500 hover:text-white hover:border-rose-600 dark:hover:border-rose-500 hover:shadow-xl hover:shadow-rose-100 dark:hover:shadow-rose-900/20 active:scale-95'
                            }`}
                          >
                            <LogOut size={40} className="mb-4 transition-transform group-hover:scale-110" />
                            <span className="font-black uppercase tracking-[0.2em] text-[10px]">Tan ca</span>
                          </button>
                        </div>
                      </div>
                      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-50 dark:bg-emerald-900/20 rounded-full blur-[100px] opacity-40 pointer-events-none" />
                    </section>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm">
                        <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Hôm nay</p>
                        <p className="text-4xl font-light dark:text-white">
                          {logs.filter(l => l.date === currentTime.toISOString().split('T')[0]).length} 
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 font-bold uppercase tracking-widest">Lượt</span>
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm flex flex-col justify-between">
                        <div>
                          <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Hành động</p>
                          {isOwner(loggedInUser) ? (
                            <button 
                              onClick={handleClearHistory}
                              className="text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
                            >
                              <Trash2 size={14} /> Xóa lịch sử
                            </button>
                          ) : (
                            <p className="text-[10px] text-gray-300 dark:text-gray-600 italic">Không có hành động khả dụng</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-sm border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-6">
                        <CheckCircle2 size={16} />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Nhắc nhở công việc</h2>
                      </div>
                      <div className="space-y-4">
                        {tasks.filter(t => t.assignee_id === selectedMember.id && t.status !== 'completed').length === 0 ? (
                          <div className="text-center py-8 text-gray-300 dark:text-gray-600">
                            <p className="text-[10px] font-black uppercase tracking-widest">Không có công việc nào</p>
                          </div>
                        ) : (
                          tasks.filter(t => t.assignee_id === selectedMember.id && t.status !== 'completed').map(task => (
                            <div key={task.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{task.title}</h3>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                  task.priority === 'high' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' :
                                  task.priority === 'medium' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                                  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                }`}>
                                  {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'TB' : 'Thấp'}
                                </span>
                              </div>
                              {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{task.description}</p>}
                              <div className="flex justify-between items-center mt-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                  task.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}>
                                  {task.status === 'in_progress' ? 'Đang làm' : 'Chờ xử lý'}
                                </span>
                                {task.deadline && (
                                  <span className={`text-[9px] font-bold uppercase tracking-widest ${new Date(task.deadline) < new Date() ? 'text-rose-500 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    Hạn: {new Date(task.deadline).toLocaleString('vi-VN')}
                                  </span>
                                )}
                              </div>
                              {(loggedInUser?.id === task.assignee_id || isOwner(loggedInUser)) && (
                                <div className="flex gap-2 mt-2">
                                  {task.status === 'pending' && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                                      className="flex-1 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                    >
                                      Nhận việc
                                    </button>
                                  )}
                                  {task.status === 'in_progress' && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                      className="flex-1 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                    >
                                      Hoàn thành
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <section className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-sm border border-black/5 dark:border-white/5 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                          <History size={16} />
                          <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Gần đây</h2>
                        </div>
                      </div>

                      <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <AnimatePresence initial={false}>
                          {logs.filter(l => l.type !== 'note').slice(0, 10).map((log) => (
                            <motion.div
                              key={log.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="group flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-1.5 h-1.5 rounded-full ${log.type === 'in' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wider dark:text-gray-200">{log.type === 'in' ? 'Vào làm' : 'Tan ca'}</p>
                                  <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold">{getLogDate(log.timestamp)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <p className="font-mono text-xs text-gray-600 dark:text-gray-400">{getLogTime(log.timestamp)}</p>
                                {isOwner(loggedInUser) && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                      onClick={() => handleEditLog(log)}
                                      className="text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 p-2 -m-2"
                                      title="Sửa bản ghi"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteLog(log.id)}
                                      className="text-gray-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 p-2 -m-2 ml-2"
                                      title="Xóa bản ghi"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {logs.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-20 text-gray-300 dark:text-gray-600">
                            <Activity size={32} className="mb-4 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Trống</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </>
              )}
            </motion.div>
          ) : activeTab === 'summary' ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-gray-900 rounded-[2rem] p-10 shadow-sm border border-black/5 dark:border-white/5"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                  <h2 className="text-2xl font-light dark:text-white">Tổng hợp công tháng</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-1">
                    {isOwner(loggedInUser) 
                      ? "Thống kê giờ làm việc của tất cả thành viên" 
                      : "Thống kê giờ làm việc của bạn"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {isOwner(loggedInUser) && (
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors mr-2"
                    >
                      <FileText size={14} /> Xuất Excel
                    </button>
                  )}
                  <button 
                    onClick={() => setSummaryDate(new Date(summaryDate.setMonth(summaryDate.getMonth() - 1)))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400"
                  >
                    <ChevronRight size={20} className="rotate-180" />
                  </button>
                  <span className="text-sm font-bold uppercase tracking-widest dark:text-white">
                    {summaryDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={() => setSummaryDate(new Date(summaryDate.setMonth(summaryDate.getMonth() + 1)))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Thành viên</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Chức danh</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 text-center">Số ngày đi làm</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 text-right">Tổng giờ công</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {members
                      .filter(m => isOwner(loggedInUser) || m.email?.toLowerCase() === loggedInUser?.email?.toLowerCase())
                      .map(member => {
                        const memberLogs = summaryLogs.filter(log => {
                          if (log.memberId !== member.id) return false;
                          let dateStr = log.timestamp;
                          if (log.timestamp && !log.timestamp.endsWith('Z') && !log.timestamp.includes('+')) {
                            dateStr = log.timestamp + 'Z';
                          }
                          const date = new Date(dateStr);
                          return date.getMonth() === summaryDate.getMonth() && date.getFullYear() === summaryDate.getFullYear();
                        });
                        const uniqueDates = new Set(memberLogs.map(l => l.date));
                        const daysWorked = uniqueDates.size;

                        return (
                          <tr key={member.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                  <User size={16} />
                                </div>
                                <span className="text-sm font-bold dark:text-white">{member.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                              {member.role}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-mono font-bold text-gray-600 dark:text-gray-300">
                                {daysWorked}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`text-sm font-mono font-bold ${monthlySummary[member.id] > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'}`}>
                                {formatDuration(monthlySummary[member.id] || 0)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="archive"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-gray-900 rounded-[2rem] p-10 shadow-sm border border-black/5 dark:border-white/5"
            >
              {!selectedMember ? (
                <div className="py-20 text-center text-gray-300 dark:text-gray-600">
                  <Users size={48} className="mx-auto mb-6 opacity-20" />
                  <h2 className="text-xl font-light mb-4 dark:text-white">Vui lòng chọn thành viên để xem kho lưu trữ</h2>
                  <button 
                    onClick={() => setActiveTab('members')}
                    className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                  >
                    Xem danh sách thành viên
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h2 className="text-2xl font-light dark:text-white">Kho lưu trữ: {selectedMember.name}</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-1">
                        Tổng cộng {logs.length} bản ghi
                      </p>
                    </div>
                    {isOwner(loggedInUser) && (
                      <button 
                        onClick={() => setSelectedMember(null)}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                      >
                        Đổi thành viên
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {Object.entries(groupedLogs).length === 0 ? (
                      <div className="py-20 text-center text-gray-300 dark:text-gray-600">
                        <Archive size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Chưa có dữ liệu lưu trữ</p>
                      </div>
                    ) : (
                      Object.entries(groupedLogs).map(([year, months]) => (
                        <div key={year} className="space-y-4">
                          <button 
                            onClick={() => toggleGroup(year)}
                            className="flex items-center gap-3 text-xl font-light hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors dark:text-white"
                          >
                            {expandedGroups.includes(year) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            Năm {year}
                          </button>
                          
                          {expandedGroups.includes(year) && (
                            <div className="ml-8 space-y-4 border-l-2 border-gray-50 dark:border-gray-800 pl-6">
                              {Object.entries(months).map(([month, days]) => (
                                <div key={month} className="space-y-3">
                                  <div className="flex items-center justify-between pr-4">
                                    <button 
                                      onClick={() => toggleGroup(`${year}-${month}`)}
                                      className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                      {expandedGroups.includes(`${year}-${month}`) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      {month}
                                    </button>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                      Tổng: {formatDuration(Object.values(days as Record<string, WorkLog[]>).reduce((acc, curr) => acc + calculateTotalHours(curr), 0))}
                                    </span>
                                  </div>

                                  {expandedGroups.includes(`${year}-${month}`) && (
                                    <div className="ml-4 space-y-3">
                                      {Object.entries(days as Record<string, WorkLog[]>).map(([day, dayLogs]) => (
                                        <div key={day} className="bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl p-4">
                                          <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                                              {day}
                                            </p>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                              {formatDuration(calculateTotalHours(dayLogs))}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {dayLogs.map((log: WorkLog) => (
                                              <div key={log.id} className="flex items-center justify-between bg-white dark:bg-gray-900 p-3 rounded-xl border border-black/5 dark:border-white/5 shadow-sm group">
                                                <div className="flex items-center gap-3">
                                                  <div className={`w-1.5 h-1.5 rounded-full ${log.type === 'in' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                  <span className="text-[10px] font-bold uppercase tracking-wider dark:text-gray-200">
                                                    {log.type === 'in' ? 'Vào' : 'Ra'}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{getLogTime(log.timestamp)}</span>
                                                  {isOwner(loggedInUser) && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                      <button 
                                                        onClick={() => handleEditLog(log)}
                                                        className="text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 p-2 -m-2"
                                                        title="Sửa bản ghi"
                                                      >
                                                        <Edit2 size={14} />
                                                      </button>
                                                      <button 
                                                        onClick={() => handleDeleteLog(log.id)}
                                                        className="text-gray-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 p-2 -m-2 ml-2"
                                                        title="Xóa bản ghi"
                                                      >
                                                        <Trash2 size={14} />
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Project Modal */}
        <AnimatePresence>
          {showProjectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-black/5 dark:border-white/5"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-light dark:text-white">Tạo dự án mới</h3>
                  <button onClick={() => setShowProjectModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await fetch('/api/projects', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(projectForm)
                    });
                    
                    if (res.ok) {
                      const newProject = await res.json();
                      setProjects(prev => [newProject, ...prev]);
                      setSelectedProject(newProject);
                      setShowProjectModal(false);
                    } else {
                      const data = await res.json();
                      alert(data.error || 'Failed to create project');
                    }
                  } catch (error) {
                    console.error(error);
                    alert('Failed to create project');
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Tên dự án</label>
                    <input
                      type="text"
                      required
                      value={projectForm.name}
                      onChange={e => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                      placeholder="VD: Dự án A"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Mô tả</label>
                    <textarea
                      value={projectForm.description}
                      onChange={e => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none min-h-[100px] dark:text-white"
                      placeholder="Mô tả ngắn về dự án..."
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowProjectModal(false)}
                      className="flex-1 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      Tạo dự án
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Task Modal */}
        <AnimatePresence>
          {showTaskModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-black/5 dark:border-white/5"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-light dark:text-white">{editingTask ? 'Sửa công việc' : 'Giao việc mới'}</h3>
                  <button onClick={() => setShowTaskModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const method = editingTask ? 'PUT' : 'POST';
                    const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
                    const payload = {
                      ...taskForm,
                      project_id: taskForm.project_id && taskForm.project_id !== '' ? Number(taskForm.project_id) : null,
                      assigner_id: loggedInUser?.id
                    };
                    
                    const res = await fetch(url, {
                      method,
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    
                    if (res.ok) {
                      const updatedTask = await res.json();
                      // Ensure project_id is treated as a number for comparison
                      const newProjectId = updatedTask.project_id ? Number(updatedTask.project_id) : -1;
                      
                      if (editingTask) {
                        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
                        
                        // If project changed, switch view to that project
                        if (selectedProject && newProjectId !== selectedProject.id) {
                          if (newProjectId === -1) {
                            setSelectedProject({ id: -1, name: 'General', created_at: new Date().toISOString(), description: 'Công việc chung' });
                          } else {
                            const newProject = projects.find(p => p.id === newProjectId);
                            if (newProject) setSelectedProject(newProject);
                          }
                        }
                      } else {
                        setTasks(prev => [updatedTask, ...prev]);
                        
                        // If created in a different project than current view (or if we are in a view)
                        if (selectedProject && newProjectId !== selectedProject.id) {
                           if (newProjectId === -1) {
                             setSelectedProject({ id: -1, name: 'General', created_at: new Date().toISOString(), description: 'Công việc chung' });
                           } else {
                             const newProject = projects.find(p => p.id === newProjectId);
                             if (newProject) setSelectedProject(newProject);
                           }
                        } else if (!selectedProject && newProjectId !== -1) {
                           // If not in a project view, but created in a specific project, go to it
                           const newProject = projects.find(p => p.id === newProjectId);
                           if (newProject) setSelectedProject(newProject);
                        }
                      }
                      setShowTaskModal(false);
                    }
                  } catch (error) {
                    console.error(error);
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Tiêu đề</label>
                    <input
                      type="text"
                      required
                      value={taskForm.title}
                      onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Mô tả</label>
                    <textarea
                      value={taskForm.description}
                      onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none min-h-[100px] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Dự án (Tùy chọn)</label>
                    <select
                      value={taskForm.project_id}
                      onChange={e => setTaskForm(prev => ({ ...prev, project_id: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                    >
                      <option value="">Không thuộc dự án nào</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Người nhận</label>
                    <select
                      required
                      value={taskForm.assignee_id}
                      onChange={e => setTaskForm(prev => ({ ...prev, assignee_id: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                    >
                      <option value="">Chọn thành viên...</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name} - {m.role}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Hạn chót</label>
                      <input
                        type="datetime-local"
                        value={taskForm.deadline}
                        onChange={e => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Mức độ ưu tiên</label>
                      <select
                        value={taskForm.priority}
                        onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                      >
                        <option value="low">Thấp</option>
                        <option value="medium">Trung bình</option>
                        <option value="high">Cao</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowTaskModal(false)}
                      className="flex-1 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      Lưu
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Member Modal */}
        <AnimatePresence>
          {isAddingMember && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-2xl border border-black/5 dark:border-white/5 w-full max-w-md"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-light dark:text-white">Thêm thành viên mới</h2>
                  <button 
                    onClick={() => setIsAddingMember(false)}
                    className="text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddMember} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Họ và tên</label>
                    <input
                      type="text"
                      value={addForm.name}
                      onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Email</label>
                    <input
                      type="email"
                      value={addForm.email}
                      onChange={e => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="VD: a@bimhanoi.com.vn"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Chức danh</label>
                    <input
                      type="text"
                      value={addForm.role}
                      onChange={e => setAddForm(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="VD: BIM Manager"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Mật khẩu (Nếu là Owner)</label>
                    <input
                      type="password"
                      value={addForm.password}
                      onChange={e => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Mật khẩu đăng nhập"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsAddingMember(false)}
                      className="flex-1 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      Thêm ngay
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Member Modal */}
        <AnimatePresence>
          {editingMember && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-2xl border border-black/5 dark:border-white/5 w-full max-w-md"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-light dark:text-white">Chỉnh sửa thành viên</h2>
                  <button 
                    onClick={() => setEditingMember(null)}
                    className="text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleUpdateMember} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Họ và tên</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Chức danh</label>
                    <input
                      type="text"
                      value={editForm.role}
                      onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Mật khẩu (Nếu là Owner)</label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => handleDeleteMember(editingMember.id)}
                      className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => setEditingMember(null)}
                      className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E5E5;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D1D1D1;
        }
      `}</style>
      {/* Note Modal */}
      <AnimatePresence>
        {showNoteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-black/5 dark:border-white/5"
            >
              <h3 className="text-xl font-light mb-6 flex items-center gap-2 dark:text-white">
                <StickyNote size={24} className="text-emerald-500" />
                {editingLogId ? 'Chỉnh sửa bản ghi' : (pendingLogType === 'in' ? 'Ghi chú vào làm' : 'Thêm ghi chú công việc')}
              </h3>
              
              {editingLogId && isOwner(loggedInUser) && (
                <div className="mb-4">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Thời gian</label>
                  <input
                    type="datetime-local"
                    value={editingLogTime}
                    onChange={(e) => setEditingLogTime(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-black/10 dark:focus:border-white/10 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                  />
                </div>
              )}

              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Nhập nội dung ghi chú..."
                className="w-full h-32 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 resize-none mb-6 text-sm dark:text-white"
                autoFocus
              />

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setPendingLogType(null);
                    setEditingLogId(null);
                    setNoteContent('');
                  }}
                  className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmTrack}
                  className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-black/10 dark:shadow-white/10"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 w-full max-w-sm shadow-2xl text-center relative overflow-hidden border border-black/5 dark:border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowQRModal(false)}
                className="absolute top-6 right-6 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Smartphone size={32} />
              </div>
              
              <h3 className="text-2xl font-light mb-2 dark:text-white">Sử dụng trên Mobile</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium leading-relaxed mb-8">
                Quét mã QR bên dưới bằng camera điện thoại để truy cập hệ thống nhanh chóng.
              </p>
              
              <div className="bg-white dark:bg-white p-4 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 inline-block mb-8">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin)}`} 
                  alt="QR Code"
                  className="w-48 h-48 rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Đường dẫn truy cập</p>
                <p className="text-xs font-mono text-gray-900 dark:text-gray-300 truncate">{window.location.origin}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
