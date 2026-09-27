import { useEffect, useState } from 'react';

type NetState = 'offline' | 'slow' | 'normal' | 'fast';

const getConn = (): any =>
  (navigator as any).connection || (navigator as any).webkitConnection || (navigator as any).mozConnection;

const classify = (): NetState => {
  if (!navigator.onLine) return 'offline';
  const c = getConn();
  if (c?.effectiveType) {
    if (c.effectiveType === 'slow-2g' || c.effectiveType === '2g') return 'slow';
    if (c.effectiveType === '3g') return 'normal';
    if (c.effectiveType === '4g') return 'fast';
  }
  if (typeof c?.downlink === 'number' && c.downlink > 0) {
    if (c.downlink < 0.7) return 'slow';
    if (c.downlink < 2) return 'normal';
    return 'fast';
  }
  return 'normal'; // Connection API unsupported (e.g. iOS Safari/WebView) — assume normal.
};

const PILL_STYLES: Record<NetState, string> = {
  offline: 'text-red-400 bg-red-500/15',
  slow: 'text-amber-400 bg-amber-500/15',
  normal: 'text-sky-400 bg-sky-500/15',
  fast: 'text-emerald-400 bg-emerald-500/15',
};

const DOT_STYLES: Record<NetState, string> = {
  offline: 'bg-red-400 animate-pulse',
  slow: 'bg-amber-400 animate-pulse',
  normal: 'bg-sky-400',
  fast: 'bg-emerald-400',
};

const PILL_LABEL: Record<NetState, string> = {
  offline: 'No internet connection',
  slow: 'Slow network',
  normal: 'Normal network',
  fast: 'Fast network',
};

const MESSAGE: Record<NetState, string> = {
  offline: "You're offline — waiting for a connection",
  slow: 'Loading may take longer than usual',
  normal: 'Loading…',
  fast: 'Loading…',
};

// Same look as the static boot splash in index.html, so there's no visual jump when React takes over.
const AppLoader = ({ label = 'Loading live data' }: { label?: string }) => {
  const [net, setNet] = useState<NetState>(() => classify());
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const update = () => setNet(classify());
    update();

    const conn = getConn();
    conn?.addEventListener?.('change', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    const t = setTimeout(() => setStalled(true), 15000);
    return () => {
      conn?.removeEventListener?.('change', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      clearTimeout(t);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <div className="relative w-[88px] h-[88px]">
        <img src="/loader-logo.png" alt="Live Signals" width={88} height={88} className="rounded-full bg-white shadow-lg" />
        <div className="absolute -inset-[7px] rounded-full border-[3px] border-sky-500/20 border-t-sky-500 animate-spin" />
      </div>

      <div className={`flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-full transition-colors ${PILL_STYLES[net]}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-none ${DOT_STYLES[net]}`} />
        {PILL_LABEL[net]}
      </div>

      <p className="text-xs text-muted-foreground min-h-[14px]">
        {stalled ? 'Still loading — this is taking longer than expected' : MESSAGE[net] === 'Loading…' ? `${label}…` : MESSAGE[net]}
      </p>
    </div>
  );
};

export default AppLoader;
