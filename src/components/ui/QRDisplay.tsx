import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';

interface QRDisplayProps {
  data: string | null;
  label?: string;
}

/** Renders a payload string as a large, high-contrast QR code for scanning. */
export function QRDisplay({ data, label }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    setError(null);
    QRCode.toCanvas(canvasRef.current, data, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'L',
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch((e) => setError(String(e?.message ?? e)));
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="rounded-3xl bg-white p-4 shadow-lg shadow-black/10 dark:shadow-black/40">
        {data ? (
          <canvas ref={canvasRef} className="rounded-xl" />
        ) : (
          <div className="flex h-[320px] w-[320px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
          </div>
        )}
      </div>
      {label && <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>}
      {error && <p className="text-sm text-red-500">Failed to render QR: {error}</p>}
    </motion.div>
  );
}
