import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSignalViewTracking = (signalId: string) => {
  useEffect(() => {
    const trackView = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        await supabase.from('user_signal_views').insert({
          user_id: session.user.id,
          signal_id: signalId
        });
      } catch (error) {
        console.error('Failed to track signal view:', error);
      }
    };

    trackView();
  }, [signalId]);
};
