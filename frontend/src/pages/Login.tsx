import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, MessageSquare, BookOpen, Brain, Target, LogIn } from 'lucide-react';
import { auth } from '@/services/api';
import { useAppStore } from '@/store';

const features = [
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: '课程问答',
    desc: '基于课件内容的智能问答，快速获取答案',
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: '论文精读',
    desc: 'AI 辅助论文分析，提炼核心观点与方法',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: '知识管家',
    desc: '自动整理学习笔记，构建个人知识图谱',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: '学习规划',
    desc: '智能制定学习计划，追踪进度与效率',
  },
];

export default function Login() {
  const navigate = useNavigate();
  const setUser = useAppStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);

  const handleCasLogin = () => {
    auth.casLogin();
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setUser({
        user_id: 'demo-001',
        name: '张同学',
        student_id: '2024010001',
        college: '计算机与信息学院',
        major: '计算机科学与技术',
        grade: '2024',
        email: 'demo@hfut.edu.cn',
        created_at: new Date().toISOString(),
      });
      navigate('/dashboard');
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-800 via-navy-600 to-navy-900 px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-card-hover p-8 mb-6">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-navy-600 to-navy-800 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <GraduationCap className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-navy-800 tracking-tight">SmartLearner</h1>
            <p className="text-warm-500 mt-2 text-sm">个性化学习与知识管理Agent</p>
          </div>

          {/* CAS Login Button */}
          <button
            onClick={handleCasLogin}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-navy-600 to-navy-700 text-white font-semibold text-base flex items-center justify-center gap-2.5 hover:from-navy-500 hover:to-navy-600 active:from-navy-700 active:to-navy-800 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-navy-400 focus:ring-offset-2"
          >
            <LogIn className="w-5 h-5" />
            合工大统一身份认证登录
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-warm-200" />
            <span className="text-warm-400 text-xs">或</span>
            <div className="flex-1 h-px bg-warm-200" />
          </div>

          {/* Demo Login */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl border-2 border-dashed border-warm-300 text-warm-600 font-medium text-sm hover:border-navy-400 hover:text-navy-600 hover:bg-navy-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '正在登录...' : '体验演示账号'}
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-200"
            >
              <div className="text-emerald-400 mb-2">{f.icon}</div>
              <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-white/60 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-6">
          合肥工业大学 · SmartLearner
        </p>
      </div>
    </div>
  );
}
