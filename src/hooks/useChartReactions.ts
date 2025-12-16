import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export type ReactionType = 'thumbsup' | 'heart' | 'fire' | 'rocket';

export const useChartReactions = (chartId: string) => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  const { data: reactions } = useQuery({
    queryKey: ["chart-reactions", chartId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_reactions")
        .select("*")
        .eq("chart_id", chartId);
      if (error) throw error;
      return data;
    },
  });

  const reactionCounts = {
    thumbsup: reactions?.filter(r => r.reaction_type === 'thumbsup').length || 0,
    heart: reactions?.filter(r => r.reaction_type === 'heart').length || 0,
    fire: reactions?.filter(r => r.reaction_type === 'fire').length || 0,
    rocket: reactions?.filter(r => r.reaction_type === 'rocket').length || 0,
  };

  const userReaction = reactions?.find(r => r.user_id === userId)?.reaction_type as ReactionType | undefined;

  const toggleReaction = useMutation({
    mutationFn: async (reactionType: ReactionType) => {
      if (!userId) throw new Error("Not authenticated");

      const existingReaction = reactions?.find(r => r.user_id === userId);

      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // Remove reaction
          const { error } = await supabase
            .from("chart_reactions")
            .delete()
            .eq("id", existingReaction.id);
          if (error) throw error;
        } else {
          // Update reaction
          const { error } = await supabase
            .from("chart_reactions")
            .update({ reaction_type: reactionType })
            .eq("id", existingReaction.id);
          if (error) throw error;
        }
      } else {
        // Insert new reaction
        const { error } = await supabase
          .from("chart_reactions")
          .insert({ chart_id: chartId, user_id: userId, reaction_type: reactionType });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-reactions", chartId] });
    },
  });

  return {
    reactionCounts,
    userReaction,
    toggleReaction: toggleReaction.mutate,
    isAuthenticated: !!userId,
  };
};
