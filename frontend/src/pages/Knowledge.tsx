import { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Brain,
  MessageSquare,
  X,
  Tag,
  FolderOpen,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { knowledge } from '@/services/api';
import ChatDialog from '@/components/ChatDialog';
import type { KnowledgeItem, ChatMessage } from '@/types';

const mockCategories = ['计算机科学', '数学', '物理', '英语', '经济学', '心理学'];

const mockItems: KnowledgeItem[] = [
  {
    id: '1', title: 'TCP 三次握手与四次挥手', content: 'TCP连接的建立和断开过程...',
    category: '计算机科学', tags: ['网络', 'TCP', '协议'], source: '计算机网络课程',
    is_archived: false, created_at: '2026-06-17T10:00:00Z', updated_at: '2026-06-17T10:00:00Z',
  },
  {
    id: '2', title: '进程调度算法对比', content: 'FCFS、SJF、RR等调度算法的特点和适用场景...',
    category: '计算机科学', tags: ['操作系统', '调度'], source: '操作系统教材',
    is_archived: false, created_at: '2026-06-16T14:00:00Z', updated_at: '2026-06-16T14:00:00Z',
  },
  {
    id: '3', title: '微积分基本定理', content: '牛顿-莱布尼茨公式将微分和积分联系起来...',
    category: '数学', tags: ['微积分', '定理'], source: '高等数学笔记',
    is_archived: false, created_at: '2026-06-15T09:00:00Z', updated_at: '2026-06-15T09:00:00Z',
  },
  {
    id: '4', title: '贝叶斯定理应用', content: '贝叶斯定理在机器学习和统计推断中的应用...',
    category: '数学', tags: ['概率论', '贝叶斯', '机器学习'], source: '概率论课程',
    is_archived: false, created_at: '2026-06-14T16:00:00Z', updated_at: '2026-06-14T16:00:00Z',
  },
];

export default function Knowledge() {
  const [categories, setCategories] = useState<string[]>(mockCategories);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  // Add knowledge modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '', content: '', category: '', source: '', tags: '',
  });

  // Knowledge QA dialog
  const [showQA, setShowQA] = useState(false);
  const [qaMessages, setQaMessages] = useState<ChatMessage[]>([]);
  const [qaLoading, setQaLoading] = useState(false);

  // Add category
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await knowledge.listCategories();
        if (res.success && res.data.length > 0) setCategories(res.data);
      } catch {
        // Use mock data
      }
    }
    fetchCategories();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await knowledge.searchKnowledge(searchQuery, selectedCategory || undefined);
      if (res.success) setSearchResults(res.data);
    } catch {
      // Filter mock data
      const filtered = mockItems.filter(
        (item) =>
          item.title.includes(searchQuery) ||
          item.content.includes(searchQuery) ||
          item.tags.some((t) => t.includes(searchQuery))
      );
      setSearchResults(filtered);
    }
    setSearching(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleAddKnowledge = async () => {
    if (!addForm.title || !addForm.content || !addForm.category) return;
    setAdding(true);
    try {
      const tags = addForm.tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await knowledge.addKnowledge({
        title: addForm.title,
        content: addForm.content,
        category: addForm.category,
        source: addForm.source || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      if (res.success) {
        setSearchResults((prev) => [res.data, ...prev]);
        setShowAddModal(false);
        setAddForm({ title: '', content: '', category: '', source: '', tags: '' });
      }
    } catch {
      const newItem: KnowledgeItem = {
        id: `local-${Date.now()}`,
        title: addForm.title,
        content: addForm.content,
        category: addForm.category,
        tags: addForm.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
        source: addForm.source || undefined,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSearchResults((prev) => [newItem, ...prev]);
      setShowAddModal(false);
      setAddForm({ title: '', content: '', category: '', source: '', tags: '' });
    }
    setAdding(false);
  };

  const handleQA = async (question: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      session_id: 'knowledge-qa',
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    setQaMessages((prev) => [...prev, userMsg]);
    setQaLoading(true);
    try {
      const res = await knowledge.askKnowledge(question);
      if (res.success) {
        setQaMessages((prev) => [...prev, res.data]);
      }
    } catch {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        session_id: 'knowledge-qa',
        role: 'assistant',
        content: '抱歉，暂时无法回答这个问题，请稍后再试。',
        timestamp: new Date().toISOString(),
      };
      setQaMessages((prev) => [...prev, assistantMsg]);
    }
    setQaLoading(false);
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (!categories.includes(newCategory.trim())) {
      setCategories((prev) => [...prev, newCategory.trim()]);
    }
    setNewCategory('');
    setShowAddCategory(false);
  };

  const getCategoryCount = (cat: string) => {
    return mockItems.filter((item) => item.category === cat).length;
  };

  return (
    <div className="page-container">
      <div className="flex gap-6">
        {/* Left Sidebar - Categories */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-warm-800 text-sm">分类</h3>
              <button
                onClick={() => setShowAddCategory(!showAddCategory)}
                className="p-1 rounded-md hover:bg-warm-100 transition-colors"
                title="添加分类"
              >
                <Plus className="w-4 h-4 text-warm-500" />
              </button>
            </div>

            {showAddCategory && (
              <div className="mb-3">
                <input
                  className="input-field text-sm"
                  placeholder="新分类名称"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button onClick={handleAddCategory} className="btn-primary w-full mt-2 text-sm py-1.5">
                  添加
                </button>
              </div>
            )}

            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === null
                    ? 'bg-navy-50 text-navy-600 font-medium'
                    : 'text-warm-600 hover:bg-warm-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  全部
                </span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat
                      ? 'bg-navy-50 text-navy-600 font-medium'
                      : 'text-warm-600 hover:bg-warm-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    {cat}
                  </span>
                  <span className="text-xs text-warm-400">{getCategoryCount(cat)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Search Bar */}
          <div className="card mb-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-400" />
                <input
                  className="input-field pl-10"
                  placeholder="输入自然语言搜索知识库..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
              <button onClick={handleSearch} className="btn-primary" disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : '搜索'}
              </button>
            </div>

            {/* Category filter chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-navy-600 text-white'
                    : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                }`}
              >
                全部
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-navy-600 text-white'
                      : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-4">
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              添加知识
            </button>
            <button onClick={() => setShowQA(true)} className="btn-accent flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              知识问答
            </button>
          </div>

          {/* Search Results */}
          {!hasSearched ? (
            <div className="card text-center py-16">
              <Brain className="w-12 h-12 text-warm-300 mx-auto mb-4" />
              <p className="text-warm-500">输入关键词或自然语言搜索你的知识库</p>
            </div>
          ) : searching ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="card text-center py-16">
              <Search className="w-12 h-12 text-warm-300 mx-auto mb-4" />
              <p className="text-warm-500">未找到相关结果，试试其他关键词</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults
                .filter((item) => !selectedCategory || item.category === selectedCategory)
                .map((item) => (
                  <div key={item.id} className="card card-hover">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-warm-800 mb-1">{item.title}</h3>
                        <p className="text-sm text-warm-500 line-clamp-2 mb-2">{item.content}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="badge-navy">{item.category}</span>
                          {item.tags.map((tag) => (
                            <span key={tag} className="badge bg-warm-100 text-warm-600">
                              <Tag className="w-3 h-3 mr-0.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-4">
                        {item.source && (
                          <span className="text-xs text-warm-400 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {item.source}
                          </span>
                        )}
                        <span className="text-xs text-warm-400">
                          {new Date(item.updated_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Knowledge Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-card-hover w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-warm-800">添加知识</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-md hover:bg-warm-100">
                <X className="w-5 h-5 text-warm-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">标题 *</label>
                <input
                  className="input-field"
                  placeholder="知识标题"
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">内容 *</label>
                <textarea
                  className="input-field resize-none"
                  rows={4}
                  placeholder="知识内容..."
                  value={addForm.content}
                  onChange={(e) => setAddForm({ ...addForm, content: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">分类 *</label>
                  <select
                    className="input-field"
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                  >
                    <option value="">选择分类</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">来源</label>
                  <input
                    className="input-field"
                    placeholder="来源"
                    value={addForm.source}
                    onChange={(e) => setAddForm({ ...addForm, source: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">标签</label>
                <input
                  className="input-field"
                  placeholder="用逗号分隔多个标签"
                  value={addForm.tags}
                  onChange={(e) => setAddForm({ ...addForm, tags: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="btn-ghost flex-1">取消</button>
              <button
                onClick={handleAddKnowledge}
                disabled={!addForm.title || !addForm.content || !addForm.category || adding}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? '添加中...' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge QA Dialog */}
      {showQA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowQA(false)}>
          <div
            className="bg-white rounded-2xl shadow-card-hover w-full max-w-2xl mx-4 overflow-hidden"
            style={{ height: '600px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <ChatDialog
              title="知识问答"
              messages={qaMessages}
              onSendMessage={handleQA}
              loading={qaLoading}
            />
            <div className="border-t border-warm-200/50 p-2 flex justify-end">
              <button onClick={() => setShowQA(false)} className="btn-ghost text-sm py-1">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
