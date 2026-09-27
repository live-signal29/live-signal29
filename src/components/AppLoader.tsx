import { useCallback, useEffect, useRef, useState } from 'react';

type NetState = 'offline' | 'slow' | 'normal' | 'fast';

type NetworkInfo = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  addEventListener?: (event: string, handler: () => void) => void;
  removeEventListener?: (event: string, handler: () => void) => void;
};

const getConnection = (): NetworkInfo | undefined =>
  (navigator as Navigator & { connection?: NetworkInfo }).connection ||
  (navigator as Navigator & { webkitConnection?: NetworkInfo }).webkitConnection ||
  (navigator as Navigator & { mozConnection?: NetworkInfo }).mozConnection;

const getProbeUrl = () => {
  // Same-origin probe: this verifies that the app can actually reach the
  // website/API host instead of trusting navigator.onLine alone.
  const base = window.location.origin || 'https://live-signal29.vercel.app';
  return `${base}/?network_probe=${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const probeNetwork = async (): Promise<{ state: NetState; latency: number | null }> => {
  if (!navigator.onLine) return { state: 'offline', latency: null };

  const started = performance.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(getProbeUrl(), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });

    const latency = Math.round(performance.now() - started);

    if (!response.ok) return { state: 'slow', latency };
    if (latency < 300) return { state: 'fast', latency };
    if (latency < 900) return { state: 'normal', latency };
    return { state: 'slow', latency };
  } catch {
    return { state: navigator.onLine ? 'slow' : 'offline', latency: null };
  } finally {
    window.clearTimeout(timeout);
  }
};

const LABEL: Record<NetState, string> = {
  offline: 'No internet connection',
  slow: 'Slow network',
  normal: 'Normal network',
  fast: 'Fast network',
};

const MESSAGE: Record<NetState, string> = {
  offline: 'Waiting for internet connection…',
  slow: 'Still loading — this is taking longer than expected',
  normal: 'Loading live data…',
  fast: 'Loading live data…',
};

const PILL: Record<NetState, string> = {
  offline: 'bg-red-50 border-red-100 text-red-600',
  slow: 'bg-amber-50 border-amber-100 text-amber-600',
  normal: 'bg-teal-50 border-teal-100 text-teal-600',
  fast: 'bg-emerald-50 border-emerald-100 text-emerald-600',
};

const DOT: Record<NetState, string> = {
  offline: 'bg-red-500',
  slow: 'bg-amber-500',
  normal: 'bg-teal-500',
  fast: 'bg-emerald-500',
};

const AppLoader = ({ label = 'Loading live data' }: { label?: string }) => {
  const [net, setNet] = useState<NetState>('normal');
  const [latency, setLatency] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const mounted = useRef(true);

  const checkNetwork = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setChecking(true);

    const result = await probeNetwork();
    if (!mounted.current) return;

    setNet(result.state);
    setLatency(result.latency);
    setChecking(false);
    setRetrying(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void checkNetwork();

    const update = () => void checkNetwork();
    const connection = getConnection();

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    connection?.addEventListener?.('change', update);

    // Re-check periodically while this loader is visible so the status is
    // based on the real connection to the app host, not a stale value.
    const interval = window.setInterval(update, 5000);

    return () => {
      mounted.current = false;
      window.clearInterval(interval);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      connection?.removeEventListener?.('change', update);
    };
  }, [checkNetwork]);

  const statusMessage =
    net === 'fast' || net === 'normal'
      ? `${label}…`
      : MESSAGE[net];

  return (
    <div
      className="fixed inset-0 z-[99999] flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#f2fff9] via-[#edfcff] to-[#f5faff] px-6 text-slate-700"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center">
        <div className="relative h-16 w-16 rounded-full bg-[conic-gradient(from_0deg,#22c55e,#14b8a6,#38bdf8,#22c55e)] p-[6px] shadow-[0_8px_26px_rgba(20,184,166,.18)] animate-spin">
          <div className="relative flex h-full w-full items-center justify-center rounded-full bg-[#f3fffc]">
            <img src="/loader-logo.png" alt="" className="h-8 w-8 object-contain" />
          </div>
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,.95)]" />
        </div>

        <div className="mt-5 flex items-center gap-2" aria-hidden="true">
          <span className={`h-2 w-2 rounded-full ${DOT[net]} animate-pulse`} />
          <span className={`h-2 w-2 rounded-full ${DOT[net]} animate-pulse [animation-delay:150ms]`} />
          <span className={`h-2 w-2 rounded-full ${DOT[net]} animate-pulse [animation-delay:300ms]`} />
        </div>

        <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium shadow-sm ${PILL[net]}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${DOT[net]} ${checking ? 'animate-pulse' : ''}`} />
          <span>{retrying ? 'Checking network…' : LABEL[net]}</span>
          {latency !== null && !retrying && (
            <span className="text-[11px] opacity-70">{latency} ms</span>
          )}
        </div>

        <p className="mt-4 max-w-[320px] text-center text-sm text-slate-500">
          {statusMessage}
        </p>

        {(net === 'offline' || net === 'slow') && !retrying && (
          <button
            type="button"
            onClick={() => void checkNetwork(true)}
            className="mt-6 rounded-full border-2 border-sky-500 px-7 py-2.5 text-sm font-medium text-sky-600 transition active:scale-95 hover:bg-sky-50"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default AppLoader;
