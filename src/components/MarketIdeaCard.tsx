import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { MarketIdea, useMarketIdeaReactions, useAddReaction } from "@/hooks/useMarketIdeas";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MarketIdeaCardProps {
  idea: MarketIdea;
}

const MarketIdeaCard = ({ idea }: MarketIdeaCardProps) => {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const { data: reactions } = useMarketIdeaReactions(idea.id, userId);
  const addReaction = useAddReaction();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const handleReaction = (type: "helpful" | "accurate" | "loved" | "rocket") => {
    if (!userId) {
      toast.error("Please login to react");
      return;
    }

    addReaction.mutate({
      ideaId: idea.id,
      userId,
      reactionType: type,
    });
  };

  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true });

  const reactionButtons = [
    { type: "helpful" as const, emoji: "👍", count: reactions?.helpful || 0 },
    { type: "loved" as const, emoji: "❤️", count: reactions?.loved || 0 },
    { type: "accurate" as const, emoji: "🔥", count: reactions?.accurate || 0 },
    { type: "rocket" as const, emoji: "🚀", count: reactions?.rocket || 0 },
  ];

  return (
    <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm">{idea.title}</h4>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
          {timeAgo}
        </span>
      </div>

      {/* Description - always shown */}
      <p className="text-xs text-muted-foreground mb-3">
        {idea.description}
      </p>

      {/* Optional Image - shown below text if exists */}
      {idea.image_url && (
        <div className="mb-3 rounded-md overflow-hidden">
          <img
            src={idea.image_url}
            alt={idea.title}
            className="w-full h-32 object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        {reactionButtons.map(({ type, emoji, count }) => (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-105",
              reactions?.userReaction === type
                ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <span>{emoji}</span>
            <span className="font-medium">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MarketIdeaCard;
