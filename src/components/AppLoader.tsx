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
  return 'normal';
};

const STATUS: Record<NetState, string> = {
  offline: 'Waiting for internet…',
  slow: 'Slow network…',
  normal: 'Loading…',
  fast: 'Loading…',
};

const DOT: Record<NetState, string> = {
  offline: 'bg-red-500',
  slow: 'bg-amber-500',
  normal: 'bg-teal-500',
  fast: 'bg-emerald-500',
};

const AppLoader = ({ label = 'Loading live data' }: { label?: string }) => {
  const [net, setNet] = useState<NetState>(() => classify());

  useEffect(() => {
    const update = () => setNet(classify());
    update();
    const conn = getConn();
    conn?.addEventListener?.('change', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      conn?.removeEventListener?.('change', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 text-slate-700"
      role="status"
      aria-live="polite"
    >
      <div className="relative w-16 h-16 rounded-full bg-[conic-gradient(from_0deg,#22c55e,#14b8a6,#38bdf8,#22c55e)] animate-spin shadow-lg shadow-teal-500/15">
        <div className="absolute inset-[6px] rounded-full bg-[#f3fffc]" />
        <span className="absolute left-1/2 top-1 w-2 h-2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,.95)]" />
      </div>
      <div className="text-[13px] font-bold tracking-[0.16em] text-teal-700">LIVE SIGNALS</div>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[net]} animate-pulse`} />
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[net]} animate-pulse [animation-delay:150ms]`} />
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[net]} animate-pulse [animation-delay:300ms]`} />
      </div>
      <p className="text-xs text-slate-500">{net === 'normal' || net === 'fast' ? `${label}…` : STATUS[net]}</p>
    </div>
  );
};

export default AppLoader;
