import { useEffect, useState } from 'react';

// Same look as the static boot splash in index.html, so there's no visual jump when React takes over.
const AppLoader = ({ label = 'Loading live data' }: { label?: string }) => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-[18px]"
      role="status"
      aria-live="polite"
    >
      <img src="/loader-logo.png" alt="Live Signals" width={88} height={88} className="rounded-full bg-white shadow-lg" />
      <div className="h-[3px] w-36 overflow-hidden rounded-full bg-sky-500/20">
        <div className="app-loader-bar h-full w-1/2 rounded-full bg-sky-500" />
      </div>
      <p
        className={
          slow
            ? 'text-xs px-3 py-1 rounded-full text-amber-600 dark:text-amber-400 bg-amber-500/15 transition-all'
            : 'text-xs px-3 py-1 text-muted-foreground'
        }
      >
        {slow ? 'Slow network — loading may take longer' : `${label}…`}
      </p>
    </div>
  );
};

export default AppLoader;
