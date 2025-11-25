import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFavorites();
    
    // Real-time sync for favorites
    const channel = supabase
      .channel('user-favorites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_favorites'
        },
        () => {
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_favorites')
        .select('signal_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const favoriteIds = new Set(data?.map(f => f.signal_id) || []);
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (signalId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save favorites",
          variant: "destructive",
        });
        return;
      }

      const isFavorite = favorites.has(signalId);

      // Optimistically update UI immediately
      if (isFavorite) {
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(signalId);
          return newSet;
        });
      } else {
        setFavorites(prev => new Set(prev).add(signalId));
      }

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('signal_id', signalId);

        if (error) throw error;

        toast({
          title: "Removed from favorites",
          description: "Signal removed from your favorites",
        });
      } else {
        // Add to favorites with upsert to handle conflicts
        const { error } = await supabase
          .from('user_favorites')
          .upsert(
            { user_id: user.id, signal_id: signalId },
            { onConflict: 'user_id,signal_id', ignoreDuplicates: true }
          );

        if (error) throw error;

        toast({
          title: "Added to favorites",
          description: "Signal saved to your favorites",
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert optimistic update on error
      fetchFavorites();
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  const isFavorite = (signalId: string) => favorites.has(signalId);

  return { favorites, isFavorite, toggleFavorite, loading };
};
