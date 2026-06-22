import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  BookOpen,
  MessageSquare,
  FileText,
  Brain,
  Send,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  Microscope,
  Zap,
  Award,
  GraduationCap,
  X,
  File,
  AlertCircle,
  BookMarked,
  ArrowRight,
  BarChart3,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { lesson } from '@/services/api';
import { useAppStore } from '@/store';
import type {
  LessonOutline,
  LessonContent,
  LessonSection,
  ExamQuestion,
  MasteryEvaluation,
} from '@/types';

// ============ Types ============
interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; score: number }[];
}

interface FileRecord {
  name: string;
  size: number;
  status: string;
  chars?: number;
  error?: string;
}

// ============ Mock Data ============
const mockOutline: LessonOutline = {
  course_name: '数据结构与算法',
  units: [
    { name: '算法基础与复杂度分析', difficulty: '入门', knowledge_points: ['时间复杂度', '空间复杂度', '大O表示法', '最好/最坏/平均情况'], prerequisites: [], order: 0, source: '教材第一章' },
    { name: '线性表：数组与链表', difficulty: '入门', knowledge_points: ['顺序存储', '链式存储', '插入删除', '遍历查找'], prerequisites: ['算法基础与复杂度分析'], order: 1, source: '教材第二章' },
    { name: '栈与队列', difficulty: '进阶', knowledge_points: ['LIFO/FIFO', '递归与栈', '双端队列', '应用场景'], prerequisites: ['线性表：数组与链表'], order: 2, source: '教材第三章' },
    { name: '树与二叉树', difficulty: '进阶', knowledge_points: ['二叉树遍历', 'BST', 'AVL树', '堆'], prerequisites: ['栈与队列'], order: 3, source: '教材第四章' },
    { name: '图论基础', difficulty: '高级', knowledge_points: ['BFS/DFS', '最短路径', '最小生成树', '拓扑排序'], prerequisites: ['树与二叉树'], order: 4, source: '教材第五章' },
  ],
};

const mockLessonContent: LessonContent = {
  title: '算法基础与复杂度分析',
  objectives: ['理解算法的定义与特性', '掌握大O表示法', '能分析常见算法的时间复杂度', '区分最好、最坏和平均情况'],
  knowledge_points: ['时间复杂度', '空间复杂度', '大O表示法', '最好/最坏/平均情况'],
  sections: [
    { type: 'life_intro', title: '生活引入', content: '想象你在图书馆找一本书。你可以一本一本地翻（线性查找），也可以先看分类标签再定位（二分查找）。两种方法都能找到书，但速度天差地别。算法就是解决问题的"方法"，而复杂度分析就是衡量方法"快不快"的尺子。' },
    { type: 'course_content', title: '正式讲解', content: '算法是解决特定问题的一系列有限步骤。时间复杂度用大O表示法描述：O(1)常数时间、O(log n)对数时间、O(n)线性时间、O(n log n)线性对数时间、O(n²)平方时间。空间复杂度衡量算法运行过程中所需的额外内存空间。' },
    { type: 'deep_dive', title: '深挖理解', content: '大O表示法关注的是增长趋势，忽略常数因子和低阶项。例如 3n² + 2n + 1 = O(n²)。最好情况（Best Case）是算法在最有利输入下的表现，最坏情况（Worst Case）是最不利输入下的表现，平均情况（Average Case）是所有可能输入的期望表现。' },
    { type: 'application', title: '实际应用', content: '1. 排序算法选择：小数据用插入排序O(n²)，大数据用归并排序O(n log n)\n2. 数据库索引：B+树索引使查询从O(n)降到O(log n)\n3. 哈希表查找：平均O(1)，最坏O(n)\n4. 图的遍历：BFS/DFS都是O(V+E)' },
  ],
  quick_check: [
    { question: 'O(n²)和O(n log n)哪个增长更快？', answer_hint: '当n足够大时，n²远大于n log n，所以O(n²)增长更快。' },
    { question: '二分查找的时间复杂度是多少？为什么？', answer_hint: 'O(log n)，因为每次比较都将搜索范围缩小一半。' },
  ],
  feedback_entry: { can_retell: '', stuck_at: '', difficulty: 3, next_step: 'continue' },
};

