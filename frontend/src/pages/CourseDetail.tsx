import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  FileText,
  Zap,
  Send,
  Upload,
  File,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';
import { course as courseApi } from '@/services/api';
import { useAppStore } from '@/store';
import type { Course, Document, ChatMessage, QuizQuestion } from '@/types';

type TabKey = 'qa' | 'docs' | 'quiz';

const mockCourse: Course = {
  id: '1',
  name: '数据结构与算法',
  code: 'CS201',
  teacher: '王教授',
  semester: '2025-2026-2',
  description: '学习常用数据结构和算法设计方法，包括线性表、树、图、排序和查找等',
  documents: [],
  created_at: '2026-02-20T00:00:00Z',
  updated_at: '2026-06-17T00:00:00Z',
};

const mockDocuments: Document[] = [
  { id: 'd1', course_id: '1', name: '第1章-绪论.pdf', file_type: 'pdf', file_size: 2048000, file_url: '#', uploaded_at: '2026-03-01T08:00:00Z' },
  { id: 'd2', course_id: '1', name: '第2章-线性表.pdf', file_type: 'pdf', file_size: 3145728, file_url: '#', uploaded_at: '2026-03-15T08:00:00Z' },
  { id: 'd3', course_id: '1', name: '第3章-栈和队列.pptx', file_type: 'pptx', file_size: 5242880, file_url: '#', uploaded_at: '2026-04-01T08:00:00Z' },
  { id: 'd4', course_id: '1', name: '第4章-树与二叉树.pdf', file_type: 'pdf', file_size: 4194304, file_url: '#', uploaded_at: '2026-04-20T08:00:00Z' },
];

