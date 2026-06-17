import { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types';

interface SourceRef {
  title: string;
  url?: string;
}

interface ChatDialogProps {
  title: string;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  loading?: boolean;
  sources?: SourceRef[];
}

export default function ChatDialog({ title, messages, onSendMessage, loading = false, sources }: ChatDialogProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-200/50">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <h3 className="font-semibold text-warm-800">{title}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-warm-400 text-sm">开始对话吧，我会为你解答问题</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-navy-600 text-white rounded-br-md'
                  : 'bg-warm-100 text-warm-800 rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-warm-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Source references */}
        {sources && sources.length > 0 && !loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] space-y-1">
              <p className="text-xs text-warm-400 font-medium">参考来源：</p>
              {sources.map((src, idx) => (
                <div key={idx} className="text-xs text-navy-600 hover:underline cursor-pointer">
                  {src.url ? (
                    <a href={src.url} target="_blank" rel="noopener noreferrer">{src.title}</a>
                  ) : (
                    <span>{src.title}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-warm-200/50 p-3">
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="输入你的问题..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn-primary px-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