const mockQuizQuestions: ExamQuestion[] = [
  { type: 'single_choice', knowledge_point: '时间复杂度', question: '以下哪个时间复杂度最优？', options: ['O(n²)', 'O(n log n)', 'O(n)', 'O(log n)'], answer: 'D', explanation: 'O(log n)增长最慢，性能最优。', source: '教材第一章' },
  { type: 'single_choice', knowledge_point: '大O表示法', question: '3n² + 2n + 1 的大O表示是？', options: ['O(3n²)', 'O(n² + n)', 'O(n²)', 'O(6n²)'], answer: 'C', explanation: '大O表示法忽略常数系数和低阶项，3n² + 2n + 1 = O(n²)。', source: '教材第一章' },
  { type: 'single_choice', knowledge_point: '空间复杂度', question: '以下哪种操作通常需要O(n)的额外空间？', options: ['原地冒泡排序', '归并排序', '二分查找', '快速排序（原地）'], answer: 'B', explanation: '归并排序需要O(n)的辅助数组来合并子数组。', source: '教材第一章' },
  { type: 'multi_choice', knowledge_point: '复杂度分析', question: '以下哪些算法的平均时间复杂度为O(n log n)？', options: ['快速排序', '归并排序', '冒泡排序', '堆排序'], answer: 'A,B,D', explanation: '快速排序平均O(n log n)，归并排序始终O(n log n)，堆排序O(n log n)，冒泡排序O(n²)。', source: '教材第一章' },
  { type: 'single_choice', knowledge_point: '最好/最坏情况', question: '线性查找在数组中查找元素，最好情况的时间复杂度是？', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 'A', explanation: '最好情况是第一个元素就是目标，只需一次比较，O(1)。', source: '教材第一章' },
];

const mockRawText = `=== 第1页 ===
数据结构与算法
第一章：算法基础

=== 第2页 ===
1.1 算法的定义
算法是解决特定问题的一系列有限步骤

=== 第3页 ===
1.2 时间复杂度
大O表示法：O(1), O(log n), O(n), O(n log n), O(n²)

=== 第4页 ===
1.3 空间复杂度
衡量算法运行过程中所需的额外内存空间

=== 第5页 ===
1.4 最好/最坏/平均情况
Best Case / Worst Case / Average Case`;