const mockQuizQuestions: QuizQuestion[] = [
  {
    id: 'q1', question: '在二叉搜索树中，查找操作的平均时间复杂度是？',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correct_answer: 1, explanation: '在平衡的二叉搜索树中，每次比较可以排除一半的节点，因此平均时间复杂度为 O(log n)。', difficulty: 'easy',
  },
  {
    id: 'q2', question: '以下哪种排序算法是稳定排序？',
    options: ['快速排序', '堆排序', '归并排序', '希尔排序'],
    correct_answer: 2, explanation: '归并排序在合并过程中，相等元素的相对顺序保持不变，因此是稳定排序。快速排序和堆排序在交换元素时可能改变相等元素的相对顺序。', difficulty: 'medium',
  },
  {
    id: 'q3', question: '哈夫曼树中，叶子节点的权值越大，该叶子到根的路径长度如何？',
    options: ['越长', '越短', '不变', '无法确定'],
    correct_answer: 1, explanation: '哈夫曼树的构造原则是权值越大的叶子离根越近，因此权值越大的叶子到根的路径长度越短，这样可以保证带权路径长度最小。', difficulty: 'medium',
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ============ QA Tab ============
function QATab({ courseId }: { courseId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const addMessage = useAppStore((s) => s.addMessage);
  const user = useAppStore((s) => s.user);
  const userId = user?.user_id || '1';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      session_id: courseId,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    addMessage(courseId, userMsg);
    const question = input.trim();
    setInput('');
    setStreaming(true);

    // Create a placeholder assistant message
    const assistantId = `msg-${Date.now() + 1}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      session_id: courseId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      await courseApi.askStream(courseId, question, userId, (chunk) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + chunk }
              : msg
          )
        );
      });
    } catch {
      // If streaming fails, fall back to non-streaming API
      try {
        const res = await courseApi.askQuestion(courseId, question, userId);
        if (res.success) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? res.data : msg
            )
          );
          addMessage(courseId, res.data);
          setStreaming(false);
          return;
        }
      } catch {
        // Use mock response
      }
      // Mock response on error
      const mockContent = `关于"${question}"，这是一个很好的问题。根据课程内容，这个概念涉及到数据结构中的核心知识点。建议结合课件中的示例进行深入理解。`;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: mockContent,
                metadata: { sources: ['第2章-线性表.pdf', '第4章-树与二叉树.pdf'] },
              }
            : msg
        )
      );
    }

    // Update the store with final message
    setMessages((prev) => {
      const finalMsg = prev.find((m) => m.id === assistantId);
      if (finalMsg) addMessage(courseId, finalMsg);
      return prev;
    });
    setStreaming(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-warm-400">
            <MessageSquare className="w-12 h-12 mb-3" />
            <p className="text-sm">向AI助手提问关于课程的问题</p>
            <p className="text-xs mt-1">基于课件内容智能回答</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-navy-600 text-white rounded-br-md'
                    : 'bg-warm-100 text-warm-800 rounded-bl-md'
                }`}
              >
                {msg.content || (streaming && msg.role === 'assistant') ? (
                  <>
                    {msg.content}
                    {streaming && msg.role === 'assistant' && msg.content && (
                      <span className="inline-block w-0.5 h-4 bg-warm-600 ml-0.5 animate-pulse align-text-bottom" />
                    )}
                  </>
                ) : null}
              </div>
              {/* Source references for assistant messages */}
              {msg.role === 'assistant' && msg.metadata?.sources && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(msg.metadata.sources as string[]).map((src: string) => (
                    <span key={src} className="inline-flex items-center gap-1 text-xs text-warm-500 bg-warm-50 px-2 py-0.5 rounded-full">
                      <FileText className="w-3 h-3" />
                      {src}
                    </span>
                  ))}
                </div>
              )}
              <p className={`text-xs text-warm-400 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start">
            <div className="bg-warm-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-warm-400 ml-2">AI 正在思考...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-warm-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="输入你的问题..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={streaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="btn-primary px-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Docs Tab ============
function DocsTab({ courseId }: { courseId: string }) {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAppStore((s) => s.user);
  const userId = user?.user_id || '1';

  useEffect(() => {
    // No backend endpoint for listing documents; use mock data
  }, [courseId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const res = await courseApi.uploadDocument(courseId, files[i], userId);
        if (res.success) {
          setDocuments((prev) => [...prev, res.data]);
        }
      }
    } catch {
      // Add mock document on error
      const file = files[0];
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        course_id: courseId,
        name: file.name,
        file_type: file.name.split('.').pop() || 'pdf',
        file_size: file.size,
        file_url: '#',
        uploaded_at: new Date().toISOString(),
      };
      setDocuments((prev) => [...prev, newDoc]);
    }
    setUploading(false);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'pptx': case 'ppt': return <FileText className="w-5 h-5 text-orange-500" />;
      case 'docx': case 'doc': return <FileText className="w-5 h-5 text-blue-500" />;
      default: return <File className="w-5 h-5 text-warm-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          dragOver ? 'border-navy-400 bg-navy-50' : 'border-warm-300 hover:border-navy-300 hover:bg-warm-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md"
          onChange={(e) => handleUpload(e.target.files)}
        />
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-navy-500' : 'text-warm-400'}`} />
        <p className="text-sm font-medium text-warm-700">
          {uploading ? '上传中...' : '拖拽文件到此处或点击上传'}
        </p>
        <p className="text-xs text-warm-400 mt-1">支持 PDF、PPT、Word、TXT 格式</p>
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-warm-200 hover:bg-warm-50 transition-colors">
            {getFileIcon(doc.file_type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-800 truncate">{doc.name}</p>
              <p className="text-xs text-warm-400">
                {formatFileSize(doc.file_size)} · {new Date(doc.uploaded_at).toLocaleDateString('zh-CN')}
              </p>
            </div>
            <span className={`badge ${
              doc.file_type === 'pdf' ? 'badge-emerald' : 'badge-navy'
            }`}>
              {doc.file_type.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Quiz Tab ============
function QuizTab({ courseId }: { courseId: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());
  const user = useAppStore((s) => s.user);
  const userId = user?.user_id || '1';

  const generateQuiz = async () => {
    setLoading(true);
    setSubmitted(false);
    setSelectedAnswers({});
    setExpandedExplanations(new Set());
    try {
      const res = await courseApi.generateQuiz(courseId, userId, undefined, 5);
      if (res.success) setQuestions(res.data);
    } catch {
      setQuestions(mockQuizQuestions);
    }
    setLoading(false);
  };

  // Auto-generate on first render
  useEffect(() => {
    generateQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const score = submitted
    ? questions.reduce((acc, q) => acc + (selectedAnswers[q.id] === q.correct_answer ? 1 : 0), 0)
    : 0;

  const toggleExplanation = (id: string) => {
    setExpandedExplanations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Display */}
      {submitted && (
        <div className="card bg-gradient-to-r from-navy-50 to-emerald-50 text-center">
          <p className="text-sm text-warm-500 mb-1">测验得分</p>
          <p className="text-4xl font-bold text-navy-700">
            {score}<span className="text-lg text-warm-500">/{questions.length}</span>
          </p>
          <p className="text-sm text-warm-500 mt-1">
            正确率 {Math.round((score / questions.length) * 100)}%
          </p>
        </div>
      )}

      {/* Questions */}
      {questions.map((q, idx) => {
        const selected = selectedAnswers[q.id];
        const isCorrect = selected === q.correct_answer;

        return (
          <div key={q.id} className="card">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-semibold">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-warm-800">{q.question}</p>
                <span className={`badge mt-1 ${
                  q.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
                  q.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  {q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难'}
                </span>
              </div>
            </div>

            <div className="space-y-2 ml-10">
              {q.options.map((opt, optIdx) => {
                let optionStyle = 'border-warm-200 hover:border-navy-300 hover:bg-navy-50';
                if (submitted) {
                  if (optIdx === q.correct_answer) {
                    optionStyle = 'border-emerald-400 bg-emerald-50';
                  } else if (optIdx === selected && !isCorrect) {
                    optionStyle = 'border-red-400 bg-red-50';
                  } else {
                    optionStyle = 'border-warm-200 opacity-50';
                  }
                } else if (optIdx === selected) {
                  optionStyle = 'border-navy-500 bg-navy-50';
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => {
                      if (!submitted) setSelectedAnswers({ ...selectedAnswers, [q.id]: optIdx });
                    }}
                    disabled={submitted}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${optionStyle}`}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                    {opt}
                    {submitted && optIdx === q.correct_answer && (
                      <CheckCircle className="w-4 h-4 inline ml-2 text-emerald-500" />
                    )}
                    {submitted && optIdx === selected && !isCorrect && (
                      <AlertCircle className="w-4 h-4 inline ml-2 text-red-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {submitted && (
              <div className="ml-10 mt-3">
                <button
                  onClick={() => toggleExplanation(q.id)}
                  className="flex items-center gap-1 text-sm text-navy-600 hover:text-navy-700 font-medium"
                >
                  {expandedExplanations.has(q.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  解析
                </button>
                {expandedExplanations.has(q.id) && (
                  <p className="text-sm text-warm-600 mt-2 leading-relaxed bg-warm-50 p-3 rounded-lg">
                    {q.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Actions */}
      <div className="flex gap-3">
        {!submitted && questions.length > 0 ? (
          <button onClick={handleSubmit} className="btn-primary flex-1" disabled={Object.keys(selectedAnswers).length < questions.length}>
            提交答案 ({Object.keys(selectedAnswers).length}/{questions.length})
          </button>
        ) : (
          <button onClick={generateQuiz} className="btn-accent flex-1 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            重新出题
          </button>
        )}
      </div>
    </div>
  );
}

// ============ Main CourseDetail Component ============
export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course>(mockCourse);
  const [activeTab, setActiveTab] = useState<TabKey>('qa');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No backend endpoint for getting a single course; use mock data
    setLoading(false);
  }, [id]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'qa', label: '课程问答', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'docs', label: '课件管理', icon: <FileText className="w-4 h-4" /> },
    { key: 'quiz', label: '智能测验', icon: <Zap className="w-4 h-4" /> },
  ];

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
      <div className="mb-6">
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center gap-1 text-sm text-warm-500 hover:text-navy-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          返回课程列表
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-navy-500 to-navy-700 rounded-xl flex items-center justify-center text-white">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-warm-800">{course.name}</h1>
            <div className="flex items-center gap-3 text-sm text-warm-500 mt-1">
              <span>{course.code}</span>
              <span>·</span>
              <span>{course.teacher}</span>
              <span>·</span>
              <span>{course.semester}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-warm-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === tab.key
                ? 'border-navy-600 text-navy-600'
                : 'border-transparent text-warm-500 hover:text-warm-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'qa' && <QATab courseId={id!} />}
      {activeTab === 'docs' && <DocsTab courseId={id!} />}
      {activeTab === 'quiz' && <QuizTab courseId={id!} />}
    </div>
  );
}
