import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, ClipboardPaste } from 'lucide-react';
import { QRDisplay } from '../components/ui/QRDisplay';
import { QRScanner } from '../components/ui/QRScanner';
import { Button } from '../components/ui/Button';
import { useUiStore } from '../hooks/useUiStore';
import { useGameStore } from '../hooks/useGameStore';
import { encodePayload, decodePayload } from '../network/iceUtils';
import type { OfferPayload } from '../types/network';

type Step = 'scan-offer' | 'manual-paste' | 'show-answer' | 'connecting' | 'connected' | 'error';

export function JoinScreen() {
  const goTo = useUiStore((s) => s.goTo);
  const initGuest = useGameStore((s) => s.initGuest);
  const connectionState = useGameStore((s) => s.connectionState);
  const reset = useGameStore((s) => s.reset);

  const [step, setStep] = useState<Step>('scan-offer');
  const [answerQr, setAnswerQr] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pasteValue, setPasteValue] = useState('');
  const peerRef = useRef<ReturnType<typeof initGuest> | null>(null);

  useEffect(() => {
    if (connectionState === 'connected') {
      setStep('connected');
      const t = setTimeout(() => goTo('game'), 700);
      return () => clearTimeout(t);
    }
  }, [connectionState, goTo]);

  const processOffer = async (raw: string) => {
    try {
      const offer = await decodePayload<OfferPayload>(raw);
      const peer = peerRef.current ?? initGuest();
      peerRef.current = peer;
      setStep('connecting');
      const answer = await peer.createAnswer(offer);
      const encoded = await encodePayload(answer);
      setAnswerQr(encoded);
      setStep('show-answer');
    } catch {
      setErrorMsg('Could not read that code. Make sure it is a valid Host QR code.');
      setStep('scan-offer');
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
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Join Game</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {step === 'scan-offer' && (
          <>
            <QRScanner active onResult={processOffer} />
            <p className="text-sm text-slate-500 dark:text-slate-400">Scan your friend's Host code</p>
            {errorMsg && <p className="text-sm text-rose-500">{errorMsg}</p>}
            <Button variant="ghost" icon={<ClipboardPaste className="h-4 w-4" />} onClick={() => setStep('manual-paste')}>
              Paste code manually
            </Button>
          </>
        )}

        {step === 'manual-paste' && (
          <div className="flex w-full max-w-sm flex-col gap-3">
            <textarea
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder="Paste the host's code here"
              rows={6}
              className="w-full rounded-2xl bg-slate-100 p-4 text-sm outline-none dark:bg-slate-800 dark:text-slate-100"
            />
            <Button variant="primary" onClick={() => processOffer(pasteValue.trim())} disabled={!pasteValue.trim()}>
              Connect
            </Button>
            <Button variant="ghost" onClick={() => setStep('scan-offer')}>
              Back to scanning
            </Button>
          </div>
        )}

        {step === 'connecting' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
            <p className="text-slate-500 dark:text-slate-400">Generating response…</p>
          </div>
        )}

        {step === 'show-answer' && (
          <>
            <QRDisplay data={answerQr} label="Have your friend scan this to finish connecting" />
            <p className="max-w-xs text-center text-sm text-slate-500 dark:text-slate-400">
              Show this code to your friend — they'll scan it from their Host screen to complete the connection.
            </p>
          </>
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
      </div>

      <Button variant="ghost" fullWidth onClick={handleCancel}>
        Cancel
      </Button>
    </div>
  );
}
