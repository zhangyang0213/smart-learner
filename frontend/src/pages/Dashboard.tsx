import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Brain,
  Clock,
  Zap,
  Flame,
  Plus,
  FileText,
  Target,
  Activity,
} from 'lucide-react';
import { dashboard, study } from '@/services/api';
import { useAppStore } from '@/store';
import { CardSkeleton, ListSkeleton } from '@/components/Skeleton';
import type { DashboardOverview, Activity as ActivityType, StudyStats } from '@/types';

// Mock data
const mockOverview: DashboardOverview = {
  total_courses: 6,
  total_documents: 23,
  total_knowledge_items: 48,
  active_plans: 2,
  study_hours_today: 3.5,
  study_hours_week: 18.5,
  upcoming_deadlines: [
    { id: '1', title: '数据结构作业', due_date: '2026-06-18', type: 'assignment', course_name: '数据结构' },
    { id: '2', title: '操作系统期中考试', due_date: '2026-06-20', type: 'exam', course_name: '操作系统' },
  ],
};

const mockStats: StudyStats = {
  total_hours: 126,
  daily_average: 3.2,
  streak_days: 12,
  subject_distribution: [
    { subject: '数据结构', hours: 32, percentage: 25 },
    { subject: '操作系统', hours: 28, percentage: 22 },
    { subject: '计算机网络', hours: 24, percentage: 19 },
    { subject: '高等数学', hours: 22, percentage: 18 },
    { subject: '其他', hours: 20, percentage: 16 },
  ],
  weekly_data: [
    { date: '周一', hours: 2.5 },
    { date: '周二', hours: 3.0 },
    { date: '周三', hours: 4.0 },
    { date: '周四', hours: 2.0 },
    { date: '周五', hours: 3.5 },
    { date: '周六', hours: 1.5 },
    { date: '周日', hours: 2.0 },
  ],
  monthly_data: [],
};

const mockActivities: ActivityType[] = [
  { id: '1', type: 'course_add', title: '添加课程', description: '添加了课程「计算机网络」', timestamp: '2026-06-17T10:30:00Z' },
  { id: '2', type: 'document_upload', title: '上传课件', description: '上传了「操作系统-进程管理.pdf」', timestamp: '2026-06-17T09:15:00Z' },
  { id: '3', type: 'quiz_complete', title: '完成测验', description: '完成了「数据结构」章节测验，得分 85', timestamp: '2026-06-16T16:00:00Z' },
  { id: '4', type: 'knowledge_add', title: '添加知识', description: '添加了知识条目「TCP三次握手」', timestamp: '2026-06-16T14:20:00Z' },
  { id: '5', type: 'study_record', title: '学习记录', description: '学习了 2.5 小时「高等数学」', timestamp: '2026-06-15T20:00:00Z' },
];

const efficiencyScore = 82;

