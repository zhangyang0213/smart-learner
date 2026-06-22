import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Star, X, User, Calendar } from 'lucide-react';
import { course } from '@/services/api';
import { useAppStore } from '@/store';
import type { Course } from '@/types';

const mockCourses: Course[] = [
  {
    id: '1', name: '数据结构与算法', code: 'CS201', teacher: '王教授', semester: '2025-2026-2',
    description: '学习常用数据结构和算法设计方法', documents: [],
    created_at: '2026-02-20T00:00:00Z', updated_at: '2026-06-17T00:00:00Z',
  },
  {
    id: '2', name: '操作系统', code: 'CS301', teacher: '李教授', semester: '2025-2026-2',
    description: '操作系统原理与实践', documents: [],
    created_at: '2026-02-20T00:00:00Z', updated_at: '2026-06-15T00:00:00Z',
  },
  {
    id: '3', name: '计算机网络', code: 'CS302', teacher: '张教授', semester: '2025-2026-2',
    description: '计算机网络体系结构与协议', documents: [],
    created_at: '2026-02-20T00:00:00Z', updated_at: '2026-06-10T00:00:00Z',
  },
  {
    id: '4', name: '高等数学', code: 'MATH101', teacher: '赵教授', semester: '2025-2026-2',
    description: '微积分、级数与常微分方程', documents: [],
    created_at: '2026-02-20T00:00:00Z', updated_at: '2026-06-05T00:00:00Z',
  },
  {
    id: '5', name: '数据库系统', code: 'CS303', teacher: '陈教授', semester: '2025-2026-2',
    description: '关系数据库理论与SQL实践', documents: [],
    created_at: '2026-02-20T00:00:00Z', updated_at: '2026-05-28T00:00:00Z',
  },
  {
    id: '6', name: '人工智能导论', code: 'CS401', teacher: '刘教授', semester: '2025-2026-2',
    description: '人工智能基础理论与应用', documents: [],
    created_at: '2026-02-20T00:00:00Z', updated_at: '2026-05-20T00:00:00Z',
  },
];

const courseColors = [
  'from-navy-500 to-navy-700',
  'from-emerald-500 to-emerald-700',
  'from-amber-500 to-amber-700',
  'from-violet-500 to-violet-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
];

export default function Courses() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const userId = user?.user_id || '1';
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['1', '3']));
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', teacher: '', semester: '2025-2026-2', description: '' });

  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await course.listCourses(userId);
        // Backend returns {courses: [...]}, not {success, data}
        const data = (res as any)?.courses || (res as any)?.data || res;
        const coursesList = Array.isArray(data) ? data : (data?.courses && Array.isArray(data.courses) ? data.courses : null);
        if (coursesList) {
          setCourses(
            coursesList.map((c: any) => ({
              id: String(c.id ?? ''),
              name: c.name ?? '',
              code: c.code ?? '',
              teacher: c.teacher ?? '',
              semester: c.semester ?? '',
              description: c.description ?? c.schedule ?? '',
              documents: c.documents ?? [],
              created_at: c.created_at ?? new Date().toISOString(),
              updated_at: c.updated_at ?? new Date().toISOString(),
            }))
          );
        }
      } catch {
        // Use mock data
      }
      setLoading(false);
    }
    fetchCourses();
  }, [userId]);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddCourse = async () => {
    if (!form.name || !form.code || !form.teacher) return;
    setSubmitting(true);
    try {
      const res = await course.addCourse({ ...form, user_id: userId });
      // Backend returns {message, course_id}, not {success, data}
      const r = res as any;
      const courseId = r?.course_id ?? r?.data?.course_id ?? r?.id;
      if (courseId !== undefined || r?.message) {
        const newCourse: Course = {
          id: String(courseId ?? `server-${Date.now()}`),
          name: form.name,
          code: form.code,
          teacher: form.teacher,
          semester: form.semester,
          description: form.description,
          documents: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCourses((prev) => [...prev, newCourse]);
        setShowModal(false);
        setForm({ name: '', code: '', teacher: '', semester: '2025-2026-2', description: '' });
      }
    } catch {
      // Add locally on error
      const newCourse: Course = {
        id: `local-${Date.now()}`,
        name: form.name,
        code: form.code,
        teacher: form.teacher,
        semester: form.semester,
        description: form.description,
        documents: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCourses((prev) => [...prev, newCourse]);
      setShowModal(false);
      setForm({ name: '', code: '', teacher: '', semester: '2025-2026-2', description: '' });
    }
    setSubmitting(false);
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
          <h1 className="text-2xl font-bold text-warm-800">我的课程</h1>
          <p className="text-warm-500 text-sm mt-1">共 {courses.length} 门课程</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          添加课程
        </button>
      </div>

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="w-12 h-12 text-warm-300 mx-auto mb-4" />
          <p className="text-warm-500">暂无课程，点击"添加课程"开始学习之旅</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course, idx) => (
            <div
              key={course.id}
              onClick={() => navigate(`/courses/${course.id}`)}
              className="card card-hover cursor-pointer group relative overflow-hidden"
            >
              {/* Color bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${courseColors[idx % courseColors.length]}`} />

              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${courseColors[idx % courseColors.length]} flex items-center justify-center text-white text-sm font-bold`}>
                  {course.name[0]}
                </div>
                <button
                  onClick={(e) => toggleFavorite(e, course.id)}
                  className="p-1 rounded-md hover:bg-warm-100 transition-colors"
                >
                  <Star
                    className={`w-5 h-5 transition-colors ${
                      favorites.has(course.id) ? 'text-amber-400 fill-amber-400' : 'text-warm-300'
                    }`}
                  />
                </button>
              </div>

              <h3 className="font-semibold text-warm-800 mb-1 group-hover:text-navy-600 transition-colors">
                {course.name}
              </h3>
              <p className="text-sm text-warm-500 mb-3 line-clamp-2">{course.description || '暂无描述'}</p>

              <div className="flex items-center gap-4 text-xs text-warm-400">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {course.teacher}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {course.semester}
                </span>
              </div>
              <div className="mt-2">
                <span className="badge-navy">{course.code}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Course Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-card-hover w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-warm-800">添加课程</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-md hover:bg-warm-100">
                <X className="w-5 h-5 text-warm-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">课程名称 *</label>
                <input
                  className="input-field"
                  placeholder="例如：数据结构与算法"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">课程代码 *</label>
                <input
                  className="input-field"
                  placeholder="例如：CS201"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">授课教师 *</label>
                <input
                  className="input-field"
                  placeholder="例如：王教授"
                  value={form.teacher}
                  onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">学期</label>
                <input
                  className="input-field"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">课程描述</label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="简要描述课程内容..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">取消</button>
              <button
                onClick={handleAddCourse}
                disabled={!form.name || !form.code || !form.teacher || submitting}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '添加中...' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
