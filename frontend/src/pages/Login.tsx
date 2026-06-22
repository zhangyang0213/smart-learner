import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Upload, ArrowRight, User, FileText } from 'lucide-react';
import { auth } from '@/services/api';
import { useAppStore } from '@/store';

export default function Login() {
  const navigate = useNavigate();
  const setUser = useAppStore((s) => s.setUser);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  // Step 1 form state
  const [form, setForm] = useState({
    studentId: '2024218652',
    name: '杨灵欣玥',
    college: '计算机与信息学院',
    major: '智能科学与技术',
    grade: '2024',
  });

  // Step 2 upload state
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.name) return;
    setLoading(true);
    try {
      const res = await auth.register(form.studentId, form.name, form.college, form.major, form.grade);
      // 后端直接返回用户数据，没有success包装
      const userData = (res as any)?.data?.user || (res as any)?.user || res;
      const user = {
        user_id: String(userData.user_id || userData.id || `local-${form.studentId}`),
        name: userData.name || form.name,
        student_id: userData.student_id || form.studentId,
        college: userData.college || form.college,
        major: userData.major || form.major,
        grade: userData.grade || form.grade,
        created_at: new Date().toISOString(),
      };
      setUser(user);
      setUserId(user.user_id);
      setStep(2);
    } catch {
      // Fallback: create local user and proceed
      const fallbackUser = {
        user_id: `local-${form.studentId}`,
        name: form.name,
        student_id: form.studentId,
        college: form.college,
        major: form.major,
        grade: form.grade,
        created_at: new Date().toISOString(),
      };
      setUser(fallbackUser);
      setUserId(fallbackUser.user_id);
      setStep(2);
    }
    setLoading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.docx')) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      await auth.uploadSchedule(userId, file);
    } catch {
      // Silently continue even if upload fails
    }
    setLoading(false);
    navigate('/lesson');
  };

  const handleSkip = () => {
    navigate('/lesson');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-800 via-navy-600 to-navy-900 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-navy-500 to-navy-700 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SmartLearner</h1>
          <p className="text-white/50 mt-1 text-sm">个性化学习与知识管理Agent</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-card-hover p-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-navy-700' : 'text-warm-300'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step >= 1 ? 'bg-navy-600 text-white' : 'bg-warm-200 text-warm-400'}`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <span className="text-sm font-medium">个人信息</span>
            </div>
            <div className={`w-10 h-0.5 mx-3 transition-colors duration-300 ${step >= 2 ? 'bg-navy-500' : 'bg-warm-200'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-navy-700' : 'text-warm-300'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step >= 2 ? 'bg-navy-600 text-white' : 'bg-warm-200 text-warm-400'}`}>
                2
              </div>
              <span className="text-sm font-medium">上传课表</span>
            </div>
          </div>

          {/* Step 1: User Info Form */}
          <div className={`transition-all duration-300 ${step === 1 ? 'opacity-100 translate-x-0' : 'absolute opacity-0 translate-x-8 pointer-events-none'}`}>
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  学号 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
                  <input
                    type="text"
                    value={form.studentId}
                    onChange={(e) => updateForm('studentId', e.target.value)}
                    required
                    placeholder="请输入学号"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  required
                  placeholder="请输入姓名"
                  className="w-full px-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">学院</label>
                <input
                  type="text"
                  value={form.college}
                  onChange={(e) => updateForm('college', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">专业</label>
                  <input
                    type="text"
                    value={form.major}
                    onChange={(e) => updateForm('major', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">年级</label>
                  <input
                    type="text"
                    value={form.grade}
                    onChange={(e) => updateForm('grade', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !form.studentId || !form.name}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-navy-600 to-navy-700 text-white font-semibold text-base flex items-center justify-center gap-2 hover:from-navy-500 hover:to-navy-600 active:from-navy-700 active:to-navy-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? '提交中...' : '下一步'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>

          {/* Step 2: Upload Schedule */}
          <div className={`transition-all duration-300 ${step === 2 ? 'opacity-100 translate-x-0' : 'absolute opacity-0 -translate-x-8 pointer-events-none'}`}>
            <div className="space-y-4">
              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? 'border-navy-400 bg-navy-50'
                    : file
                      ? 'border-green-400 bg-green-50'
                      : 'border-warm-300 bg-warm-50 hover:border-navy-300 hover:bg-navy-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {file ? (
                  <>
                    <FileText className="w-10 h-10 text-green-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-green-700">{file.name}</p>
                    <p className="text-xs text-green-500 mt-1">点击重新选择</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-warm-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-warm-700">上传课表文件</p>
                    <p className="text-xs text-warm-400 mt-1">从教务系统导出的课表文件(.docx)</p>
                    <p className="text-xs text-warm-300 mt-2">拖拽文件到此处，或点击选择</p>
                  </>
                )}
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-navy-600 to-navy-700 text-white font-semibold text-base flex items-center justify-center gap-2 hover:from-navy-500 hover:to-navy-600 active:from-navy-700 active:to-navy-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '上传中...' : '上传并开始使用'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              {/* Skip Link */}
              <button
                onClick={handleSkip}
                className="w-full text-center text-sm text-warm-400 hover:text-navy-600 transition-colors py-1"
              >
                跳过，稍后上传
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-6">
          合肥工业大学 · SmartLearner
        </p>
      </div>
    </div>
  );
}
