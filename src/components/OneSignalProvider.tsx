import { useEffect } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const OneSignalProvider = ({ children }: { children: React.ReactNode }) => {
  const { initialized, permissionGranted } = useOneSignal();

  useEffect(() => {
    if (!initialized || !permissionGranted) return;

    console.log('OneSignal ready, setting up signal and chart listeners...');

    // Subscribe to signal changes for push notifications
    const signalChannel = supabase
      .channel('onesignal-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals',
          filter: 'published=eq.true'
        },
        (payload) => {
          const s: any = payload.new;
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🚀 New Signal', {
              body: `${s.pair} ${String(s.type || '').toUpperCase()} @ ${s.entry}`,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: `new-${s.id}`,
            });
          }
          toast.success('🚀 New Signal Published', {
            description: `${s.pair} ${String(s.type || '').toUpperCase()} — Entry ${s.entry}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'signals'
        },
        (payload) => {
          const oldSignal = payload.old;
          const newSignal = payload.new;

          // TP1 Hit
          if (!oldSignal.tp1_hit && newSignal.tp1_hit) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🎯 TP1 Hit!', {
                body: `${newSignal.pair} reached TP1: ${newSignal.tp1}`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `tp1-${newSignal.id}`
              });
            }
            toast.success('TP1 Hit!', {
              description: `${newSignal.pair} reached TP1`
            });
          }

          // TP2 Hit
          if (!oldSignal.tp2_hit && newSignal.tp2_hit) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🎯 TP2 Hit!', {
                body: `${newSignal.pair} reached TP2: ${newSignal.tp2}`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `tp2-${newSignal.id}`
              });
            }
            toast.success('TP2 Hit!', {
              description: `${newSignal.pair} reached TP2`
            });
          }

          // TP3 Hit
          if (!oldSignal.tp3_hit && newSignal.tp3_hit) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🎯 TP3 Hit!', {
                body: `${newSignal.pair} reached TP3: ${newSignal.tp3}`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `tp3-${newSignal.id}`
              });
            }
            toast.success('TP3 Hit!', {
              description: `${newSignal.pair} reached TP3`
            });
          }

          // SL Hit
          if (!oldSignal.sl_hit && newSignal.sl_hit) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🛑 Stop Loss Hit', {
                body: `${newSignal.pair} hit SL: ${newSignal.sl}`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `sl-${newSignal.id}`
              });
            }
            toast.error('SL Hit', {
              description: `${newSignal.pair} hit stop loss`
            });
          }

          // Signal Closed
          if (oldSignal.status !== 'CLOSE' && newSignal.status === 'CLOSE') {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('✅ Signal Closed', {
                body: `${newSignal.pair} signal has been closed`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `close-${newSignal.id}`
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to chart analysis for notifications
    const chartChannel = supabase
      .channel('onesignal-charts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chart_analysis',
          filter: 'published=eq.true'
        },
        (payload) => {
          const chart = payload.new;
          
          // Show browser notification for new chart
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('📊 New Chart Analysis!', {
              body: chart.title,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: `chart-${chart.id}`,
              data: { chartId: chart.id }
            });
          }

          toast.success('New Chart Analysis', {
            description: chart.title
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signalChannel);
      supabase.removeChannel(chartChannel);
    };
  }, [initialized, permissionGranted]);

  return <>{children}</>;
};
