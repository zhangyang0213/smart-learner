import { useState, useEffect } from 'react';
import {
  Plus,
  Lightbulb,
  Search,
  BookOpen,
  Microscope,
  Zap,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Loader2,
  BookMarked,
  GraduationCap,
  Target,
  Briefcase,
  Edit3,
  X,
  Award,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import { lesson } from '@/services/api';
import type {
  LessonCourseItem,
  LessonOutline,
  LessonContent,
  LessonSection,
  MasteryEvaluation,
  ExamQuestion,
  ExamRecord,
  LearnerProfile,
} from '@/types';

// ============ Mock Data ============
const mockCourses: LessonCourseItem[] = [
  {
    id: 1,
    course_name: '机器学习基础',
    outline: {
      course_name: '机器学习基础',
      units: [
        { name: '什么是机器学习', difficulty: '入门', knowledge_points: ['定义', '分类', '应用场景'], prerequisites: [], order: 0, source: '教材第一章' },
        { name: '线性回归', difficulty: '入门', knowledge_points: ['假设函数', '损失函数', '梯度下降'], prerequisites: ['什么是机器学习'], order: 1, source: '教材第二章' },
        { name: '逻辑回归', difficulty: '进阶', knowledge_points: ['Sigmoid函数', '决策边界', '多分类'], prerequisites: ['线性回归'], order: 2, source: '教材第三章' },
        { name: '决策树与随机森林', difficulty: '进阶', knowledge_points: ['信息增益', '剪枝', '集成学习'], prerequisites: ['逻辑回归'], order: 3, source: '教材第四章' },
        { name: '神经网络基础', difficulty: '高级', knowledge_points: ['感知机', '反向传播', '激活函数'], prerequisites: ['线性回归', '逻辑回归'], order: 4, source: '教材第五章' },
      ],
    },
    status: '进行中',
    created_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 2,
    course_name: '操作系统原理',
    outline: {
      course_name: '操作系统原理',
      units: [
        { name: '操作系统概述', difficulty: '入门', knowledge_points: ['定义', '功能', '发展历史'], prerequisites: [], order: 0, source: '教材第一章' },
        { name: '进程管理', difficulty: '进阶', knowledge_points: ['进程状态', '调度算法', '进程同步'], prerequisites: ['操作系统概述'], order: 1, source: '教材第二章' },
        { name: '内存管理', difficulty: '高级', knowledge_points: ['分页', '分段', '虚拟内存'], prerequisites: ['进程管理'], order: 2, source: '教材第三章' },
      ],
    },
    status: '进行中',
    created_at: '2026-06-10T00:00:00Z',
  },
];

const mockLessonContent: LessonContent = {
  title: '什么是机器学习',
  objectives: ['理解机器学习的基本定义', '区分监督学习与无监督学习', '了解机器学习的典型应用场景'],
  knowledge_points: ['定义', '分类', '应用场景'],
  sections: [
    { type: 'life_intro', title: '生活小现象引入', content: '你有没有想过，为什么购物网站总能推荐你感兴趣的商品？为什么邮箱能自动识别垃圾邮件？这些"聪明"的行为背后，都是机器学习在发挥作用。就像你从小通过看猫的照片学会了认猫一样，计算机也能通过大量数据"学会"识别模式。' },
    { type: 'logic', title: '现象背后的逻辑', content: '这些应用的核心逻辑是：从数据中学习规律，再用规律去预测未知。传统编程是"人写规则，机器执行"，而机器学习是"机器从数据中自己发现规则"。这种范式转换，正是AI革命的本质。' },
    { type: 'course_content', title: '课程核心内容', content: '机器学习是人工智能的一个子领域，它使计算机系统能够从数据中学习和改进，而无需显式编程。根据学习方式的不同，主要分为：监督学习（有标签数据训练）、无监督学习（无标签数据发现结构）、强化学习（通过奖惩信号学习策略）。' },
    { type: 'formal', title: '正式解释', content: 'Mitchell的定义：一个计算机程序从经验E中学习，针对某类任务T和性能度量P，如果在任务T上以P衡量的性能随着经验E的增加而提高，则称该程序对任务T进行了学习。形式化表示为：∃f: X→Y，学习算法从训练集D={(x_i, y_i)}中近似f。' },
    { type: 'deep_dive', title: '深挖理解', content: '机器学习的理论基础涉及统计学习理论，核心问题是泛化能力——模型在未见数据上的表现。偏差-方差权衡是理解模型性能的关键：偏差过高导致欠拟合，方差过高导致过拟合。正则化、交叉验证等技术都是为了解决这一核心矛盾。' },
    { type: 'application', title: '实际应用', content: '1. 推荐系统：Netflix、淘宝的商品推荐\n2. 自然语言处理：机器翻译、智能客服\n3. 计算机视觉：人脸识别、自动驾驶\n4. 医疗健康：疾病预测、药物发现\n5. 金融风控：信用评分、欺诈检测' },
  ],
  quick_check: [
    { question: '机器学习和传统编程的最大区别是什么？', answer_hint: '想想"谁在制定规则"——是人还是机器？' },
    { question: '监督学习和无监督学习的核心区别是什么？', answer_hint: '关键在于训练数据是否有"标签"。' },
  ],
  feedback_entry: { can_retell: '', stuck_at: '', difficulty: 3, next_step: 'continue' },
};

const mockProfile: LearnerProfile = {
  id: 1,
  user_id: 1,
  goals: { main_goal: '掌握机器学习核心算法', target_task: '完成课程项目', application_scene: '数据分析与AI应用开发' },
  background: { mastered: 'Python基础、线性代数', familiar: '概率统计、数据结构', unfamiliar: '深度学习框架', experience: '有1年Python编程经验，做过简单数据分析项目' },
  preferences: { explanation_style: '从直觉到公式，循序渐进', dislike_style: '纯数学推导没有直觉解释', example_scene: '日常生活中的类比', practice_form: '编程实践' },
  knowledge_transfer: [
    { new_field: '梯度下降', analogy: '像蒙眼下山，每一步都往最陡的方向走', method: '直觉类比→几何解释→数学推导', scene: '山地导航', boundary: '非凸函数可能陷入局部最优' },
  ],
};

const mockExamQuestions: ExamQuestion[] = [
  { type: 'single_choice', knowledge_point: '机器学习定义', question: '以下哪个最准确地描述了机器学习？', options: ['让计算机执行预设规则', '从数据中自动学习规律并做出预测', '人工编写所有判断逻辑', '只靠硬件加速计算'], answer: 'B', explanation: '机器学习的核心是从数据中自动学习规律，而非人工编写规则。', source: '教材第一章' },
  { type: 'multi_choice', knowledge_point: '学习分类', question: '以下哪些属于监督学习的应用？', options: ['垃圾邮件分类', '客户分群', '房价预测', '图像聚类'], answer: 'A,C', explanation: '垃圾邮件分类和房价预测需要标签数据，属于监督学习；客户分群和图像聚类不需要标签，属于无监督学习。', source: '教材第一章' },
  { type: 'concept', knowledge_point: '泛化能力', question: '请用自己的话解释什么是"泛化能力"，为什么它对机器学习模型很重要？', answer: '泛化能力指模型对未见数据的预测能力。', explanation: '泛化能力是模型的核心评价指标，一个只在训练集上表现好的模型没有实用价值。', source: '教材第一章' },
  { type: 'case_study', knowledge_point: '应用场景', question: '某银行希望建立一个自动审批贷款的系统。请分析：应该使用什么类型的学习方法？需要什么样的数据？可能面临什么挑战？', answer: '应使用监督学习，需要历史贷款数据（含是否违约标签），挑战包括数据偏差、隐私保护等。', explanation: '贷款审批是典型的分类问题，需要历史标签数据。实际中需注意公平性和可解释性。', source: '教材第一章' },
];

const mockMastery: MasteryEvaluation = {
  mastery_level: '能听懂',
  analysis: '学习者对基本概念有初步理解，但尚不能独立复述核心定义，需要更多练习和巩固。',
  next_action: 'add_practice',
  need_reinforce: true,
};

// ============ Difficulty Badge ============
function DifficultyBadge({ difficulty }: { difficulty: '入门' | '进阶' | '高级' }) {
  const colors = {
    '入门': 'bg-emerald-100 text-emerald-700',
    '进阶': 'bg-amber-100 text-amber-700',
    '高级': 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[difficulty]}`}>
      {difficulty}
    </span>
  );
}

// ============ Mastery Level Bar ============
function MasteryBar({ level }: { level: string }) {
  const levels = ['未接触', '能听懂', '能复述', '能做题', '能应用', '能迁移'];
  const idx = levels.indexOf(level);
  const pct = idx >= 0 ? ((idx + 1) / levels.length) * 100 : 0;
  const color = pct <= 33 ? 'bg-red-400' : pct <= 66 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-warm-400 mb-1">
        <span>掌握度</span>
        <span className="font-medium text-warm-600">{level}</span>
      </div>
      <div className="w-full h-2 bg-warm-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ============ Section Icon ============
function SectionIcon({ type }: { type: LessonSection['type'] }) {
  const iconMap: Record<string, React.ReactNode> = {
    life_intro: <Lightbulb size={20} className="text-amber-500" />,
    logic: <Search size={20} className="text-blue-500" />,
    course_content: <BookOpen size={20} className="text-navy-600" />,
    formal: <BookMarked size={20} className="text-purple-500" />,
    deep_dive: <Microscope size={20} className="text-indigo-500" />,
    application: <Zap size={20} className="text-emerald-500" />,
    quick_check: <CheckCircle2 size={20} className="text-teal-500" />,
    feedback: <MessageSquare size={20} className="text-rose-500" />,
  };
  return <>{iconMap[type] || <BookOpen size={20} className="text-warm-400" />}</>;
}

// ============ Main Component ============
type ViewMode = 'list' | 'create' | 'lesson' | 'exam';

export default function Lesson() {
  // Course state
  const [courses, setCourses] = useState<LessonCourseItem[]>(mockCourses);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | null>(null);

  // View state
  const [view, setView] = useState<ViewMode>('list');

  // Course creation
  const [courseName, setCourseName] = useState('');
  const [materials, setMaterials] = useState('');
  const [creating, setCreating] = useState(false);

  // Lesson content
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);

  // Mastery
  const [mastery, setMastery] = useState<MasteryEvaluation | null>(null);

  // Feedback form
  const [feedbackForm, setFeedbackForm] = useState({
    can_retell: '',
    stuck_at: '',
    difficulty: 3,
    next_step: 'continue' as string,
  });

  // Exam
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examGraded, setExamGraded] = useState<ExamRecord | null>(null);
  const [examLoading, setExamLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submittingExam, setSubmittingExam] = useState(false);

  // Profile
  const [profile, setProfile] = useState<LearnerProfile>(mockProfile);
  const [editingProfile, setEditingProfile] = useState(false);

  // Quick check expand
  const [expandedChecks, setExpandedChecks] = useState<Set<number>>(new Set());

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await lesson.getProfile(1);
        if (res.success && res.data) setProfile(res.data);
      } catch { /* use mock */ }
    }
    fetchProfile();
  }, []);

  // Handle course creation
  const handleCreateCourse = async () => {
    if (!courseName.trim() || !materials.trim()) return;
    setCreating(true);
    try {
      const res = await lesson.generateOutline(1, [materials], courseName);
      if (res.success && res.data) {
        const newCourse: LessonCourseItem = {
          id: Date.now(),
          course_name: courseName,
          outline: res.data,
          status: '新建',
          created_at: new Date().toISOString(),
        };
        setCourses(prev => [...prev, newCourse]);
        setSelectedCourseId(newCourse.id);
        setView('list');
        setCourseName('');
        setMaterials('');
      }
    } catch { /* mock fallback */ }
    setCreating(false);
  };

  // Handle unit selection -> load lesson
  const handleSelectUnit = async (unitIndex: number) => {
    setSelectedUnitIndex(unitIndex);
    setView('lesson');
    setLessonLoading(true);
    setMastery(null);
    setExpandedChecks(new Set());
    try {
      if (selectedCourseId) {
        const res = await lesson.generateLesson(selectedCourseId, unitIndex);
        if (res.success && res.data) {
          setLessonContent(res.data);
          setLessonLoading(false);
          return;
        }
      }
    } catch { /* fallback to mock */ }
    // Use mock data
    setTimeout(() => {
      setLessonContent({ ...mockLessonContent, title: selectedCourse?.outline.units[unitIndex]?.name || mockLessonContent.title });
      setLessonLoading(false);
    }, 800);
  };

  // Handle feedback submit
  const handleSubmitFeedback = async () => {
    if (!selectedCourseId || selectedUnitIndex === null) return;
    try {
      const res = await lesson.evaluateMastery(selectedCourseId, selectedUnitIndex, feedbackForm);
      if (res.success && res.data) {
        setMastery(res.data);
        return;
      }
    } catch { /* fallback to mock */ }
    setMastery(mockMastery);
  };

  // Handle exam
  const handleStartExam = async () => {
    if (!selectedCourseId) return;
    setExamLoading(true);
    setExamGraded(null);
    setExamAnswers({});
    setCurrentQuestionIndex(0);
    setView('exam');
    try {
      const res = await lesson.generateExam(selectedCourseId);
      if (res.success && res.data && res.data.questions.length > 0) {
        setExamQuestions(res.data.questions);
        setExamLoading(false);
        return;
      }
    } catch { /* fallback to mock */ }
    setTimeout(() => {
      setExamQuestions(mockExamQuestions);
      setExamLoading(false);
    }, 600);
  };

  // Handle exam submit
  const handleSubmitExam = async () => {
    if (!selectedCourseId) return;
    setSubmittingExam(true);
    try {
      // Find exam id from the generated exam
      const res = await lesson.gradeExam(Date.now(), examAnswers);
      if (res.success && res.data) {
        setExamGraded(res.data);
        setSubmittingExam(false);
        return;
      }
    } catch { /* fallback to mock */ }
    // Mock grading
    setTimeout(() => {
      const graded: ExamRecord = {
        id: 1,
        lesson_course_id: selectedCourseId,
        exam_type: 'final',
        questions: examQuestions,
        user_answers: examAnswers,
        score: 75,
        graded: examQuestions.map((q, i) => ({
          question_index: i,
          correct: examAnswers[i] === q.answer,
          user_answer: examAnswers[i],
          correct_answer: q.answer,
        })),
        round_num: 1,
      };
      setExamGraded(graded);
      setSubmittingExam(false);
    }, 800);
  };

  // Handle consolidation
  const handleConsolidation = async () => {
    if (!examGraded) return;
    setExamLoading(true);
    try {
      const res = await lesson.generateConsolidation(examGraded.id);
      if (res.success && res.data) {
        setExamQuestions(res.data.questions);
        setExamGraded(null);
        setExamAnswers({});
        setCurrentQuestionIndex(0);
        setExamLoading(false);
        return;
      }
    } catch { /* fallback */ }
    setExamLoading(false);
  };

  // Navigate between units
  const handlePrevUnit = () => {
    if (selectedUnitIndex !== null && selectedUnitIndex > 0) {
      handleSelectUnit(selectedUnitIndex - 1);
    }
  };
  const handleNextUnit = () => {
    if (selectedCourse && selectedUnitIndex !== null && selectedUnitIndex < selectedCourse.outline.units.length - 1) {
      handleSelectUnit(selectedUnitIndex + 1);
    }
  };

  // ============ Render: Left Panel ============
  const renderLeftPanel = () => (
    <div className="w-72 flex-shrink-0 bg-white border-r border-warm-200/60 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-warm-200/60">
        <button
          onClick={() => setView('create')}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors font-medium text-sm"
        >
          <Plus size={16} />
          创建新课程
        </button>
      </div>

      {/* Course List */}
      <div className="flex-1 overflow-y-auto">
        {courses.map(course => (
          <div key={course.id} className="border-b border-warm-100">
            <button
              onClick={() => { setSelectedCourseId(course.id); setSelectedUnitIndex(null); setView('list'); }}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                selectedCourseId === course.id ? 'bg-navy-50 text-navy-700' : 'hover:bg-warm-50 text-warm-700'
              }`}
            >
              <BookOpen size={18} className={selectedCourseId === course.id ? 'text-navy-600' : 'text-warm-400'} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{course.course_name}</p>
                <p className="text-xs text-warm-400 mt-0.5">{course.outline.units.length} 个单元 · {course.status}</p>
              </div>
              <ChevronRight size={16} className="text-warm-300" />
            </button>

            {/* Outline Timeline */}
            {selectedCourseId === course.id && (
              <div className="px-4 pb-3 space-y-0">
                {course.outline.units.map((unit, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectUnit(idx)}
                    className={`w-full text-left flex items-start gap-3 py-2 px-2 rounded-lg transition-colors group ${
                      selectedUnitIndex === idx ? 'bg-emerald-50' : 'hover:bg-warm-50'
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center mt-1">
                      <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                        selectedUnitIndex === idx ? 'bg-emerald-500 border-emerald-500' : 'border-warm-300 bg-white'
                      }`} />
                      {idx < course.outline.units.length - 1 && (
                        <div className="w-0.5 h-6 bg-warm-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${selectedUnitIndex === idx ? 'text-emerald-700 font-medium' : 'text-warm-600'}`}>
                        {unit.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <DifficultyBadge difficulty={unit.difficulty} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ============ Render: Course Creation ============
  const renderCreateView = () => (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <div className="bg-white rounded-xl shadow-card p-8">
        <h2 className="text-xl font-bold text-navy-600 mb-6 flex items-center gap-2">
          <Plus size={24} className="text-emerald-500" />
          创建新课程
        </h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1.5">课程名称</label>
            <input
              type="text"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              placeholder="例如：机器学习基础"
              className="w-full px-4 py-2.5 border border-warm-200 rounded-lg focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 outline-none transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1.5">课程材料</label>
            <textarea
              value={materials}
              onChange={e => setMaterials(e.target.value)}
              placeholder="粘贴课程大纲、教材目录、学习资料等..."
              rows={10}
              className="w-full px-4 py-2.5 border border-warm-200 rounded-lg focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 outline-none transition text-sm resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setView('list')}
              className="px-5 py-2.5 border border-warm-200 text-warm-600 rounded-lg hover:bg-warm-50 transition text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleCreateCourse}
              disabled={creating || !courseName.trim() || !materials.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
            >
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  正在生成课程脉络...
                </>
              ) : (
                '生成课程脉络'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ============ Render: Lesson View ============
  const renderLessonView = () => {
    if (lessonLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-navy-600 mx-auto mb-4" />
            <p className="text-warm-500">正在生成课程内容...</p>
          </div>
        </div>
      );
    }

    if (!lessonContent) return null;

    return (
      <div className="flex-1 overflow-y-auto animate-fadeIn">
        {/* Top bar: mastery + navigation */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-warm-200/60 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              {mastery && <MasteryBar level={mastery.mastery_level} />}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handlePrevUnit}
                disabled={selectedUnitIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-warm-600 border border-warm-200 rounded-lg hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
                上一课
              </button>
              <button
                onClick={handleNextUnit}
                disabled={!selectedCourse || selectedUnitIndex === selectedCourse.outline.units.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-warm-600 border border-warm-200 rounded-lg hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                下一课
                <ChevronRight size={16} />
              </button>
              <button
                onClick={handleStartExam}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition"
              >
                <Award size={16} />
                开始考试
              </button>
            </div>
          </div>
        </div>

        {/* Lesson content */}
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Title & Objectives */}
          <h1 className="text-2xl font-bold text-navy-600 mb-4">{lessonContent.title}</h1>

          <div className="bg-navy-50 rounded-xl p-5 mb-8">
            <h3 className="text-sm font-semibold text-navy-700 mb-2 flex items-center gap-2">
              <Target size={16} />
              学习目标
            </h3>
            <ul className="space-y-1.5">
              {lessonContent.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-navy-600">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {lessonContent.sections.map((section, i) => (
              <div key={i} className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-6 border border-warm-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-warm-50 flex items-center justify-center">
                    <SectionIcon type={section.type} />
                  </div>
                  <h3 className="text-base font-semibold text-warm-800">{section.title}</h3>
                </div>
                <div className="text-sm text-warm-600 leading-relaxed whitespace-pre-line pl-12">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Check */}
          {lessonContent.quick_check.length > 0 && (
            <div className="mt-8">
              <h3 className="text-base font-semibold text-warm-800 mb-4 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-teal-500" />
                快速检查
              </h3>
              <div className="space-y-3">
                {lessonContent.quick_check.map((qc, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-card border border-warm-100 overflow-hidden">
                    <button
                      onClick={() => setExpandedChecks(prev => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      })}
                      className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-warm-50 transition"
                    >
                      <span className="text-sm font-medium text-warm-700">{qc.question}</span>
                      {expandedChecks.has(i) ? <ChevronUp size={16} className="text-warm-400" /> : <ChevronDown size={16} className="text-warm-400" />}
                    </button>
                    {expandedChecks.has(i) && (
                      <div className="px-5 pb-4 pt-1 border-t border-warm-100">
                        <p className="text-sm text-emerald-600 flex items-start gap-2">
                          <Lightbulb size={14} className="mt-0.5 flex-shrink-0" />
                          提示：{qc.answer_hint}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Entry */}
          <div className="mt-8 bg-white rounded-xl shadow-card border border-warm-100 p-6">
            <h3 className="text-base font-semibold text-warm-800 mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-rose-500" />
              反馈入口
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">你能复述这节课的核心内容吗？</label>
                <textarea
                  value={feedbackForm.can_retell}
                  onChange={e => setFeedbackForm(prev => ({ ...prev, can_retell: e.target.value }))}
                  rows={3}
                  placeholder="用自己的话描述..."
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">你卡在哪里了？</label>
                <input
                  type="text"
                  value={feedbackForm.stuck_at}
                  onChange={e => setFeedbackForm(prev => ({ ...prev, stuck_at: e.target.value }))}
                  placeholder="描述你不理解的部分..."
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  难度感受: <span className="text-emerald-600 font-bold">{feedbackForm.difficulty}</span>/5
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={feedbackForm.difficulty}
                  onChange={e => setFeedbackForm(prev => ({ ...prev, difficulty: Number(e.target.value) }))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-warm-400">
                  <span>很简单</span><span>非常难</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">下一步</label>
                <select
                  value={feedbackForm.next_step}
                  onChange={e => setFeedbackForm(prev => ({ ...prev, next_step: e.target.value }))}
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 outline-none text-sm"
                >
                  <option value="continue">继续下一课</option>
                  <option value="supplement">补充解释</option>
                  <option value="change_example">换个例子</option>
                  <option value="add_practice">增加练习</option>
                  <option value="downgrade">降低难度</option>
                </select>
              </div>
              <button
                onClick={handleSubmitFeedback}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm font-medium"
              >
                <Send size={14} />
                提交反馈
              </button>
            </div>

            {/* Mastery result */}
            {mastery && (
              <div className={`mt-5 p-4 rounded-lg border ${
                mastery.need_reinforce ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {mastery.need_reinforce ? <AlertCircle size={16} className="text-amber-600" /> : <CheckCircle2 size={16} className="text-emerald-600" />}
                  <span className="text-sm font-semibold text-warm-800">掌握度评估: {mastery.mastery_level}</span>
                </div>
                <p className="text-sm text-warm-600 mb-2">{mastery.analysis}</p>
                <p className="text-xs text-warm-500">建议操作: {mastery.next_action}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============ Render: Exam View ============
  const renderExamView = () => {
    if (examLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-navy-600 mx-auto mb-4" />
            <p className="text-warm-500">正在生成试卷...</p>
          </div>
        </div>
      );
    }

    const q = examQuestions[currentQuestionIndex];
    if (!q) return null;

    return (
      <div className="flex-1 overflow-y-auto animate-fadeIn">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Exam header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-navy-600 flex items-center gap-2">
              <Award size={24} className="text-emerald-500" />
              课程测验
            </h2>
            <span className="text-sm text-warm-500">
              第 {currentQuestionIndex + 1} / {examQuestions.length} 题
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-warm-100 rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / examQuestions.length) * 100}%` }}
            />
          </div>

          {/* Question card */}
          <div className="bg-white rounded-xl shadow-card border border-warm-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                q.type === 'single_choice' ? 'bg-blue-100 text-blue-700' :
                q.type === 'multi_choice' ? 'bg-purple-100 text-purple-700' :
                q.type === 'concept' ? 'bg-teal-100 text-teal-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {q.type === 'single_choice' ? '单选题' : q.type === 'multi_choice' ? '多选题' : q.type === 'concept' ? '概念题' : '案例分析'}
              </span>
              <span className="text-xs text-warm-400">知识点: {q.knowledge_point}</span>
            </div>
            <p className="text-base font-medium text-warm-800 mb-5">{q.question}</p>

            {/* Single choice */}
            {q.type === 'single_choice' && q.options && (
              <div className="space-y-2.5">
                {q.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isSelected = examAnswers[currentQuestionIndex] === letter;
                  const isCorrect = examGraded && q.answer.includes(letter);
                  const isWrong = examGraded && isSelected && !q.answer.includes(letter);
                  return (
                    <button
                      key={i}
                      onClick={() => !examGraded && setExamAnswers(prev => ({ ...prev, [currentQuestionIndex]: letter }))}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition text-sm ${
                        examGraded
                          ? isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                            isWrong ? 'bg-red-50 border-red-300 text-red-700' :
                            'border-warm-200 text-warm-600'
                          : isSelected
                            ? 'bg-navy-50 border-navy-300 text-navy-700'
                            : 'border-warm-200 text-warm-600 hover:bg-warm-50'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                        examGraded
                          ? isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' :
                            isWrong ? 'bg-red-500 border-red-500 text-white' :
                            'border-warm-300 text-warm-500'
                          : isSelected ? 'bg-navy-600 border-navy-600 text-white' : 'border-warm-300 text-warm-500'
                      }`}>
                        {letter}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multi choice */}
            {q.type === 'multi_choice' && q.options && (
              <div className="space-y-2.5">
                {q.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const currentAnswer = examAnswers[currentQuestionIndex] || '';
                  const isSelected = currentAnswer.includes(letter);
                  const correctLetters = q.answer.split(',');
                  const isCorrect = examGraded && correctLetters.includes(letter);
                  const isWrong = examGraded && isSelected && !correctLetters.includes(letter);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (examGraded) return;
                        const current = examAnswers[currentQuestionIndex] || '';
                        const letters = current ? current.split(',') : [];
                        const newLetters = isSelected
                          ? letters.filter(l => l !== letter)
                          : [...letters, letter].sort();
                        setExamAnswers(prev => ({ ...prev, [currentQuestionIndex]: newLetters.join(',') }));
                      }}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition text-sm ${
                        examGraded
                          ? isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                            isWrong ? 'bg-red-50 border-red-300 text-red-700' :
                            'border-warm-200 text-warm-600'
                          : isSelected
                            ? 'bg-navy-50 border-navy-300 text-navy-700'
                            : 'border-warm-200 text-warm-600 hover:bg-warm-50'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                        examGraded
                          ? isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' :
                            isWrong ? 'bg-red-500 border-red-500 text-white' :
                            'border-warm-300 text-warm-500'
                          : isSelected ? 'bg-navy-600 border-navy-600 text-white' : 'border-warm-300 text-warm-500'
                      }`}>
                        {isSelected ? '✓' : letter}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Concept explanation */}
            {q.type === 'concept' && (
              <textarea
                value={examAnswers[currentQuestionIndex] || ''}
                onChange={e => setExamAnswers(prev => ({ ...prev, [currentQuestionIndex]: e.target.value }))}
                disabled={!!examGraded}
                placeholder="请用自己的话解释..."
                rows={5}
                className="w-full px-4 py-3 border border-warm-200 rounded-lg focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 outline-none text-sm resize-none disabled:bg-warm-50"
              />
            )}

            {/* Case study */}
            {q.type === 'case_study' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-amber-700 mb-1">案例分析</p>
                  <p className="text-sm text-amber-800">{q.question}</p>
                </div>
                <textarea
                  value={examAnswers[currentQuestionIndex] || ''}
                  onChange={e => setExamAnswers(prev => ({ ...prev, [currentQuestionIndex]: e.target.value }))}
                  disabled={!!examGraded}
                  placeholder="请分析并回答..."
                  rows={6}
                  className="w-full px-4 py-3 border border-warm-200 rounded-lg focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 outline-none text-sm resize-none disabled:bg-warm-50"
                />
              </div>
            )}

            {/* Explanation after grading */}
            {examGraded && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-700 mb-1">解析</p>
                <p className="text-sm text-blue-800">{q.explanation}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-1 px-4 py-2 text-sm text-warm-600 border border-warm-200 rounded-lg hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
              上一题
            </button>

            {!examGraded ? (
              currentQuestionIndex === examQuestions.length - 1 ? (
                <button
                  onClick={handleSubmitExam}
                  disabled={submittingExam}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition text-sm font-medium"
                >
                  {submittingExam ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  提交答案
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-warm-600 border border-warm-200 rounded-lg hover:bg-warm-50 transition"
                >
                  下一题
                  <ChevronRight size={16} />
                </button>
              )
            ) : (
              <div className="flex items-center gap-3">
                {examGraded.score < 80 && (
                  <button
                    onClick={handleConsolidation}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm font-medium"
                  >
                    生成巩固卷
                  </button>
                )}
                <button
                  onClick={() => { setView('lesson'); setExamGraded(null); }}
                  className="flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition text-sm font-medium"
                >
                  返回课程
                </button>
              </div>
            )}
          </div>

          {/* Score display */}
          {examGraded && (
            <div className="mt-8 bg-white rounded-xl shadow-card border border-warm-100 p-6 text-center">
              <div className={`text-5xl font-bold mb-2 ${
                examGraded.score >= 80 ? 'text-emerald-500' : examGraded.score >= 60 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {examGraded.score}
              </div>
              <p className="text-warm-500 text-sm">总分</p>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <span className="text-emerald-600">
                  正确: {examGraded.graded.filter((g: any) => g.correct).length}
                </span>
                <span className="text-red-600">
                  错误: {examGraded.graded.filter((g: any) => !g.correct).length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ Render: Right Panel ============
  const renderRightPanel = () => (
    <div className="w-72 flex-shrink-0 bg-white border-l border-warm-200/60 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-warm-800 flex items-center gap-2">
            <GraduationCap size={16} className="text-navy-600" />
            学习者画像
          </h3>
          <button
            onClick={() => setEditingProfile(!editingProfile)}
            className="p-1.5 text-warm-400 hover:text-navy-600 hover:bg-warm-50 rounded-lg transition"
          >
            {editingProfile ? <X size={14} /> : <Edit3 size={14} />}
          </button>
        </div>

        {/* Goals */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Target size={12} /> 学习目标
          </h4>
          <div className="space-y-1.5 text-sm">
            <div className="bg-navy-50 rounded-lg p-3">
              <p className="text-xs text-navy-500 mb-0.5">主要目标</p>
              <p className="text-navy-700 font-medium text-xs">{profile.goals.main_goal}</p>
            </div>
            <div className="bg-warm-50 rounded-lg p-3">
              <p className="text-xs text-warm-500 mb-0.5">目标任务</p>
              <p className="text-warm-700 text-xs">{profile.goals.target_task}</p>
            </div>
            <div className="bg-warm-50 rounded-lg p-3">
              <p className="text-xs text-warm-500 mb-0.5">应用场景</p>
              <p className="text-warm-700 text-xs">{profile.goals.application_scene}</p>
            </div>
          </div>
        </div>

        {/* Background */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Briefcase size={12} /> 知识背景
          </h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-medium flex-shrink-0">已掌握</span>
              <span className="text-warm-600">{profile.background.mastered}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-medium flex-shrink-0">较熟悉</span>
              <span className="text-warm-600">{profile.background.familiar}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-500 font-medium flex-shrink-0">不熟悉</span>
              <span className="text-warm-600">{profile.background.unfamiliar}</span>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Lightbulb size={12} /> 学习偏好
          </h4>
          <div className="space-y-1.5 text-xs text-warm-600">
            <p><span className="text-warm-400">讲解风格:</span> {profile.preferences.explanation_style}</p>
            <p><span className="text-warm-400">示例场景:</span> {profile.preferences.example_scene}</p>
            <p><span className="text-warm-400">练习形式:</span> {profile.preferences.practice_form}</p>
          </div>
        </div>

        {/* Knowledge Transfer */}
        {profile.knowledge_transfer.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Zap size={12} /> 知识迁移
            </h4>
            <div className="space-y-2">
              {profile.knowledge_transfer.map((kt, i) => (
                <div key={i} className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-700 mb-1">{kt.new_field}</p>
                  <p className="text-xs text-emerald-600 mb-1">类比: {kt.analogy}</p>
                  <p className="text-xs text-warm-500">方法: {kt.method}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit profile form */}
        {editingProfile && (
          <div className="mt-4 pt-4 border-t border-warm-200 space-y-3">
            <h4 className="text-xs font-semibold text-navy-600">编辑画像</h4>
            <div>
              <label className="text-xs text-warm-500">主要目标</label>
              <input
                type="text"
                value={profile.goals.main_goal}
                onChange={e => setProfile(prev => ({ ...prev, goals: { ...prev.goals, main_goal: e.target.value } }))}
                className="w-full px-2 py-1.5 text-xs border border-warm-200 rounded-lg focus:ring-1 focus:ring-navy-500/20 focus:border-navy-500 outline-none mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-warm-500">已掌握知识</label>
              <input
                type="text"
                value={profile.background.mastered}
                onChange={e => setProfile(prev => ({ ...prev, background: { ...prev.background, mastered: e.target.value } }))}
                className="w-full px-2 py-1.5 text-xs border border-warm-200 rounded-lg focus:ring-1 focus:ring-navy-500/20 focus:border-navy-500 outline-none mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-warm-500">讲解偏好</label>
              <input
                type="text"
                value={profile.preferences.explanation_style}
                onChange={e => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, explanation_style: e.target.value } }))}
                className="w-full px-2 py-1.5 text-xs border border-warm-200 rounded-lg focus:ring-1 focus:ring-navy-500/20 focus:border-navy-500 outline-none mt-1"
              />
            </div>
            <button
              onClick={async () => {
                try {
                  await lesson.updateProfile(profile.user_id, profile);
                } catch { /* ignore */ }
                setEditingProfile(false);
              }}
              className="w-full py-2 bg-navy-600 text-white text-xs rounded-lg hover:bg-navy-700 transition font-medium"
            >
              保存
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ============ Render: Default (course list) ============
  const renderDefaultView = () => (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-navy-600 mb-2">课程学习</h2>
        <p className="text-warm-500 mb-8">选择课程开始学习，或创建新的课程</p>

        {selectedCourse ? (
          <div>
            <h3 className="text-lg font-semibold text-warm-800 mb-4">{selectedCourse.course_name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedCourse.outline.units.map((unit, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectUnit(idx)}
                  className="text-left bg-white rounded-xl shadow-card hover:shadow-card-hover border border-warm-100 p-5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-warm-400">单元 {idx + 1}</span>
                    <DifficultyBadge difficulty={unit.difficulty} />
                  </div>
                  <h4 className="text-base font-semibold text-warm-800 group-hover:text-navy-600 transition mb-2">
                    {unit.name}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {unit.knowledge_points.map((kp, kpi) => (
                      <span key={kpi} className="text-xs bg-warm-100 text-warm-600 px-2 py-0.5 rounded-full">
                        {kp}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen size={48} className="text-warm-200 mx-auto mb-4" />
            <p className="text-warm-400">从左侧选择一个课程，或创建新课程</p>
          </div>
        )}
      </div>
    </div>
  );

  // ============ Main Render ============
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {renderLeftPanel()}

      {/* Main content */}
      {view === 'create' && renderCreateView()}
      {view === 'lesson' && renderLessonView()}
      {view === 'exam' && renderExamView()}
      {view === 'list' && renderDefaultView()}

      {renderRightPanel()}
    </div>
  );
}
