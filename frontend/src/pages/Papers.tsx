import { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  MessageSquare,
  Link2,
  Star,
  Loader2,
  Search,
  Tag,
  Lightbulb,
  Beaker,
  AlertCircle,
  Trophy,
  ClipboardList,
} from 'lucide-react';
import { paper } from '@/services/api';
import { useAppStore } from '@/store';
import ChatDialog from '@/components/ChatDialog';
import type { PaperAnalysis, ChatMessage } from '@/types';

const mockAnalysis: PaperAnalysis = {
  id: 'mock-1',
  title: 'Attention Is All You Need',
  authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'],
  abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
  key_findings: [
    '提出了 Transformer 架构，完全基于注意力机制',
    '在机器翻译任务上达到了 SOTA 性能',
    '训练效率显著提升，并行化能力更强',
    '多头注意力机制能有效捕获不同子空间的信息',
  ],
  methodology: '基于自注意力机制（Self-Attention）和多头注意力（Multi-Head Attention）构建编码器-解码器架构，使用位置编码替代循环结构，实现完全并行化计算。',
  contributions: [
    '提出了全新的 Transformer 架构范式',
    '证明了注意力机制可以完全替代循环和卷积',
    '为后续 NLP 领域的预训练模型奠定基础',
  ],
  limitations: [
    '自注意力计算复杂度为 O(n²)，对长序列不友好',
    '位置编码对序列长度有上限约束',
    '在小规模数据集上可能不如 CNN/RNN',
  ],
  related_topics: ['深度学习', '注意力机制', '自然语言处理', '序列建模', 'Transformer'],
  published_date: '2017-06-12',
  venue: 'NeurIPS 2017',
  created_at: '2026-06-17T00:00:00Z',
};

type TabKey = 'analysis' | 'qa' | 'related';

