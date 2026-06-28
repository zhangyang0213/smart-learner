import { useEffect, useState } from 'react';
import {
  Plus,
  Target,
  Clock,
  Flame,
  BookOpen,
  Calendar,
  Loader2,
  TrendingUp,
  FileText,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';
import { study } from '@/services/api';
import { useAppStore } from '@/store';
import type { StudyPlan, StudyRecord, StudyStats } from '@/types';

const mockPlans: StudyPlan[] = [
  {
    id: '1', title: '数据结构期末复习', goal: '掌握所有核心数据结构和算法',
    subject: '数据结构', start_date: '2026-05-01', end_date: '2026-06-30',
    phases: [
      { id: 'p1', title: '基础复习', description: '复习基础数据结构', start_date: '2026-05-01', end_date: '2026-05-15', tasks: ['复习链表', '复习栈和队列'], completed_tasks: 2, total_tasks: 2, status: 'completed' },
      { id: 'p2', title: '进阶练习', description: '刷题练习', start_date: '2026-05-16', end_date: '2026-06-15', tasks: ['二叉树题目', '图论题目', '动态规划'], completed_tasks: 2, total_tasks: 3, status: 'in_progress' },
      { id: 'p3', title: '冲刺模拟', description: '模拟考试', start_date: '2026-06-16', end_date: '2026-06-30', tasks: ['模拟卷1', '模拟卷2'], completed_tasks: 0, total_tasks: 2, status: 'pending' },
    ],
    status: 'active', progress: 57, created_at: '2026-05-01T00:00:00Z', updated_at: '2026-06-17T00:00:00Z',
  },
  {
    id: '2', title: '英语六级备考', goal: '通过英语六级考试',
    subject: '英语', start_date: '2026-03-01', end_date: '2026-06-15',
    phases: [
      { id: 'p4', title: '词汇积累', description: '背诵六级词汇', start_date: '2026-03-01', end_date: '2026-04-30', tasks: ['词汇书Unit1-10', '词汇书Unit11-20'], completed_tasks: 2, total_tasks: 2, status: 'completed' },
      { id: 'p5', title: '真题训练', description: '做历年真题', start_date: '2026-05-01', end_date: '2026-06-15', tasks: ['2024年真题', '2025年真题'], completed_tasks: 1, total_tasks: 2, status: 'in_progress' },
    ],
    status: 'active', progress: 75, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-06-17T00:00:00Z',
  },
];

const mockStats: StudyStats = {
  total_hours: 126,
  daily_average: 3.2,
  streak_days: 12,
  subject_distribution: [
    { subject: '数据结构', hours: 32, percentage: 25 },
    { subject: '英语', hours: 28, percentage: 22 },
    { subject: '操作系统', hours: 24, percentage: 19 },
    { subject: '高等数学', hours: 22, percentage: 18 },
    { subject: '其他', hours: 20, percentage: 16 },
  ],
  weekly_data: [],
  monthly_data: [],
};

export default function Study() {
  const user = useAppStore((s) => s.user);
  const userId = user?.user_id || '1';
  const [plans, setPlans] = useState<StudyPlan[]>(mockPlans);
  const [stats, setStats] = useState<StudyStats>(mockStats);
  const [loading, setLoading] = useState(true);

  // Create plan form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [planForm, setPlanForm] = useState({
    title: '', goal: '', subject: '', start_date: '', end_date: '',
  });

  // Add record form
  const [recordForm, setRecordForm] = useState({
    plan_id: '', date: new Date().toISOString().slice(0, 10), duration: '', content: '', activity_type: '学习',
  });
  const [addingRecord, setAddingRecord] = useState(false);

  // Daily report
  const [dailyReport, setDailyReport] = useState<{ date: string; total_hours: number; records: StudyRecord[]; summary: string } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [plansRes, statsRes] = await Promise.all([
          study.listPlans(userId),
          study.getStats(userId, 7),
        ]);
        // Backend returns {plans: [...]}, not {success, data}
        const plansData = (plansRes as any)?.plans || (plansRes as any)?.data;
        if (Array.isArray(plansData)) {
          setPlans(
            plansData.map((p: any) => ({
              id: String(p.id ?? ''),
              title: p.title ?? '',
              goal: p.goal ?? '',
              subject: p.plan_type ?? p.subject ?? '',
              start_date: p.start_date ?? '',
              end_date: p.end_date ?? '',
              phases: p.milestones || p.phases || [],
              status: p.status ?? 'active',
              progress: p.progress ?? 0,
              created_at: p.created_at ?? new Date().toISOString(),
              updated_at: p.created_at ?? new Date().toISOString(),
            }))
          );
        }
        // Backend returns {stats, efficiency_score}, not {success, data}
        const sd = statsRes as any;
        if (sd && (sd.stats !== undefined || sd.efficiency_score !== undefined)) {
          const statsData = sd.stats || sd;
          setStats({
            total_hours: statsData.total_hours ?? 0,
            daily_average: statsData.daily_average ?? 0,
            streak_days: statsData.streak_days ?? 0,
            subject_distribution: Array.isArray(statsData.subject_distribution) ? statsData.subject_distribution : [],
            weekly_data: Array.isArray(statsData.weekly_data) ? statsData.weekly_data : [],
            monthly_data: Array.isArray(statsData.monthly_data) ? statsData.monthly_data : [],
          });
        }
      } catch {
        // Use mock data
      }
      setLoading(false);
    }
    fetchData();
  }, [userId]);

  useEffect(() => {
    async function fetchReport() {
      setReportLoading(true);
      try {
        const res = await study.getDailyReport(userId);
        // Backend returns {report, date}, not {success, data}
        const r = res as any;
        const report = r?.report || r?.data?.report;
        if (report) {
          setDailyReport({
            date: r?.date || new Date().toISOString().slice(0, 10),
            total_hours: r?.total_hours ?? 0,
            records: r?.records ?? [],
            summary: typeof report === 'string' ? report : (report.summary || ''),
          });
        }
      } catch {
        setDailyReport({
          date: new Date().toISOString().slice(0, 10),
          total_hours: 0,
          records: [],
          summary: '今日暂无学习记录，开始记录你的学习活动吧！',
        });
      }
      setReportLoading(false);
    }
    fetchReport();
  }, [userId]);

  const handleCreatePlan = async () => {
    if (!planForm.title || !planForm.goal || !planForm.subject || !planForm.start_date || !planForm.end_date) return;
    setCreating(true);
    try {
      const res = await study.createPlan({ ...planForm, user_id: userId });
      // Backend returns {plan_id, ai_plan, message}, not {success, data}
      const r = res as any;
      if (r?.plan_id !== undefined || r?.message) {
        const newPlan: StudyPlan = {
          id: String(r?.plan_id ?? `server-${Date.now()}`),
          title: planForm.title,
          goal: planForm.goal,
          subject: planForm.subject,
          start_date: planForm.start_date,
          end_date: planForm.end_date,
          phases: r?.ai_plan?.phases || [],
          status: 'active',
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setPlans((prev) => [...prev, newPlan]);
        setShowCreateForm(false);
        setPlanForm({ title: '', goal: '', subject: '', start_date: '', end_date: '' });
      }
    } catch {
      const newPlan: StudyPlan = {
        id: `local-${Date.now()}`,
        title: planForm.title,
        goal: planForm.goal,
        subject: planForm.subject,
        start_date: planForm.start_date,
        end_date: planForm.end_date,
        phases: [],
        status: 'active',
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPlans((prev) => [...prev, newPlan]);
      setShowCreateForm(false);
      setPlanForm({ title: '', goal: '', subject: '', start_date: '', end_date: '' });
    }
    setCreating(false);
  };

  const handleAddRecord = async () => {
    if (!recordForm.plan_id || !recordForm.duration || !recordForm.content) return;
    setAddingRecord(true);
    try {
      await study.addRecord({
        ...recordForm,
        duration: Number(recordForm.duration),
        user_id: userId,
      });
      // Backend returns {message, record_id} - success if no exception
    } catch {
      // Silently fail
    }
    setRecordForm({
      plan_id: '', date: new Date().toISOString().slice(0, 10), duration: '', content: '', activity_type: '学习',
    });
    setAddingRecord(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge bg-emerald-50 text-emerald-600">进行中</span>;
      case 'completed':
        return <span className="badge bg-navy-50 text-navy-600">已完成</span>;
      case 'paused':
        return <span className="badge bg-amber-50 text-amber-600">已暂停</span>;
      default:
        return null;
    }
  };

  const topSubject = Array.isArray(stats.subject_distribution) && stats.subject_distribution.length > 0 ? stats.subject_distribution[0].subject : '-';

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
          <h1 className="text-2xl font-bold text-warm-800">学习计划</h1>
          <p className="text-warm-500 text-sm mt-1">制定计划，追踪进度，高效学习</p>
        </div>
        <button onClick={() => setShowCreateForm(true)} className="btn-accent flex items-center gap-2">
          <Plus className="w-4 h-4" />
          创建学习计划
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-600 rounded-xl flex items-center justify-center text-white">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-warm-800">{stats.total_hours}</p>
            <p className="text-xs text-warm-500">总学时</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-warm-800">{stats.daily_average}</p>
            <p className="text-xs text-warm-500">日均学时</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-warm-800">{topSubject}</p>
            <p className="text-xs text-warm-500">最常学科</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-warm-800">{stats.streak_days}</p>
            <p className="text-xs text-warm-500">连续天数</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Plans + Record */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Plans */}
          <div>
            <h2 className="section-title">学习计划</h2>
            {plans.length === 0 ? (
              <div className="card text-center py-12">
                <Target className="w-10 h-10 text-warm-300 mx-auto mb-3" />
                <p className="text-warm-500">暂无学习计划，点击"创建学习计划"开始</p>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="card">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-warm-800">{plan.title}</h3>
                          {statusBadge(plan.status)}
                        </div>
                        <p className="text-sm text-warm-500">{plan.goal}</p>
                      </div>
                      <span className="text-2xl font-bold text-navy-600">{plan.progress}%</span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-warm-100 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-navy-600 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${plan.progress}%` }}
                      />
                    </div>

                    {/* Milestone dots */}
                    {(Array.isArray(plan.phases) && plan.phases.length > 0) && (
                      <div className="flex items-center gap-1 mb-3">
                        {plan.phases.map((phase) => (
                          <div key={phase.id} className="flex items-center gap-1 flex-1">
                            <div className="flex items-center gap-1">
                              {phase.status === 'completed' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : phase.status === 'in_progress' ? (
                                <Circle className="w-4 h-4 text-navy-600 fill-navy-200" />
                              ) : (
                                <Circle className="w-4 h-4 text-warm-300" />
                              )}
                              <span className={`text-xs ${
                                phase.status === 'completed' ? 'text-emerald-600' :
                                phase.status === 'in_progress' ? 'text-navy-600 font-medium' : 'text-warm-400'
                              }`}>
                                {phase.title}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-xs text-warm-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {plan.start_date} ~ {plan.end_date}
                      </span>
                      <span className="badge-navy">{plan.subject}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Study Record Quick Add */}
          <div>
            <h2 className="section-title">学习记录</h2>
            <div className="card">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">关联计划</label>
                  <select
                    className="input-field"
                    value={recordForm.plan_id}
                    onChange={(e) => setRecordForm({ ...recordForm, plan_id: e.target.value })}
                  >
                    <option value="">选择计划</option>
                    {plans.filter((p) => p.status === 'active').map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">日期</label>
                  <input
                    type="date"
                    className="input-field"
                    value={recordForm.date}
                    onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">时长（分钟）</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="60"
                    value={recordForm.duration}
                    onChange={(e) => setRecordForm({ ...recordForm, duration: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">活动类型</label>
                  <select
                    className="input-field"
                    value={recordForm.activity_type}
                    onChange={(e) => setRecordForm({ ...recordForm, activity_type: e.target.value })}
                  >
                    <option value="学习">学习</option>
                    <option value="练习">练习</option>
                    <option value="复习">复习</option>
                    <option value="测验">测验</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-warm-700 mb-1">学习内容</label>
                  <input
                    className="input-field"
                    placeholder="今天学了什么..."
                    value={recordForm.content}
                    onChange={(e) => setRecordForm({ ...recordForm, content: e.target.value })}
                  />
                </div>
              </div>
              <button
                onClick={handleAddRecord}
                disabled={!recordForm.plan_id || !recordForm.duration || !recordForm.content || addingRecord}
                className="btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingRecord ? '添加中...' : '添加记录'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Daily Report */}
        <div className="space-y-6">
          {/* Daily Report */}
          <div>
            <h2 className="section-title">智能日报</h2>
            <div className="card">
              {reportLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-navy-600 animate-spin" />
                </div>
              ) : dailyReport ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-navy-600" />
                    <span className="text-sm font-medium text-warm-800">{dailyReport.date}</span>
                    <span className="text-xs text-warm-400">· {dailyReport.total_hours} 小时</span>
                  </div>
                  <div className="prose prose-sm text-warm-600 leading-relaxed">
                    {dailyReport.summary.split(/[。！？]/).filter(Boolean).map((sentence, idx) => (
                      <p key={idx} className="mb-2 text-sm">{sentence}。</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-warm-400 text-sm text-center py-4">暂无日报数据</p>
              )}
            </div>
          </div>

          {/* Subject Distribution */}
          <div>
            <h2 className="section-title">学科分布</h2>
            <div className="card">
              <div className="space-y-3">
                {(Array.isArray(stats.subject_distribution) ? stats.subject_distribution : []).map((item) => (
                  <div key={item.subject}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-warm-700">{item.subject}</span>
                      <span className="text-warm-400">{item.hours}h ({item.percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-warm-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-navy-600 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Plan Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateForm(false)}>
          <div className="bg-white rounded-2xl shadow-card-hover w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-warm-800">创建学习计划</h2>
              <button onClick={() => setShowCreateForm(false)} className="p-1 rounded-md hover:bg-warm-100">
                <X className="w-5 h-5 text-warm-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">计划标题 *</label>
                <input
                  className="input-field"
                  placeholder="例如：数据结构期末复习"
                  value={planForm.title}
                  onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">学习目标 *</label>
                <textarea
                  className="input-field resize-none"
                  rows={2}
                  placeholder="描述你的学习目标..."
                  value={planForm.goal}
                  onChange={(e) => setPlanForm({ ...planForm, goal: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">学科 *</label>
                <input
                  className="input-field"
                  placeholder="例如：数据结构"
                  value={planForm.subject}
                  onChange={(e) => setPlanForm({ ...planForm, subject: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">开始日期 *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={planForm.start_date}
                    onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">结束日期 *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={planForm.end_date}
                    onChange={(e) => setPlanForm({ ...planForm, end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateForm(false)} className="btn-ghost flex-1">取消</button>
              <button
                onClick={handleCreatePlan}
                disabled={!planForm.title || !planForm.goal || !planForm.subject || !planForm.start_date || !planForm.end_date || creating}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '创建中...' : '创建计划'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
