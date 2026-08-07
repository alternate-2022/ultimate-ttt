import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { motion } from 'framer-motion';
import { Flashlight, FlashlightOff, Camera } from 'lucide-react';

interface QRScannerProps {
  onResult: (data: string) => void;
  active: boolean;
}

/**
 * Camera-based QR scanner. Handles permission denial, torch (flash)
 * toggling where supported, and continuous frame scanning via jsQR.
 */
export function QRScanner({ onResult, active }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied' | 'unsupported'>(
    'pending'
  );
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const hasResultRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!active) {
      stopCamera();
      return;
    }
    hasResultRef.current = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unsupported');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setPermissionState('granted');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(!!caps?.torch);
        scanLoop();
      } catch {
        if (!cancelled) setPermissionState('denied');
      }
    })();

    function scanLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      const ctx2d = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx2d) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code && !hasResultRef.current) {
        hasResultRef.current = true;
        onResult(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    }

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn(!torchOn);
    } catch {
      // Torch control not supported on this device — fail silently.
    }
  };

  if (permissionState === 'denied') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-slate-100 p-8 text-center dark:bg-slate-800">
        <Camera className="h-10 w-10 text-slate-400" />
        <p className="font-medium text-slate-700 dark:text-slate-200">Camera access denied</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enable camera permission in your browser settings, or use the manual paste option below.
        </p>
      </div>
    );
  }

  if (permissionState === 'unsupported') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-slate-100 p-8 text-center dark:bg-slate-800">
        <Camera className="h-10 w-10 text-slate-400" />
        <p className="font-medium text-slate-700 dark:text-slate-200">Camera not supported</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Use the manual paste option below instead.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-black shadow-lg"
    >
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/70" />
      {torchSupported && (
        <button
          onClick={toggleTorch}
          aria-label="Toggle flashlight"
          className="absolute bottom-4 right-4 rounded-full bg-black/50 p-3 text-white backdrop-blur-md active:scale-95"
        >
          {torchOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
        </button>
      )}
    </motion.div>
  );
}
