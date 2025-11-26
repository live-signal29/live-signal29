import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useFavorites = () => {
  const [favoritePairs, setFavoritePairs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFavorites();
    
    // Defer realtime setup to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      const channel = supabase
        .channel('user-favorite-pairs-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_favorite_pairs'
          },
          () => {
            fetchFavorites();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_favorite_pairs')
        .select('pair_name')
        .eq('user_id', user.id);

      if (error) throw error;

      const favoritePairNames = new Set(data?.map(f => f.pair_name) || []);
      setFavoritePairs(favoritePairNames);
    } catch (error) {
      console.error('Error fetching favorite pairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavoritePair = async (pairName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save favorite pairs",
          variant: "destructive",
        });
        return;
      }

      const isFavorite = favoritePairs.has(pairName);

      // Optimistically update UI immediately
      if (isFavorite) {
        setFavoritePairs(prev => {
          const newSet = new Set(prev);
          newSet.delete(pairName);
          return newSet;
        });
      } else {
        setFavoritePairs(prev => new Set(prev).add(pairName));
      }

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_favorite_pairs')
          .delete()
          .eq('user_id', user.id)
          .eq('pair_name', pairName);

        if (error) throw error;

        toast({
          title: "Removed from favorites",
          description: `${pairName} removed from your favorite pairs`,
        });
      } else {
        // Add to favorites with upsert to handle conflicts
        const { error } = await supabase
          .from('user_favorite_pairs')
          .upsert(
            { user_id: user.id, pair_name: pairName },
            { onConflict: 'user_id,pair_name', ignoreDuplicates: true }
          );

        if (error) throw error;

        toast({
          title: "Added to favorites",
          description: `${pairName} saved to your favorite pairs`,
        });
      }
    } catch (error) {
      console.error('Error toggling favorite pair:', error);
      // Revert optimistic update on error
      fetchFavorites();
      toast({
        title: "Error",
        description: "Failed to update favorite pairs",
        variant: "destructive",
      });
    }
  };

  const isFavoritePair = (pairName: string) => favoritePairs.has(pairName);

  // Keep old method names for compatibility but map to pairs
  const toggleFavorite = toggleFavoritePair;
  const isFavorite = isFavoritePair;

  return { 
    favoritePairs, 
    isFavoritePair, 
    toggleFavoritePair, 
    loading,
    // Legacy compatibility
    favorites: favoritePairs,
    isFavorite,
    toggleFavorite
  };
};