// ============ Difficulty Badge ============
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    '入门': 'bg-emerald-100 text-emerald-700',
    '进阶': 'bg-amber-100 text-amber-700',
    '高级': 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[difficulty] || 'bg-warm-100 text-warm-600'}`}>
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
        <span className="font-medium text-warm-600">{level || '未接触'}</span>
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
    logic: <Zap size={20} className="text-blue-500" />,
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
type Step = 'upload' | 'learning';
type Tab = 'chat' | 'content' | 'quiz' | 'raw';

export default function Lesson() {
  const user = useAppStore((s) => s.user);
  const userId = Number(user?.user_id) || 1;

  // Step state
  const [step, setStep] = useState<Step>('upload');

  // Upload state
  const [courseName, setCourseName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Course state
  const [outline, setOutline] = useState<LessonOutline | null>(null);
  const [lessonCourseId, setLessonCourseId] = useState<number | null>(null);
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
  const [rawTexts, setRawTexts] = useState<string[]>([]);
  const [selectedRawFile, setSelectedRawFile] = useState(0);

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: '你好！我已经学习了你的课件内容，有什么问题尽管问我吧！' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Lesson content state
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [expandedChecks, setExpandedChecks] = useState<Set<number>>(new Set());

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<ExamQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);

  // Mastery state
  const [mastery, setMastery] = useState<MasteryEvaluation | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    can_retell: '',
    stuck_at: '',
    difficulty: 3,
    next_step: 'continue',
  });

  // Stats
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [quizzesTaken, setQuizzesTaken] = useState(0);
  const [completedUnits, setCompletedUnits] = useState<Set<number>>(new Set());

  const currentUnit = outline?.units[currentUnitIndex];

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ============ Upload & Learn ============
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartLearn = async () => {
    if (!courseName.trim() || files.length === 0) return;
    setUploading(true);
    setUploadProgress('正在解析课件...');

    try {
      const res = await lesson.uploadAndLearn(String(userId), courseName, files);
      if (res.data || res.lesson_course_id) {
        const data = res.data || res;
        setUploadProgress('正在生成课程脉络...');
        await new Promise(r => setTimeout(r, 500));
        setUploadProgress('课程准备完成！');

        if (data.outline) setOutline(data.outline);
        if (data.lesson_course_id) setLessonCourseId(data.lesson_course_id);
        if (data.files) {
          const texts = data.files
            .filter((f: FileRecord) => f.status === 'parsed')
            .map((f: FileRecord) => `[${f.name}] - 已解析 ${f.chars} 字符`);
          setRawTexts(texts.length > 0 ? texts : [mockRawText]);
        }

        setTimeout(() => setStep('learning'), 600);
        return;
      }
    } catch {
      // Fallback to mock
    }

    // Mock fallback
    setUploadProgress('正在生成课程脉络...');
    await new Promise(r => setTimeout(r, 800));
    setUploadProgress('课程准备完成！');
    setOutline(mockOutline);
    setLessonCourseId(Date.now());
    setRawTexts([mockRawText]);

    setTimeout(() => setStep('learning'), 600);
    setUploading(false);
  };

  // ============ Chat ============
  const handleSendChat = async () => {
    if (!chatInput.trim() || chatStreaming) return;
    const question = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: question }]);
    setChatStreaming(true);
    setQuestionsAsked(prev => prev + 1);

    let fullAnswer = '';
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      if (lessonCourseId) {
        await lesson.chatAboutCourseStream(
          lessonCourseId,
          question,
          String(userId),
          (chunk) => {
            fullAnswer += chunk;
            setChatMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: fullAnswer };
              return updated;
            });
          }
        );
        setChatStreaming(false);
        return;
      }
    } catch {
      // Fallback to mock
    }

    // Mock streaming response
    const mockResponses: Record<string, string> = {
      default: '根据课件内容，这是一个很好的问题。数据结构与算法是计算机科学的基础，掌握好复杂度分析对于选择合适的算法至关重要。建议你从大O表示法开始，逐步理解不同复杂度级别的含义和适用场景。',
    };
    const answer = question.includes('复杂度')
      ? '时间复杂度用大O表示法来描述算法的运行时间随输入规模增长的趋势。常见的有：O(1)常数时间、O(log n)对数时间、O(n)线性时间、O(n²)平方时间等。关键是要理解大O关注的是增长趋势，而非精确时间。'
      : question.includes('排序')
        ? '常见排序算法的复杂度：冒泡排序O(n²)、快速排序平均O(n log n)、归并排序O(n log n)、堆排序O(n log n)。选择排序算法时，需要考虑数据规模、是否需要稳定性、是否需要原地排序等因素。'
        : mockResponses.default;

    const words = answer.split('');
    for (let i = 0; i < words.length; i++) {
      fullAnswer += words[i];
      setChatMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: fullAnswer };
        return updated;
      });
      await new Promise(r => setTimeout(r, 20));
    }
    setChatStreaming(false);
  };

  // ============ Load Lesson Content ============
  const loadLessonContent = useCallback(async (unitIndex: number) => {
    setCurrentUnitIndex(unitIndex);
    setLessonLoading(true);
    setMastery(null);
    setExpandedChecks(new Set());
    setActiveTab('content');

    try {
      if (lessonCourseId) {
        const res = await lesson.generateLesson(lessonCourseId, unitIndex);
        const data = (res as any)?.lesson || (res as any)?.data || res;
        if (data && data.sections) {
          setLessonContent(data);
          setLessonLoading(false);
          return;
        }
      }
    } catch { /* fallback */ }

    // Only use mock as last resort, and make it unit-specific
    const unit = outline?.units[unitIndex];
    setLessonContent({
      title: unit?.name || '课程内容',
      objectives: unit?.knowledge_points || ['理解核心概念'],
      knowledge_points: unit?.knowledge_points || [],
      sections: [
        { type: 'life_intro', title: '生活引入', content: `关于${unit?.name || '本课'}，想象一下你在日常生活中遇到的相关场景...` },
        { type: 'formal', title: '正式讲解', content: `本节核心知识点：${(unit?.knowledge_points || []).join('、')}。请通过课程对话获取详细讲解。` },
        { type: 'deep_dive', title: '深挖理解', content: '请通过课程对话深入探讨相关概念。' },
        { type: 'application', title: '实际应用', content: '请通过课程对话了解实际应用场景。' },
      ],
      quick_check: [],
      feedback_entry: { can_retell: '', stuck_at: '', difficulty: 3, next_step: 'continue' },
    });
    setLessonLoading(false);
  }, [lessonCourseId, outline]);

  // ============ Quiz ============
  const handleStartQuiz = async () => {
    setQuizLoading(true);
    setQuizSubmitted(false);
    setQuizAnswers({});
    setQuizScore(0);
    setActiveTab('quiz');

    try {
      if (lessonCourseId) {
        const res = await lesson.generateExam(lessonCourseId);
        const data = (res as any)?.exam || (res as any)?.data || res;
        if (data?.questions?.length > 0) {
          setQuizQuestions(data.questions);
          setQuizLoading(false);
          return;
        }
      }
    } catch { /* fallback */ }

    // Mock fallback - generate from current unit's knowledge points
    const unit = outline?.units[currentUnitIndex];
    if (unit) {
      const mockQs = unit.knowledge_points.map((kp, i) => ({
        type: 'single_choice',
        knowledge_point: kp,
        question: `关于${kp}，以下哪个说法是正确的？`,
        options: [`${kp}是核心概念`, `${kp}不重要`, `${kp}已被淘汰`, `${kp}仅适用于理论`],
        answer: 'A',
        explanation: `${kp}是${unit.name}的核心概念之一。`,
        source: unit.name,
      }));
      setQuizQuestions(mockQs);
    }
    setQuizLoading(false);
  };

  const handleSubmitQuiz = async () => {
    setQuizSubmitted(true);
    setQuizzesTaken(prev => prev + 1);
    setCompletedUnits(prev => new Set([...prev, currentUnitIndex]));

    let correct = 0;
    quizQuestions.forEach((q, i) => {
      if (quizAnswers[i] === q.answer) correct++;
    });
    setQuizScore(Math.round((correct / quizQuestions.length) * 100));

    try {
      if (lessonCourseId) {
        await lesson.gradeExam(Date.now(), quizAnswers);
      }
    } catch { /* ignore */ }
  };

  // ============ Feedback ============
  const handleSubmitFeedback = async () => {
    try {
      if (lessonCourseId) {
        const res = await lesson.evaluateMastery(lessonCourseId, currentUnitIndex, feedbackForm);
        const data = (res as any)?.evaluation || (res as any)?.data || res;
        if (data?.mastery_level) {
          setMastery(data);
          return;
        }
      }
    } catch { /* fallback */ }
    setMastery({
      mastery_level: feedbackForm.difficulty <= 2 ? '能复述' : feedbackForm.difficulty <= 3 ? '能听懂' : '未接触',
      analysis: `根据你的反馈，你对本单元内容${feedbackForm.stuck_at ? '在' + feedbackForm.stuck_at + '方面还有困惑' : '有基本了解'}。`,
      next_action: feedbackForm.difficulty >= 4 ? 'supplement' : 'continue',
      need_reinforce: feedbackForm.difficulty >= 4,
    });
  };

  // ============ Render: Upload Step ============
  const renderUploadStep = () => (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-navy-50 via-white to-emerald-50 animate-fadeIn">
      <div className="w-full max-w-2xl mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-navy-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-navy-600 mb-2">课程学习</h1>
          <p className="text-warm-500">上传课件，AI 帮你解析、索引、生成课程脉络</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card-hover p-8 border border-warm-100">
          {/* Course Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-warm-700 mb-2">课程名称</label>
            <input
              type="text"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              placeholder="例如：数据结构与算法"
              className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 outline-none transition text-sm"
            />
          </div>

          {/* Upload Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-warm-700 mb-2">课件文件</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-warm-200 hover:border-navy-300 hover:bg-navy-50/30'
              }`}
            >
              <Upload size={40} className={`mx-auto mb-3 ${dragOver ? 'text-emerald-500' : 'text-warm-300'}`} />
              <p className="text-sm font-medium text-warm-600 mb-1">拖拽或点击上传课件文件</p>
              <p className="text-xs text-warm-400">支持 PPT、PPTX、PDF、DOCX、TXT 格式，可多选</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".ppt,.pptx,.pdf,.docx,.doc,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mb-6 space-y-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 bg-warm-50 rounded-lg px-4 py-2.5">
                  <File size={18} className="text-navy-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-warm-700 truncate">{file.name}</p>
                    <p className="text-xs text-warm-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="p-1 text-warm-400 hover:text-red-500 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleStartLearn}
            disabled={uploading || !courseName.trim() || files.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm shadow-sm"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {uploadProgress}
              </>
            ) : (
              <>
                <ArrowRight size={18} />
                开始学习
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ============ Render: Learning Step ============
  const renderLearningStep = () => (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Column: Course Outline */}
      <div className="w-1/4 min-w-[260px] flex-shrink-0 bg-white border-r border-warm-200/60 flex flex-col h-full">
        <div className="p-4 border-b border-warm-200/60">
          <h2 className="text-sm font-bold text-navy-600 flex items-center gap-2">
            <BookOpen size={16} />
            {outline?.course_name || courseName}
          </h2>
          <p className="text-xs text-warm-400 mt-1">{outline?.units.length || 0} 个学习单元</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {outline?.units.map((unit, idx) => (
            <button
              key={idx}
              onClick={() => loadLessonContent(idx)}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all group ${
                currentUnitIndex === idx
                  ? 'bg-navy-600 text-white shadow-md'
                  : completedUnits.has(idx)
                    ? 'bg-emerald-50 hover:bg-emerald-100'
                    : 'hover:bg-warm-50'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                currentUnitIndex === idx
                  ? 'bg-white/20 text-white'
                  : completedUnits.has(idx)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-warm-100 text-warm-500'
              }`}>
                {completedUnits.has(idx) ? <CheckCircle2 size={14} /> : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  currentUnitIndex === idx ? 'text-white' : 'text-warm-700'
                }`}>
                  {unit.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {currentUnitIndex !== idx && <DifficultyBadge difficulty={unit.difficulty} />}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* New Course Button */}
        <div className="p-3 border-t border-warm-200/60">
          <button
            onClick={() => {
              setStep('upload');
              setOutline(null);
              setFiles([]);
              setCourseName('');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-warm-500 hover:text-navy-600 hover:bg-warm-50 rounded-lg transition"
          >
            <Upload size={14} />
            上传新课程
          </button>
        </div>
      </div>

      {/* Center Column: Main Learning Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Tabs */}
        <div className="bg-white border-b border-warm-200/60 px-4">
          <div className="flex gap-1">
            {([
              { key: 'chat', label: '课程对话', icon: <MessageSquare size={16} /> },
              { key: 'content', label: '课程内容', icon: <BookOpen size={16} /> },
              { key: 'quiz', label: '智能测验', icon: <Brain size={16} /> },
              { key: 'raw', label: '课件原文', icon: <FileText size={16} /> },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-navy-600 text-navy-600'
                    : 'border-transparent text-warm-400 hover:text-warm-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chat' && renderChatTab()}
          {activeTab === 'content' && renderContentTab()}
          {activeTab === 'quiz' && renderQuizTab()}
          {activeTab === 'raw' && renderRawTab()}
        </div>
      </div>

      {/* Right Column: Learning Status */}
      <div className="w-1/4 min-w-[260px] flex-shrink-0 bg-white border-l border-warm-200/60 overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* Mastery Level */}
          <div>
            <h3 className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <BarChart3 size={12} /> 掌握度
            </h3>
            <MasteryBar level={mastery?.mastery_level || '未接触'} />
            <div className="flex justify-between mt-2">
              {['未接触', '能听懂', '能复述', '能做题', '能应用', '能迁移'].map((l, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${
                    i <= ['未接触', '能听懂', '能复述', '能做题', '能应用', '能迁移'].indexOf(mastery?.mastery_level || '未接触')
                      ? 'bg-emerald-500' : 'bg-warm-200'
                  }`} />
                  <span className="text-[9px] text-warm-400 mt-1">{l.slice(0, 2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Progress */}
          <div>
            <h3 className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Target size={12} /> 学习进度
            </h3>
            <div className="space-y-2">
              {outline?.units.map((unit, idx) => (
                <div key={idx} className={`flex items-center gap-2 text-xs ${
                  completedUnits.has(idx) ? 'text-emerald-600' :
                    idx === currentUnitIndex ? 'text-navy-600 font-medium' : 'text-warm-400'
                }`}>
                  {completedUnits.has(idx) ? (
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  ) : idx === currentUnitIndex ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-navy-500 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-warm-300 flex-shrink-0" />
                  )}
                  <span className="truncate">{unit.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div>
            <h3 className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Clock size={12} /> 学习统计
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-navy-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-navy-600">{questionsAsked}</div>
                <div className="text-[10px] text-warm-500">提问次数</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-emerald-600">{quizzesTaken}</div>
                <div className="text-[10px] text-warm-500">测验次数</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center col-span-2">
                <div className="text-lg font-bold text-amber-600">
                  {completedUnits.size}/{outline?.units.length || 0}
                </div>
                <div className="text-[10px] text-warm-500">已完成单元</div>
              </div>
            </div>
          </div>

          {/* Current Unit Info */}
          {currentUnit && (
            <div>
              <h3 className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Lightbulb size={12} /> 当前单元
              </h3>
              <div className="bg-warm-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-warm-800">{currentUnit.name}</p>
                <DifficultyBadge difficulty={currentUnit.difficulty} />
                <div className="flex flex-wrap gap-1 mt-2">
                  {currentUnit.knowledge_points.map((kp, i) => (
                    <span key={i} className="text-[10px] bg-navy-50 text-navy-600 px-2 py-0.5 rounded-full">
                      {kp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ============ Chat Tab ============
  const renderChatTab = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-navy-600 text-white rounded-br-md'
                : 'bg-warm-50 text-warm-800 rounded-bl-md border border-warm-100'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <GraduationCap size={14} className="text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600">课程助手</span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content || '...'}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-warm-200/60 bg-white p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
            placeholder="输入关于课程的问题..."
            disabled={chatStreaming}
            className="flex-1 px-4 py-2.5 border border-warm-200 rounded-xl focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 outline-none text-sm disabled:opacity-50"
          />
          <button
            onClick={handleSendChat}
            disabled={chatStreaming || !chatInput.trim()}
            className="flex items-center justify-center w-10 h-10 bg-navy-600 text-white rounded-xl hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {chatStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );

  // ============ Content Tab ============
  const renderContentTab = () => {
    if (lessonLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-navy-600 mx-auto mb-4" />
            <p className="text-warm-500">正在生成课程内容...</p>
          </div>
        </div>
      );
    }

    if (!lessonContent) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <BookOpen size={48} className="text-warm-200 mx-auto mb-4" />
            <p className="text-warm-400">从左侧选择一个单元开始学习</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto px-6 py-6 animate-fadeIn">
        {/* Title & Objectives */}
        <h1 className="text-2xl font-bold text-navy-600 mb-4">{lessonContent.title}</h1>

        <div className="bg-navy-50 rounded-xl p-5 mb-6">
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
        <div className="space-y-4">
          {lessonContent.sections.map((section, i) => (
            <div key={i} className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-5 border border-warm-100">
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
          <div className="mt-6">
            <h3 className="text-base font-semibold text-warm-800 mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-teal-500" />
              快速检查
            </h3>
            <div className="space-y-2">
              {lessonContent.quick_check.map((qc, i) => (
                <div key={i} className="bg-white rounded-xl shadow-card border border-warm-100 overflow-hidden">
                  <button
                    onClick={() => setExpandedChecks(prev => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      return next;
                    })}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-warm-50 transition"
                  >
                    <span className="text-sm font-medium text-warm-700">{qc.question}</span>
                    {expandedChecks.has(i) ? <ChevronUp size={16} className="text-warm-400" /> : <ChevronDown size={16} className="text-warm-400" />}
                  </button>
                  {expandedChecks.has(i) && (
                    <div className="px-4 pb-3 pt-1 border-t border-warm-100">
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
        <div className="mt-6 bg-white rounded-xl shadow-card border border-warm-100 p-5">
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
            <button
              onClick={handleSubmitFeedback}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm font-medium"
            >
              <Send size={14} />
              提交反馈
            </button>

            {mastery && (
              <div className={`p-4 rounded-lg border ${
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

  // ============ Quiz Tab ============
  const renderQuizTab = () => {
    if (quizLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-navy-600 mx-auto mb-4" />
            <p className="text-warm-500">正在生成测验题目...</p>
          </div>
        </div>
      );
    }

    if (quizQuestions.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Brain size={48} className="text-warm-200 mx-auto mb-4" />
            <p className="text-warm-400 mb-4">点击下方按钮开始智能测验</p>
            <button
              onClick={handleStartQuiz}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition font-medium text-sm mx-auto"
            >
              <Award size={18} />
              开始测验
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto px-6 py-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-navy-600 flex items-center gap-2">
            <Award size={24} className="text-emerald-500" />
            智能测验
          </h2>
          {!quizSubmitted && (
            <span className="text-sm text-warm-500">{quizQuestions.length} 道题</span>
          )}
        </div>

        {/* Score Display */}
        {quizSubmitted && (
          <div className="bg-white rounded-xl shadow-card border border-warm-100 p-6 text-center mb-6">
            <div className={`text-5xl font-bold mb-2 ${
              quizScore >= 80 ? 'text-emerald-500' : quizScore >= 60 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {quizScore}
            </div>
            <p className="text-warm-500 text-sm">得分</p>
            <div className="flex justify-center gap-6 mt-3 text-sm">
              <span className="text-emerald-600">
                正确: {quizQuestions.filter((q, i) => quizAnswers[i] === q.answer).length}
              </span>
              <span className="text-red-600">
                错误: {quizQuestions.filter((q, i) => quizAnswers[i] !== q.answer).length}
              </span>
            </div>
            <button
              onClick={() => {
                setQuizQuestions([]);
                setQuizSubmitted(false);
                setQuizAnswers({});
              }}
              className="mt-4 px-5 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition text-sm font-medium"
            >
              重新测验
            </button>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4">
          {quizQuestions.map((q, qi) => (
            <div key={qi} className="bg-white rounded-xl shadow-card border border-warm-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-navy-50 text-navy-600">
                  第 {qi + 1} 题
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  q.type === 'single_choice' ? 'bg-blue-100 text-blue-700' :
                  q.type === 'multi_choice' ? 'bg-purple-100 text-purple-700' :
                  'bg-teal-100 text-teal-700'
                }`}>
                  {q.type === 'single_choice' ? '单选题' : q.type === 'multi_choice' ? '多选题' : '概念题'}
                </span>
              </div>
              <p className="text-sm font-medium text-warm-800 mb-4">{q.question}</p>

              {q.options && (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const letter = String.fromCharCode(65 + oi);
                    const isSelected = q.type === 'multi_choice'
                      ? (quizAnswers[qi] || '').includes(letter)
                      : quizAnswers[qi] === letter;
                    const correctLetters = q.answer.split(',');
                    const isCorrect = quizSubmitted && correctLetters.includes(letter);
                    const isWrong = quizSubmitted && isSelected && !correctLetters.includes(letter);

                    return (
                      <button
                        key={oi}
                        onClick={() => {
                          if (quizSubmitted) return;
                          if (q.type === 'multi_choice') {
                            const current = quizAnswers[qi] || '';
                            const letters = current ? current.split(',') : [];
                            const newLetters = isSelected
                              ? letters.filter(l => l !== letter)
                              : [...letters, letter].sort();
                            setQuizAnswers(prev => ({ ...prev, [qi]: newLetters.join(',') }));
                          } else {
                            setQuizAnswers(prev => ({ ...prev, [qi]: letter }));
                          }
                        }}
                        className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg border transition text-sm ${
                          quizSubmitted
                            ? isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                              isWrong ? 'bg-red-50 border-red-300 text-red-700' :
                              'border-warm-200 text-warm-600'
                            : isSelected
                              ? 'bg-navy-50 border-navy-300 text-navy-700'
                              : 'border-warm-200 text-warm-600 hover:bg-warm-50'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                          quizSubmitted
                            ? isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' :
                              isWrong ? 'bg-red-500 border-red-500 text-white' :
                              'border-warm-300 text-warm-500'
                            : isSelected ? 'bg-navy-600 border-navy-600 text-white' : 'border-warm-300 text-warm-500'
                        }`}>
                          {isSelected && q.type === 'multi_choice' ? '✓' : letter}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {quizSubmitted && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-700 mb-1">解析</p>
                  <p className="text-sm text-blue-800">{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {!quizSubmitted && quizQuestions.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleSubmitQuiz}
              className="px-8 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition font-medium text-sm"
            >
              提交答案
            </button>
          </div>
        )}
      </div>
    );
  };

  // ============ Raw Text Tab ============
  const renderRawTab = () => (
    <div className="max-w-3xl mx-auto px-6 py-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-navy-600 flex items-center gap-2">
          <FileText size={20} className="text-emerald-500" />
          课件原文
        </h2>
        {rawTexts.length > 1 && (
          <select
            value={selectedRawFile}
            onChange={e => setSelectedRawFile(Number(e.target.value))}
            className="text-sm border border-warm-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 outline-none"
          >
            {rawTexts.map((_, i) => (
              <option key={i} value={i}>文件 {i + 1}</option>
            ))}
          </select>
        )}
      </div>
      <div className="bg-warm-50 rounded-xl border border-warm-200 p-6">
        <pre className="text-sm text-warm-700 leading-relaxed whitespace-pre-wrap font-sans">
          {rawTexts[selectedRawFile] || '暂无课件原文'}
        </pre>
      </div>
    </div>
  );

  // ============ Main Render ============
  return step === 'upload' ? renderUploadStep() : renderLearningStep();
}
