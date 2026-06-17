import { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  LogIn,
  Megaphone,
  CheckSquare,
  Square,
  X,
  Loader2,
  UserPlus,
  Crown,
  Shield,
  User,
  Calendar,
  Clock,
} from 'lucide-react';
import { team } from '@/services/api';
import type { Team, TeamMember } from '@/types';

const mockTeams: Team[] = [
  {
    id: '1', name: '数据结构学习小组', description: '一起复习数据结构，互相讨论算法题',
    creator_id: 'user-1',
    members: [
      { id: 'm1', name: '张三', role: 'owner', joined_at: '2026-03-01T00:00:00Z' },
      { id: 'm2', name: '李四', role: 'admin', joined_at: '2026-03-02T00:00:00Z' },
      { id: 'm3', name: '王五', role: 'member', joined_at: '2026-03-05T00:00:00Z' },
      { id: 'm4', name: '赵六', role: 'member', joined_at: '2026-03-10T00:00:00Z' },
    ],
    announcements: [
      { id: 'a1', title: '本周学习计划', content: '本周重点复习二叉树和图论，周六下午3点线上讨论', author: '张三', created_at: '2026-06-15T10:00:00Z' },
      { id: 'a2', title: '模拟考试安排', content: '下周三晚上7点进行模拟考试，请大家提前准备', author: '张三', created_at: '2026-06-13T09:00:00Z' },
    ],
    todos: [
      { id: 't1', title: '完成链表专题练习', completed: true, assignee: '李四', due_date: '2026-06-14', created_at: '2026-06-10T00:00:00Z' },
      { id: 't2', title: '整理树和图笔记', completed: false, assignee: '王五', due_date: '2026-06-18', created_at: '2026-06-12T00:00:00Z' },
      { id: 't3', title: '刷 LeetCode 动态规划 5 题', completed: false, assignee: '赵六', due_date: '2026-06-20', created_at: '2026-06-14T00:00:00Z' },
    ],
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: '2', name: '英语角', description: '每日英语口语练习，分享学习资源',
    creator_id: 'user-2',
    members: [
      { id: 'm5', name: '小明', role: 'owner', joined_at: '2026-04-01T00:00:00Z' },
      { id: 'm6', name: '小红', role: 'member', joined_at: '2026-04-03T00:00:00Z' },
    ],
    announcements: [
      { id: 'a3', title: '每日打卡', content: '每天至少练习15分钟口语，群里打卡分享', author: '小明', created_at: '2026-06-16T08:00:00Z' },
    ],
    todos: [],
    created_at: '2026-04-01T00:00:00Z',
  },
];

