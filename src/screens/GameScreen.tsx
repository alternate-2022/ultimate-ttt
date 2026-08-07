import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { MessageCircle, Settings as SettingsIcon, LogOut, History } from 'lucide-react';
import { UltimateBoard } from '../components/game/UltimateBoard';
import { ChatPanel } from '../components/chat/ChatPanel';
import { ConnectionBadge } from '../components/ui/ConnectionBadge';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../hooks/useGameStore';
import { useUiStore } from '../hooks/useUiStore';
import { useSettingsStore } from '../hooks/useSettingsStore';
import { playSound, haptic } from '../utils/audio';

export function GameScreen() {
  const goTo = useUiStore((s) => s.goTo);
  const state = useGameStore((s) => s.state);
  const role = useGameStore((s) => s.role);
  const localPlayer = useGameStore((s) => s.localPlayer);
  const requestMove = useGameStore((s) => s.requestMove);
  const connectionState = useGameStore((s) => s.connectionState);
  const latencyMs = useGameStore((s) => s.latencyMs);
  const opponentConnected = useGameStore((s) => s.opponentConnected);
  const reconnectMsRemaining = useGameStore((s) => s.reconnectMsRemaining);
  const chat = useGameStore((s) => s.chat);
  const unreadChat = useGameStore((s) => s.unreadChat);
  const opponentTyping = useGameStore((s) => s.opponentTyping);
  const sendChat = useGameStore((s) => s.sendChat);
  const setTyping = useGameStore((s) => s.setTyping);
  const markChatRead = useGameStore((s) => s.markChatRead);
  const requestRematch = useGameStore((s) => s.requestRematch);
  const reset = useGameStore((s) => s.reset);

  const { animationsEnabled, soundEnabled, hapticsEnabled } = useSettingsStore();

  const [chatOpen, setChatOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastMoveCount = useRef(0);
  const lastWinner = useRef<string | null>(null);

  // Play move sound + haptic whenever a new move lands.
  useEffect(() => {
    if (state.moveHistory.length > lastMoveCount.current) {
      const last = state.moveHistory.at(-1);
      const capturedBoard = last && state.boardResults[last.boardIndex] !== null;
      playSound(capturedBoard ? 'capture' : 'move', soundEnabled);
      haptic(capturedBoard ? [20, 30, 20] : 15, hapticsEnabled);
    }
    lastMoveCount.current = state.moveHistory.length;
  }, [state.moveHistory, state.boardResults, soundEnabled, hapticsEnabled]);

  // Fire confetti + victory/loss sound once when the game concludes.
  useEffect(() => {
    if (state.winner && state.winner !== lastWinner.current) {
      lastWinner.current = state.winner;
      const iWon = state.winner === localPlayer;
      if (state.winner === 'DRAW') {
        playSound('notify', soundEnabled);
      } else {
        playSound(iWon ? 'victory' : 'loss', soundEnabled);
        haptic(iWon ? [30, 50, 30, 50, 30] : [80], hapticsEnabled);
      }
      if (animationsEnabled && state.winner !== 'DRAW') {
        confetti({
          particleCount: iWon ? 160 : 60,
          spread: 100,
          origin: { y: 0.4 },
          colors: iWon ? ['#6366f1', '#8b5cf6', '#f59e0b'] : ['#94a3b8'],
        });
      }
    }
    if (!state.winner) lastWinner.current = null;
  }, [state.winner, localPlayer, animationsEnabled, soundEnabled, hapticsEnabled]);

  const handleExit = () => {
    reset();
    goTo('home');
  };

  const isMyTurn = localPlayer !== null && state.currentTurn === localPlayer && !state.winner;

  return (
    <div className="flex min-h-[100dvh] flex-col px-4 py-5 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <ConnectionBadge state={connectionState} latencyMs={latencyMs} />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label="Move history"
            className="rounded-full p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <History className="h-5 w-5 text-slate-500" />
          </button>
          <button
            onClick={() => {
              setChatOpen(true);
              markChatRead();
            }}
            aria-label="Open chat"
            className="relative rounded-full p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <MessageCircle className="h-5 w-5 text-slate-500" />
            {unreadChat > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {unreadChat}
              </span>
            )}
          </button>
          <button
            onClick={() => goTo('settings')}
            aria-label="Settings"
            className="rounded-full p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <SettingsIcon className="h-5 w-5 text-slate-500" />
          </button>
          <button
            onClick={handleExit}
            aria-label="Exit game"
            className="rounded-full p-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <LogOut className="h-5 w-5 text-rose-400" />
          </button>
        </div>
      </div>

      {/* Player / turn status */}
      <div className="mb-4 flex items-center justify-center gap-3">
        <PlayerChip symbol="X" active={state.currentTurn === 'X' && !state.winner} isYou={localPlayer === 'X'} />
        <span className="text-xs font-medium text-slate-400">vs</span>
        <PlayerChip symbol="O" active={state.currentTurn === 'O' && !state.winner} isYou={localPlayer === 'O'} />
      </div>

      {!opponentConnected && reconnectMsRemaining !== null && (
        <div className="mb-3 rounded-xl bg-amber-50 px-4 py-2 text-center text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          Opponent disconnected — waiting to reconnect ({Math.ceil(reconnectMsRemaining / 1000)}s)…
        </div>
      )}

      {/* Board */}
      <div className="flex flex-1 items-center justify-center">
        <UltimateBoard
          state={state}
          localPlayer={localPlayer}
          role={role}
          onMove={requestMove}
          animationsEnabled={animationsEnabled}
        />
      </div>

      {/* Turn banner */}
      <div className="mt-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
        {state.winner
          ? null
          : isMyTurn
          ? 'Your turn'
          : `Waiting for ${state.currentTurn}…`}
      </div>

      {/* Game over overlay */}
      <AnimatePresence>
        {state.winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 260 }}
              className="mx-6 flex flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-slate-900"
            >
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {state.winner === 'DRAW'
                  ? "It's a draw!"
                  : state.winner === localPlayer
                  ? 'You won! 🎉'
                  : 'You lost'}
              </h2>
              <div className="flex gap-3">
                <Button variant="primary" onClick={requestRematch}>
                  Rematch
                </Button>
                <Button variant="secondary" onClick={handleExit}>
                  Exit
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move history drawer */}
      <AnimatePresence>
        {historyOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed left-1/2 top-16 z-30 max-h-64 w-72 -translate-x-1/2 overflow-y-auto rounded-2xl bg-white p-3 shadow-xl dark:bg-slate-900"
          >
            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Move History</p>
            {state.moveHistory.length === 0 && <p className="text-sm text-slate-400">No moves yet.</p>}
            <ol className="space-y-1 text-sm">
              {state.moveHistory.map((m, i) => (
                <li key={i} className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>
                    {i + 1}. {m.player}
                  </span>
                  <span className="text-slate-400">
                    board {m.boardIndex + 1}, cell {m.cellIndex + 1}
                  </span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chat}
        localPlayer={localPlayer}
        opponentTyping={opponentTyping}
        onSend={sendChat}
        onTyping={setTyping}
      />
    </div>
  );
}

function PlayerChip({ symbol, active, isYou }: { symbol: 'X' | 'O'; active: boolean; isYou: boolean }) {
  return (
    <motion.div
      animate={{ scale: active ? 1.08 : 1, opacity: active ? 1 : 0.55 }}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
        symbol === 'X'
          ? 'bg-indigo-500/10 text-indigo-500'
          : 'bg-rose-500/10 text-rose-500'
      } ${active ? 'ring-2 ring-offset-1 dark:ring-offset-slate-950 ' + (symbol === 'X' ? 'ring-indigo-400' : 'ring-rose-400') : ''}`}
    >
      {symbol}
      {isYou && <span className="text-[10px] font-medium opacity-70">(you)</span>}
    </motion.div>
  );
}
