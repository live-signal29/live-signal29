import { useEffect } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Push notifications themselves are sent by the backend (send-onesignal-notification).
// This provider: (1) boots OneSignal + links the device to the user, and
// (2) shows in-app toasts while the app is open.
export const OneSignalProvider = ({ children }: { children: React.ReactNode }) => {
  useOneSignal();

  useEffect(() => {
    const signalChannel = supabase
      .channel('inapp-signal-toasts')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'signals' }, (payload) => {
        const o: any = payload.old ?? {};
        const n: any = payload.new;
        for (const k of [1, 2, 3]) {
          if (!o[`tp${k}_hit`] && n[`tp${k}_hit`]) {
            toast.success(`TP${k} Hit!`, { description: `${n.pair} reached TP${k}` });
          }
        }
        if (!o.sl_hit && n.sl_hit) {
          toast.error('SL Hit', { description: `${n.pair} hit stop loss` });
        }
      })
      .subscribe();

    const chartChannel = supabase
      .channel('inapp-chart-toasts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chart_analysis', filter: 'published=eq.true' },
        (payload) => {
          toast.success('New Chart Analysis', { description: (payload.new as any).title });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signalChannel);
      supabase.removeChannel(chartChannel);
    };
  }, []);

  return <>{children}</>;
};