function CircularProgress({ value, size = 80, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E2E8F0"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#10B981"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

const activityIconMap: Record<string, React.ReactNode> = {
  course_add: <BookOpen className="w-4 h-4" />,
  document_upload: <FileText className="w-4 h-4" />,
  knowledge_add: <Brain className="w-4 h-4" />,
  quiz_complete: <Zap className="w-4 h-4" />,
  plan_create: <Target className="w-4 h-4" />,
  study_record: <Clock className="w-4 h-4" />,
  team_join: <Activity className="w-4 h-4" />,
  paper_analyze: <FileText className="w-4 h-4" />,
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} 分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const [overview, setOverview] = useState<DashboardOverview>(mockOverview);
  const [stats, setStats] = useState<StudyStats>(mockStats);
  const [activities, setActivities] = useState<ActivityType[]>(mockActivities);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const userId = user?.user_id || '1';
      try {
        const [overviewRes, activitiesRes] = await Promise.all([
          dashboard.getOverview(userId),
          dashboard.getRecentActivities(userId, 5),
        ]);
        const od = (overviewRes as any);
        setOverview(od?.data || od?.overview || od || mockOverview);
        const ad = (activitiesRes as any);
        setActivities(ad?.data || ad?.activities || ad || mockActivities);
      } catch {
        // Use mock data on error
      }
      try {
        const statsRes = await study.getStats(userId, 7);
        const sd = (statsRes as any);
        setStats(sd?.data || sd?.stats || sd || mockStats);
      } catch {
        // Use mock data on error
      }
      setLoading(false);
    }
    fetchData();
  }, [user?.user_id]);

  const statCards = [
    { label: '课程数', value: overview.total_courses, icon: <BookOpen className="w-5 h-5" />, color: 'bg-navy-600' },
    { label: '知识条目', value: overview.total_knowledge_items, icon: <Brain className="w-5 h-5" />, color: 'bg-emerald-500' },
    { label: '今日学习', value: `${overview.study_hours_today}h`, icon: <Clock className="w-5 h-5" />, color: 'bg-amber-500' },
    { label: '效率评分', value: efficiencyScore, icon: <Zap className="w-5 h-5" />, color: 'bg-violet-500' },
  ];

  const maxWeeklyHours = Math.max(...stats.weekly_data.map((d) => d.hours), 1);

  if (loading) {
    return (
      <div className="page-container">
        <div className="mb-6">
          <div className="h-8 w-48 rounded bg-warm-200 animate-pulse" />
          <div className="h-4 w-32 rounded bg-warm-100 animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="card animate-pulse">
            <div className="h-5 w-20 rounded bg-warm-200 mb-4" />
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full bg-warm-200" />
              <div className="h-4 w-24 rounded bg-warm-100 mt-3" />
            </div>
          </div>
          <div className="card lg:col-span-2 animate-pulse">
            <div className="h-5 w-28 rounded bg-warm-200 mb-4" />
            <div className="flex items-end gap-2 h-40">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="h-3 w-6 rounded bg-warm-100" />
                  <div className="w-full rounded-t-md bg-warm-200" style={{ height: `${30 + Math.random() * 70}%` }} />
                  <div className="h-3 w-6 rounded bg-warm-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="h-5 w-20 rounded bg-warm-200 mb-4 animate-pulse" />
            <ListSkeleton count={5} />
          </div>
          <div className="space-y-6">
            <div className="card animate-pulse">
              <div className="h-5 w-20 rounded bg-warm-200 mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-warm-100" />
                ))}
              </div>
            </div>
            <div className="card animate-pulse">
              <div className="h-5 w-20 rounded bg-warm-200 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-8 rounded bg-warm-100" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-800">
          {user ? `${user.name}，你好！` : '你好！'}
        </h1>
        <p className="text-warm-500 text-sm mt-1">今天也要加油学习哦 💪</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="card flex items-center gap-4">
            <div className={`w-11 h-11 ${card.color} rounded-xl flex items-center justify-center text-white`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-warm-800">{card.value}</p>
              <p className="text-xs text-warm-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Efficiency & Streak */}
        <div className="card flex flex-col items-center justify-center">
          <h3 className="section-title self-start">学习效率</h3>
          <div className="relative">
            <CircularProgress value={efficiencyScore} size={120} strokeWidth={8} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-warm-800">{efficiencyScore}</span>
              <span className="text-xs text-warm-500">分</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-emerald-600">
            <Flame className="w-5 h-5" />
            <span className="font-semibold">{stats.streak_days} 天连续学习</span>
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="card lg:col-span-2">
          <h3 className="section-title">本周学习趋势</h3>
          <div className="flex items-end gap-2 h-40">
            {stats.weekly_data.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-warm-500 font-medium">{day.hours}h</span>
                <div
                  className="w-full bg-gradient-to-t from-navy-600 to-navy-400 rounded-t-md transition-all duration-500 min-h-[4px]"
                  style={{ height: `${(day.hours / maxWeeklyHours) * 100}%` }}
                />
                <span className="text-xs text-warm-500">{day.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="card">
          <h3 className="section-title">最近活动</h3>
          <div className="space-y-4">
            {activities.map((activity, idx) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-navy-50 text-navy-600 flex items-center justify-center flex-shrink-0">
                    {activityIconMap[activity.type] || <Activity className="w-4 h-4" />}
                  </div>
                  {idx < activities.length - 1 && (
                    <div className="w-px h-full bg-warm-200 mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-800">{activity.description}</p>
                  <p className="text-xs text-warm-400 mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions + Upcoming Deadlines */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <h3 className="section-title">快捷操作</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/courses')}
                className="flex items-center gap-2 p-3 rounded-lg border border-warm-200 hover:bg-navy-50 hover:border-navy-300 transition-all text-sm text-warm-700"
              >
                <Plus className="w-4 h-4 text-navy-600" />
                添加课程
              </button>
              <button
                onClick={() => navigate('/knowledge')}
                className="flex items-center gap-2 p-3 rounded-lg border border-warm-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-sm text-warm-700"
              >
                <Brain className="w-4 h-4 text-emerald-600" />
                知识问答
              </button>
              <button
                onClick={() => navigate('/papers')}
                className="flex items-center gap-2 p-3 rounded-lg border border-warm-200 hover:bg-amber-50 hover:border-amber-300 transition-all text-sm text-warm-700"
              >
                <FileText className="w-4 h-4 text-amber-600" />
                论文分析
              </button>
              <button
                onClick={() => navigate('/study')}
                className="flex items-center gap-2 p-3 rounded-lg border border-warm-200 hover:bg-violet-50 hover:border-violet-300 transition-all text-sm text-warm-700"
              >
                <Target className="w-4 h-4 text-violet-600" />
                学习计划
              </button>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="card">
            <h3 className="section-title">即将到期</h3>
            {overview.upcoming_deadlines.length === 0 ? (
              <p className="text-warm-400 text-sm">暂无待办事项</p>
            ) : (
              <div className="space-y-3">
                {overview.upcoming_deadlines.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-warm-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      d.type === 'exam' ? 'bg-red-500' : d.type === 'assignment' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-warm-800 truncate">{d.title}</p>
                      {d.course_name && (
                        <p className="text-xs text-warm-400">{d.course_name}</p>
                      )}
                    </div>
                    <span className="text-xs text-warm-500 flex-shrink-0">{d.due_date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
