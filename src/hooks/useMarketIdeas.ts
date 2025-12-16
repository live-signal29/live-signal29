import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketIdea {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketIdeaReaction {
  id: string;
  market_idea_id: string;
  user_id: string;
  reaction_type: "helpful" | "accurate" | "loved";
  created_at: string;
}

export interface ReactionCounts {
  helpful: number;
  accurate: number;
  loved: number;
  userReaction: string | null;
}

export const useMarketIdeas = () => {
  return useQuery({
    queryKey: ["market-ideas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_ideas")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MarketIdea[];
    },
  });
};

export const useMarketIdeaReactions = (ideaId: string, userId: string | undefined) => {
  return useQuery({
    queryKey: ["market-idea-reactions", ideaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_idea_reactions")
        .select("*")
        .eq("market_idea_id", ideaId);

      if (error) throw error;

      const reactions = data as MarketIdeaReaction[];
      const counts: ReactionCounts = {
        helpful: reactions.filter((r) => r.reaction_type === "helpful").length,
        accurate: reactions.filter((r) => r.reaction_type === "accurate").length,
        loved: reactions.filter((r) => r.reaction_type === "loved").length,
        userReaction: userId
          ? reactions.find((r) => r.user_id === userId)?.reaction_type || null
          : null,
      };

      return counts;
    },
  });
};

export const useAddReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ideaId,
      userId,
      reactionType,
    }: {
      ideaId: string;
      userId: string;
      reactionType: "helpful" | "accurate" | "loved";
    }) => {
      // First check if user already has a reaction
      const { data: existing } = await supabase
        .from("market_idea_reactions")
        .select("id, reaction_type")
        .eq("market_idea_id", ideaId)
        .eq("user_id", userId)
        .single();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Remove reaction if same type clicked
          const { error } = await supabase
            .from("market_idea_reactions")
            .delete()
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          // Update to new reaction type
          const { error } = await supabase
            .from("market_idea_reactions")
            .update({ reaction_type: reactionType })
            .eq("id", existing.id);
          if (error) throw error;
        }
      } else {
        // Insert new reaction
        const { error } = await supabase.from("market_idea_reactions").insert({
          market_idea_id: ideaId,
          user_id: userId,
          reaction_type: reactionType,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["market-idea-reactions", variables.ideaId],
      });
    },
  });
};
