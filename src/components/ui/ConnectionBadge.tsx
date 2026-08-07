import clsx from 'clsx';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { ConnectionState } from '../../types/network';

interface ConnectionBadgeProps {
  state: ConnectionState;
  latencyMs: number | null;
}

const LABELS: Record<ConnectionState, string> = {
  idle: 'Not connected',
  'creating-offer': 'Creating room…',
  'awaiting-answer': 'Waiting for scan…',
  scanning: 'Scanning…',
  connecting: 'Connecting…',
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
  disconnected: 'Disconnected',
  failed: 'Connection failed',
};

function latencyColor(ms: number | null): string {
  if (ms === null) return 'text-slate-400';
  if (ms < 100) return 'text-emerald-500';
  if (ms < 300) return 'text-amber-500';
  return 'text-rose-500';
}

export function ConnectionBadge({ state, latencyMs }: ConnectionBadgeProps) {
  const connected = state === 'connected';
  const reconnecting = state === 'reconnecting' || state === 'connecting';

  return (
    <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md dark:bg-slate-800/70">
      {connected ? (
        <Wifi className="h-3.5 w-3.5 text-emerald-500" />
      ) : reconnecting ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
      ) : (
        <WifiOff className="h-3.5 w-3.5 text-rose-400" />
      )}
      <span className={clsx('text-slate-600 dark:text-slate-300')}>{LABELS[state]}</span>
      {connected && latencyMs !== null && (
        <span className={clsx('font-semibold', latencyColor(latencyMs))}>{latencyMs}ms</span>
      )}
    </div>
  );
}
