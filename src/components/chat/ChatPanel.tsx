import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X } from 'lucide-react';
import clsx from 'clsx';
import type { ChatEntry } from '../../hooks/useGameStore';
import type { Player } from '../../types/game';

const QUICK_EMOJI = ['😀', '😂', '😮', '😢', '👍', '🔥', '🎉', '🤔'];

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: ChatEntry[];
  localPlayer: Player | null;
  opponentTyping: boolean;
  onSend: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
}

export function ChatPanel({
  open,
  onClose,
  messages,
  localPlayer,
  opponentTyping,
  onSend,
  onTyping,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const handleChange = (val: string) => {
    setDraft(val);
    onTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 1200);
  };

  const handleSend = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
    onTyping(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[70vh] flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Chat</h2>
            <button
              onClick={onClose}
              aria-label="Close chat"
              className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="mt-8 text-center text-sm text-slate-400">Say hello to your opponent 👋</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={clsx('flex', m.from === localPlayer ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={clsx(
                    'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                    m.from === localPlayer
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {opponentTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-400 dark:bg-slate-800">
                  typing…
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto px-4 pb-1">
            {QUICK_EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => handleChange(draft + e)}
                className="rounded-lg px-2 py-1 text-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {e}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
            <input
              value={draft}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message…"
              className="min-h-[44px] flex-1 rounded-2xl bg-slate-100 px-4 text-base outline-none dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              onClick={handleSend}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white active:scale-95"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
