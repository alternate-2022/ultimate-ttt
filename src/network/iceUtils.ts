/**
 * Helpers for gathering ICE candidates into a signaling payload small
 * enough to encode in a QR code, and for compacting/restoring that data.
 *
 * Strategy: we wait for ICE gathering to complete (or a timeout, whichever
 * is first) so the offer/answer payload is fully self-contained — this
 * avoids needing a second signaling round-trip (trickle ICE) which would
 * require more QR scans. Local (host-candidate / mDNS) candidates are
 * preferred so two phones on the same WiFi/hotspot can connect without
 * ever touching the internet; srflx candidates gathered via STUN are
 * included as a fallback for when the two phones are on different
 * networks (e.g. one on WiFi, one on cellular).
 */

const ICE_GATHER_TIMEOUT_MS = 4000;

export const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Waits for the peer connection's ICE gathering to complete, up to a
 * timeout. Returns whatever candidates were gathered in that window.
 * This lets us produce a single QR code containing everything needed
 * to connect, rather than requiring a live signaling channel.
 */
export function waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };
    pc.addEventListener('icegatheringstatechange', onChange);
    setTimeout(finish, ICE_GATHER_TIMEOUT_MS);
  });
}

/** Collects all ICE candidates emitted during gathering into an array. */
export function collectIceCandidates(pc: RTCPeerConnection): {
  candidates: RTCIceCandidateInit[];
  stop: () => void;
} {
  const candidates: RTCIceCandidateInit[] = [];
  const onCandidate = (e: RTCPeerConnectionIceEvent) => {
    if (e.candidate) {
      candidates.push(e.candidate.toJSON());
    }
  };
  pc.addEventListener('icecandidate', onCandidate);
  return {
    candidates,
    stop: () => pc.removeEventListener('icecandidate', onCandidate),
  };
}

/**
 * Compresses a JSON-serializable payload into a compact base64url string
 * suitable for a QR code, using gzip via the CompressionStream API when
 * available, falling back to plain base64 JSON otherwise.
 */
export async function encodePayload(payload: unknown): Promise<string> {
  const json = JSON.stringify(payload);
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return 'gz:' + arrayBufferToBase64Url(buf);
  }
  return 'raw:' + arrayBufferToBase64Url(new TextEncoder().encode(json).buffer);
}

export async function decodePayload<T>(encoded: string): Promise<T> {
  const [prefix, data] = splitOnce(encoded, ':');
  const buf = base64UrlToArrayBuffer(data);
  if (prefix === 'gz' && typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    const out = await new Response(stream).arrayBuffer();
    return JSON.parse(new TextDecoder().decode(out)) as T;
  }
  return JSON.parse(new TextDecoder().decode(buf)) as T;
}

function splitOnce(s: string, sep: string): [string, string] {
  const idx = s.indexOf(sep);
  if (idx === -1) return ['raw', s];
  return [s.slice(0, idx), s.slice(idx + 1)];
}

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToArrayBuffer(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
