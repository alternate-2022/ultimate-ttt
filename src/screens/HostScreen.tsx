import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuid } from 'uuid';
import { ArrowLeft, ScanLine, CheckCircle2 } from 'lucide-react';
import { QRDisplay } from '../components/ui/QRDisplay';
import { QRScanner } from '../components/ui/QRScanner';
import { Button } from '../components/ui/Button';
import { useUiStore } from '../hooks/useUiStore';
import { useGameStore } from '../hooks/useGameStore';
import { encodePayload, decodePayload } from '../network/iceUtils';
import type { AnswerPayload } from '../types/network';

type Step = 'preparing' | 'show-offer' | 'scan-answer' | 'connecting' | 'connected' | 'error';

export function HostScreen() {
  const goTo = useUiStore((s) => s.goTo);
  const initHost = useGameStore((s) => s.initHost);
  const connectionState = useGameStore((s) => s.connectionState);
  const reset = useGameStore((s) => s.reset);

  const [step, setStep] = useState<Step>('preparing');
  const [offerQr, setOfferQr] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const roomIdRef = useRef(uuid().slice(0, 8));
  const peerRef = useRef<ReturnType<typeof initHost> | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const peer = initHost();
    peerRef.current = peer;

    (async () => {
      try {
        const offer = await peer.createOffer(roomIdRef.current);
        const encoded = await encodePayload(offer);
        setOfferQr(encoded);
        setStep('show-offer');
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Failed to create offer.');
        setStep('error');
      }
    })();

    return () => {
      // Only tear down if we're leaving without a live connection.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (connectionState === 'connected') {
      setStep('connected');
      const t = setTimeout(() => goTo('game'), 700);
      return () => clearTimeout(t);
    }
  }, [connectionState, goTo]);

  const handleAnswerScanned = async (raw: string) => {
    if (!peerRef.current) return;
    try {
      const answer = await decodePayload<AnswerPayload>(raw);
      if (answer.roomId !== roomIdRef.current) {
        setErrorMsg('That QR code is from a different game. Ask your friend to scan your Host QR again.');
        return;
      }
      setStep('connecting');
      await peerRef.current.acceptAnswer(answer);
    } catch {
      setErrorMsg('Could not read that QR code. Make sure it is the Join QR from your friend.');
      setStep('scan-answer');
    }
  };

  const handleCancel = () => {
    reset();
    goTo('home');
  };

  return (
    <div className="flex min-h-[100dvh] flex-col px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={handleCancel} aria-label="Back" className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Host Game</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {step === 'preparing' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
            <p className="text-slate-500 dark:text-slate-400">Preparing your game room…</p>
          </div>
        )}

        {step === 'show-offer' && (
          <>
            <QRDisplay data={offerQr} label="Have your friend scan this to join" />
            <p className="max-w-xs text-center text-sm text-slate-500 dark:text-slate-400">
              1. Your friend taps <strong>Join Game</strong> and scans this code.
              <br />
              2. They'll get a code back — scan theirs next.
            </p>
            <Button variant="secondary" icon={<ScanLine className="h-5 w-5" />} onClick={() => setStep('scan-answer')}>
              Scan Their Code
            </Button>
          </>
        )}

        {step === 'scan-answer' && (
          <>
            <QRScanner active onResult={handleAnswerScanned} />
            <p className="text-sm text-slate-500 dark:text-slate-400">Scan your friend's Join code</p>
            <Button variant="ghost" onClick={() => setStep('show-offer')}>
              Back to my code
            </Button>
          </>
        )}

        {step === 'connecting' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
            <p className="text-slate-500 dark:text-slate-400">Connecting…</p>
          </div>
        )}

        {step === 'connected' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">Connected!</p>
          </motion.div>
        )}

        {(step === 'error' || errorMsg) && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-rose-50 p-4 text-center dark:bg-rose-950/30">
            <p className="text-sm text-rose-600 dark:text-rose-400">{errorMsg}</p>
            <Button variant="secondary" onClick={() => setErrorMsg(null)}>
              Dismiss
            </Button>
          </div>
        )}
      </div>

      <Button variant="ghost" fullWidth onClick={handleCancel}>
        Cancel
      </Button>
    </div>
  );
}