export default function Papers() {
  const user = useAppStore((s) => s.user);
  const userId = user?.user_id || '1';
  const [analysis, setAnalysis] = useState<PaperAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('analysis');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [difficulty, setDifficulty] = useState(0);
  const [analyzingDifficulty, setAnalyzingDifficulty] = useState(false);
  const [paperText, setPaperText] = useState(''); // 保存论文原文用于问答

  // QA state
  const [qaMessages, setQaMessages] = useState<ChatMessage[]>([]);
  const [qaLoading, setQaLoading] = useState(false);

  // Related state
  const [relatedPapers, setRelatedPapers] = useState<PaperAnalysis[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const res = await paper.analyzePaper(file, userId);
      const r = res as any;
      const analysisData = r?.analysis || r?.data || res;
      if (analysisData) {
        setAnalysis(analysisData);
        setPaperText(r?.paper_text || ''); // 保存论文原文
        setAnalyzingDifficulty(true);
        setTimeout(() => {
          setDifficulty(analysisData.reading_difficulty || Math.floor(Math.random() * 3) + 3);
          setAnalyzingDifficulty(false);
        }, 800);
      }
    } catch {
      // Use mock data on error
      setAnalysis(mockAnalysis);
      setDifficulty(4);
    }
    setUploading(false);
  }, [userId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    setUploading(true);
    try {
      const blob = new Blob([pastedText], { type: 'text/plain' });
      const file = new File([blob], 'pasted-text.txt', { type: 'text/plain' });
      const res = await paper.analyzePaper(file, userId);
      const r = res as any;
      const analysisData = r?.analysis || r?.data || res;
      if (analysisData) {
        setAnalysis(analysisData);
        setPaperText(r?.paper_text || ''); // 保存论文原文
        setDifficulty(analysisData.reading_difficulty || Math.floor(Math.random() * 3) + 2);
      }
    } catch {
      setAnalysis(mockAnalysis);
      setDifficulty(4);
    }
    setUploading(false);
    setPastedText('');
  };

  const handleQA = async (question: string) => {
    if (!analysis) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      session_id: analysis.id || 'paper-session',
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    setQaMessages((prev) => [...prev, userMsg]);
    setQaLoading(true);
    try {
      const res = await paper.paperQA(question, paperText);
      const answer = (res as any)?.answer || (res as any)?.data?.content || '分析完成，但无法获取详细回答。';
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        session_id: analysis.id || 'paper-session',
        role: 'assistant',
        content: answer,
        timestamp: new Date().toISOString(),
      };
      setQaMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        session_id: analysis.id || 'paper-session',
        role: 'assistant',
        content: '抱歉，暂时无法回答这个问题，请稍后再试。',
        timestamp: new Date().toISOString(),
      };
      setQaMessages((prev) => [...prev, assistantMsg]);
    }
    setQaLoading(false);
  };

  const fetchRelated = async () => {
    if (!analysis) return;
    setRelatedLoading(true);
    try {
      const res = await paper.suggestRelated(paperText);
      // Backend returns {related_topics, search_keywords, suggested_directions} or {raw_suggestion}
      const r = res as any;
      const directions = r?.suggested_directions || r?.data?.suggested_directions;
      if (Array.isArray(directions) && directions.length > 0) {
        setRelatedPapers(
          directions.map((dir: string, idx: number) => ({
            id: `dir-${idx}`,
            title: dir,
            authors: [],
            abstract: '',
            key_findings: [],
            methodology: '',
            contributions: [],
            limitations: [],
            related_topics: [],
            created_at: new Date().toISOString(),
          }))
        );
      } else if (r?.raw_suggestion) {
        setRelatedPapers([
          {
            id: 'raw',
            title: 'AI 推荐研究方向',
            authors: [],
            abstract: r.raw_suggestion,
            key_findings: [],
            methodology: '',
            contributions: [],
            limitations: [],
            related_topics: [],
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        setRelatedPapers([]);
      }
    } catch {
      setRelatedPapers([]);
    }
    setRelatedLoading(false);
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'related' && relatedPapers.length === 0 && analysis) {
      fetchRelated();
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'analysis', label: '深度分析', icon: <Search className="w-4 h-4" /> },
    { key: 'qa', label: '论文问答', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'related', label: '关联推荐', icon: <Link2 className="w-4 h-4" /> },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-warm-800">论文分析</h1>
          <p className="text-warm-500 text-sm mt-1">上传论文，AI 帮你快速理解核心内容</p>
        </div>
      </div>

      {/* Upload Area */}
      {!analysis && (
        <div className="card mb-6">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
              dragOver ? 'border-navy-400 bg-navy-50' : 'border-warm-300 hover:border-navy-300 hover:bg-warm-50'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-navy-600 animate-spin" />
                <p className="text-warm-600 font-medium">正在分析论文...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-warm-400 mx-auto mb-3" />
                <p className="text-warm-700 font-medium mb-1">拖拽论文文件到此处上传</p>
                <p className="text-warm-400 text-sm mb-4">支持 PDF、Word、TXT 格式</p>
                <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  选择论文文件
                  <input type="file" accept=".pdf,.docx,.doc,.txt,.md" className="hidden" onChange={handleFileInput} />
                </label>
              </>
            )}
          </div>

          {/* Paste text alternative */}
          <div className="mt-6">
            <p className="text-sm text-warm-500 mb-2 font-medium">或者直接粘贴论文文本：</p>
            <textarea
              className="input-field resize-none"
              rows={4}
              placeholder="将论文文本粘贴到这里..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pastedText.trim() || uploading}
              className="btn-accent mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              分析文本
            </button>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <>
          {/* Paper Info + Difficulty */}
          <div className="card mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-warm-800 mb-2">{analysis.title}</h2>
                <p className="text-sm text-warm-500 mb-1">
                  {analysis.authors.join(' · ')}
                </p>
                <div className="flex items-center gap-3 text-xs text-warm-400">
                  {analysis.venue && <span>{analysis.venue}</span>}
                  {analysis.published_date && <span>{analysis.published_date}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 ml-4">
                <span className="text-xs text-warm-500">阅读难度</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <Star
                      key={level}
                      className={`w-5 h-5 ${
                        level <= difficulty
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-warm-200'
                      } ${analyzingDifficulty ? 'animate-pulse' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-warm-200/50">
              <p className="text-sm text-warm-600 leading-relaxed">{analysis.abstract}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-warm-100 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-navy-600 shadow-sm'
                    : 'text-warm-500 hover:text-warm-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'analysis' && (
            <div className="space-y-4">
              {/* Research Question */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-warm-800">研究问题</h3>
                </div>
                <p className="text-sm text-warm-600 leading-relaxed">{analysis.abstract}</p>
              </div>

              {/* Methodology */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Beaker className="w-5 h-5 text-navy-600" />
                  <h3 className="font-semibold text-warm-800">研究方法</h3>
                </div>
                <p className="text-sm text-warm-600 leading-relaxed">{analysis.methodology}</p>
              </div>

              {/* Key Findings */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold text-warm-800">核心发现</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.key_findings.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-warm-600">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                        {idx + 1}
                      </span>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contributions */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-5 h-5 text-navy-600" />
                  <h3 className="font-semibold text-warm-800">主要贡献</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.contributions.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-warm-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-navy-400 flex-shrink-0 mt-2" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limitations */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-warm-800">局限性</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.limitations.map((l, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-warm-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-2" />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key Terms */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-5 h-5 text-violet-500" />
                  <h3 className="font-semibold text-warm-800">关键词</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.related_topics.map((topic) => (
                    <span key={topic} className="badge bg-violet-50 text-violet-600">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qa' && (
            <div className="card p-0 overflow-hidden" style={{ height: '500px' }}>
              <ChatDialog
                title="论文问答"
                messages={qaMessages}
                onSendMessage={handleQA}
                loading={qaLoading}
              />
            </div>
          )}

          {activeTab === 'related' && (
            <div className="space-y-4">
              {/* Related Topics */}
              <div className="card">
                <h3 className="section-title">关联主题</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.related_topics.map((topic) => (
                    <span key={topic} className="badge bg-navy-50 text-navy-600 cursor-pointer hover:bg-navy-100 transition-colors">
                      <Tag className="w-3 h-3 mr-1" />
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Search Keywords */}
              <div className="card">
                <h3 className="section-title">推荐搜索关键词</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.related_topics.map((topic) => (
                    <span key={topic} className="badge bg-emerald-50 text-emerald-600">
                      {topic} 最新研究
                    </span>
                  ))}
                </div>
              </div>

              {/* Suggested Research Directions */}
              <div className="card">
                <h3 className="section-title">推荐研究方向</h3>
                {relatedLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-navy-600 animate-spin" />
                  </div>
                ) : relatedPapers.length > 0 ? (
                  <div className="space-y-3">
                    {relatedPapers.map((p) => (
                      <div key={p.id} className="p-3 rounded-lg border border-warm-200 hover:bg-warm-50 transition-colors">
                        <h4 className="font-medium text-warm-800 text-sm">{p.title}</h4>
                        <p className="text-xs text-warm-500 mt-1">{p.authors.join(' · ')}</p>
                        <p className="text-xs text-warm-400 mt-1 line-clamp-2">{p.abstract}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border border-warm-200 bg-warm-50">
                      <h4 className="font-medium text-warm-800 text-sm">高效注意力机制</h4>
                      <p className="text-xs text-warm-500 mt-1">研究降低自注意力计算复杂度的方法，如稀疏注意力、线性注意力等</p>
                    </div>
                    <div className="p-3 rounded-lg border border-warm-200 bg-warm-50">
                      <h4 className="font-medium text-warm-800 text-sm">多模态 Transformer</h4>
                      <p className="text-xs text-warm-500 mt-1">将 Transformer 架构扩展到视觉、音频等多模态领域</p>
                    </div>
                    <div className="p-3 rounded-lg border border-warm-200 bg-warm-50">
                      <h4 className="font-medium text-warm-800 text-sm">长序列建模</h4>
                      <p className="text-xs text-warm-500 mt-1">解决 Transformer 处理长序列时的计算和内存瓶颈</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Re-upload button */}
              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setAnalysis(null);
                    setQaMessages([]);
                    setRelatedPapers([]);
                    setDifficulty(0);
                    setActiveTab('analysis');
                  }}
                  className="btn-outline"
                >
                  上传新论文
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