const roleBadge = (role: TeamMember['role']) => {
  switch (role) {
    case 'owner':
      return <span className="badge bg-amber-50 text-amber-600"><Crown className="w-3 h-3 mr-1" />组长</span>;
    case 'admin':
      return <span className="badge bg-navy-50 text-navy-600"><Shield className="w-3 h-3 mr-1" />管理员</span>;
    case 'member':
      return <span className="badge bg-warm-100 text-warm-600"><User className="w-3 h-3 mr-1" />成员</span>;
  }
};

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  // Create team modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });

  // Join team modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Announcement form
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  // Todo form
  const [todoForm, setTodoForm] = useState({ title: '', assignee: '', due_date: '' });
  const [addingTodo, setAddingTodo] = useState(false);

  // Current user role in selected team
  const currentUserRole = selectedTeam?.members.find((m) => m.id === 'm1')?.role || 'member';
  const isLeader = currentUserRole === 'owner' || currentUserRole === 'admin';

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await team.listTeams();
        if (res.success) setTeams(res.data);
      } catch {
        // Use mock data
      }
      setLoading(false);
    }
    fetchTeams();
  }, []);

  const handleCreateTeam = async () => {
    if (!createForm.name) return;
    setCreating(true);
    try {
      const res = await team.createTeam(createForm);
      if (res.success) {
        setTeams((prev) => [...prev, res.data]);
        setShowCreateModal(false);
        setCreateForm({ name: '', description: '' });
      }
    } catch {
      const newTeam: Team = {
        id: `local-${Date.now()}`,
        name: createForm.name,
        description: createForm.description,
        creator_id: 'current-user',
        members: [{ id: 'current-user', name: '我', role: 'owner', joined_at: new Date().toISOString() }],
        announcements: [],
        todos: [],
        created_at: new Date().toISOString(),
      };
      setTeams((prev) => [...prev, newTeam]);
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '' });
    }
    setCreating(false);
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await team.joinTeam(joinCode.trim());
      if (res.success) {
        setTeams((prev) => [...prev, res.data]);
        setShowJoinModal(false);
        setJoinCode('');
      }
    } catch {
      // Show error silently
    }
    setJoining(false);
  };

  const handleAddAnnouncement = async () => {
    if (!selectedTeam || !announcementForm.title || !announcementForm.content) return;
    setPostingAnnouncement(true);
    try {
      const res = await team.addAnnouncement(selectedTeam.id, announcementForm);
      if (res.success) {
        setSelectedTeam(res.data);
        setTeams((prev) => prev.map((t) => (t.id === selectedTeam.id ? res.data : t)));
        setAnnouncementForm({ title: '', content: '' });
      }
    } catch {
      const newAnnouncement = {
        id: `local-${Date.now()}`,
        title: announcementForm.title,
        content: announcementForm.content,
        author: '我',
        created_at: new Date().toISOString(),
      };
      const updatedTeam = {
        ...selectedTeam,
        announcements: [newAnnouncement, ...selectedTeam.announcements],
      };
      setSelectedTeam(updatedTeam);
      setTeams((prev) => prev.map((t) => (t.id === selectedTeam.id ? updatedTeam : t)));
      setAnnouncementForm({ title: '', content: '' });
    }
    setPostingAnnouncement(false);
  };

  const handleAddTodo = async () => {
    if (!selectedTeam || !todoForm.title) return;
    setAddingTodo(true);
    try {
      const res = await team.addTodo(selectedTeam.id, {
        title: todoForm.title,
        assignee: todoForm.assignee || undefined,
        due_date: todoForm.due_date || undefined,
      });
      if (res.success) {
        setSelectedTeam(res.data);
        setTeams((prev) => prev.map((t) => (t.id === selectedTeam.id ? res.data : t)));
        setTodoForm({ title: '', assignee: '', due_date: '' });
      }
    } catch {
      const newTodo = {
        id: `local-${Date.now()}`,
        title: todoForm.title,
        completed: false,
        assignee: todoForm.assignee || undefined,
        due_date: todoForm.due_date || undefined,
        created_at: new Date().toISOString(),
      };
      const updatedTeam = {
        ...selectedTeam,
        todos: [...selectedTeam.todos, newTodo],
      };
      setSelectedTeam(updatedTeam);
      setTeams((prev) => prev.map((t) => (t.id === selectedTeam.id ? updatedTeam : t)));
      setTodoForm({ title: '', assignee: '', due_date: '' });
    }
    setAddingTodo(false);
  };

  const handleToggleTodo = async (todoId: string) => {
    if (!selectedTeam) return;
    try {
      const res = await team.toggleTodo(selectedTeam.id, todoId);
      if (res.success) {
        setSelectedTeam(res.data);
        setTeams((prev) => prev.map((t) => (t.id === selectedTeam.id ? res.data : t)));
      }
    } catch {
      const updatedTodos = selectedTeam.todos.map((t) =>
        t.id === todoId ? { ...t, completed: !t.completed } : t
      );
      const updatedTeam = { ...selectedTeam, todos: updatedTodos };
      setSelectedTeam(updatedTeam);
      setTeams((prev) => prev.map((t) => (t.id === selectedTeam.id ? updatedTeam : t)));
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-warm-800">学习小组</h1>
          <p className="text-warm-500 text-sm mt-1">与同学一起学习，共同进步</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowJoinModal(true)} className="btn-outline flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            加入小组
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            创建小组
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team List */}
        <div className="space-y-3">
          {teams.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="w-10 h-10 text-warm-300 mx-auto mb-3" />
              <p className="text-warm-500">暂无小组，创建或加入一个吧</p>
            </div>
          ) : (
            teams.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTeam(t)}
                className={`card card-hover cursor-pointer ${
                  selectedTeam?.id === t.id ? 'ring-2 ring-navy-400' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-warm-800 mb-1">{t.name}</h3>
                    <p className="text-sm text-warm-500 line-clamp-2">{t.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-warm-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {t.members.length} 人
                  </span>
                  {t.members.find((m) => m.id === 'm1') && roleBadge(t.members.find((m) => m.id === 'm1')!.role)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Team Detail */}
        <div className="lg:col-span-2">
          {!selectedTeam ? (
            <div className="card text-center py-20">
              <UserPlus className="w-12 h-12 text-warm-300 mx-auto mb-4" />
              <p className="text-warm-500">选择一个小组查看详情</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Team Header */}
              <div className="card">
                <h2 className="text-xl font-bold text-warm-800 mb-2">{selectedTeam.name}</h2>
                <p className="text-sm text-warm-500 mb-3">{selectedTeam.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedTeam.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-warm-50 text-sm">
                      <div className="w-5 h-5 rounded-full bg-navy-100 text-navy-600 flex items-center justify-center text-xs font-medium">
                        {m.name[0]}
                      </div>
                      <span className="text-warm-700">{m.name}</span>
                      {roleBadge(m.role)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Announcements */}
              <div>
                <h3 className="section-title flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-500" />
                  公告
                </h3>
                <div className="card">
                  {isLeader && (
                    <div className="mb-4 pb-4 border-b border-warm-200/50">
                      <div className="space-y-3">
                        <input
                          className="input-field"
                          placeholder="公告标题"
                          value={announcementForm.title}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                        />
                        <textarea
                          className="input-field resize-none"
                          rows={2}
                          placeholder="公告内容..."
                          value={announcementForm.content}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                        />
                        <button
                          onClick={handleAddAnnouncement}
                          disabled={!announcementForm.title || !announcementForm.content || postingAnnouncement}
                          className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {postingAnnouncement ? '发布中...' : '发布公告'}
                        </button>
                      </div>
                    </div>
                  )}
                  {selectedTeam.announcements.length === 0 ? (
                    <p className="text-warm-400 text-sm text-center py-4">暂无公告</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedTeam.announcements.map((ann) => (
                        <div key={ann.id} className="p-3 rounded-lg bg-warm-50">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-warm-800 text-sm">{ann.title}</h4>
                            <span className="text-xs text-warm-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(ann.created_at).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <p className="text-sm text-warm-600">{ann.content}</p>
                          <p className="text-xs text-warm-400 mt-1">发布者：{ann.author}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Shared Todos */}
              <div>
                <h3 className="section-title flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-500" />
                  共享待办
                </h3>
                <div className="card">
                  {/* Add todo form */}
                  <div className="mb-4 pb-4 border-b border-warm-200/50">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        className="input-field"
                        placeholder="待办事项"
                        value={todoForm.title}
                        onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
                      />
                      <input
                        className="input-field"
                        placeholder="负责人"
                        value={todoForm.assignee}
                        onChange={(e) => setTodoForm({ ...todoForm, assignee: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <input
                          type="date"
                          className="input-field flex-1"
                          value={todoForm.due_date}
                          onChange={(e) => setTodoForm({ ...todoForm, due_date: e.target.value })}
                        />
                        <button
                          onClick={handleAddTodo}
                          disabled={!todoForm.title || addingTodo}
                          className="btn-primary px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {addingTodo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedTeam.todos.length === 0 ? (
                    <p className="text-warm-400 text-sm text-center py-4">暂无待办事项</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTeam.todos.map((todo) => (
                        <div
                          key={todo.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-warm-50 transition-colors"
                        >
                          <button
                            onClick={() => handleToggleTodo(todo.id)}
                            className="flex-shrink-0"
                          >
                            {todo.completed ? (
                              <CheckSquare className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Square className="w-5 h-5 text-warm-300 hover:text-navy-400" />
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-warm-400' : 'text-warm-700'}`}>
                            {todo.title}
                          </span>
                          {todo.assignee && (
                            <span className="text-xs text-warm-500 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {todo.assignee}
                            </span>
                          )}
                          {todo.due_date && (
                            <span className="text-xs text-warm-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {todo.due_date.slice(5)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-card-hover w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-warm-800">创建小组</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-md hover:bg-warm-100">
                <X className="w-5 h-5 text-warm-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">小组名称 *</label>
                <input
                  className="input-field"
                  placeholder="例如：数据结构学习小组"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">小组描述</label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="简要描述小组的学习目标..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost flex-1">取消</button>
              <button
                onClick={handleCreateTeam}
                disabled={!createForm.name || creating}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '创建中...' : '创建小组'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowJoinModal(false)}>
          <div className="bg-white rounded-2xl shadow-card-hover w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-warm-800">加入小组</h2>
              <button onClick={() => setShowJoinModal(false)} className="p-1 rounded-md hover:bg-warm-100">
                <X className="w-5 h-5 text-warm-500" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">小组邀请码</label>
              <input
                className="input-field"
                placeholder="输入小组 ID 或邀请码"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinTeam()}
              />
              <p className="text-xs text-warm-400 mt-2">向小组组长获取邀请码</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowJoinModal(false)} className="btn-ghost flex-1">取消</button>
              <button
                onClick={handleJoinTeam}
                disabled={!joinCode.trim() || joining}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? '加入中...' : '加入小组'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
