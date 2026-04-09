import { useMarketIdeaReactions, useAddReaction } from "@/hooks/useMarketIdeas";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MarketIdeaReactionsProps {
  ideaId: string;
}

const reactionButtons = [
  { type: "helpful" as const, emoji: "👍" },
  { type: "loved" as const, emoji: "❤️" },
  { type: "accurate" as const, emoji: "🔥" },
  { type: "rocket" as const, emoji: "🚀" },
];

export const MarketIdeaReactions = ({ ideaId }: MarketIdeaReactionsProps) => {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const { data: reactions } = useMarketIdeaReactions(ideaId, userId);
  const addReaction = useAddReaction();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const handleReaction = (type: "helpful" | "accurate" | "loved" | "rocket") => {
    if (!userId) return;
    addReaction.mutate({ ideaId, userId, reactionType: type });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {reactionButtons.map(({ type, emoji }) => (
        <button
          key={type}
          onClick={(e) => {
            e.stopPropagation();
            handleReaction(type);
          }}
          disabled={!userId}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-105",
            reactions?.userReaction === type
              ? "bg-primary/20 text-primary ring-1 ring-primary/30"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          <span className="text-lg">{emoji}</span>
          <span className="font-medium">{reactions?.[type] || 0}</span>
        </button>
      ))}
    </div>
  );
};
