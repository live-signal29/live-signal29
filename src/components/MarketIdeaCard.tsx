import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MarketIdea, useMarketIdeaReactions, useAddReaction } from "@/hooks/useMarketIdeas";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ThumbsUp, Flame, Heart } from "lucide-react";
import { toast } from "sonner";

interface MarketIdeaCardProps {
  idea: MarketIdea;
}

const MarketIdeaCard = ({ idea }: MarketIdeaCardProps) => {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const { data: reactions } = useMarketIdeaReactions(idea.id, userId);
  const addReaction = useAddReaction();

  // Get current user
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  });

  const handleReaction = (type: "helpful" | "accurate" | "loved") => {
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
    { type: "helpful" as const, icon: ThumbsUp, label: "Helpful", count: reactions?.helpful || 0 },
    { type: "accurate" as const, icon: Flame, label: "Accurate", count: reactions?.accurate || 0 },
    { type: "loved" as const, icon: Heart, label: "Loved", count: reactions?.loved || 0 },
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

      {/* Optional Image */}
      {idea.image_url && (
        <div className="mb-2 rounded-md overflow-hidden">
          <img
            src={idea.image_url}
            alt={idea.title}
            className="w-full h-32 object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
        {idea.description}
      </p>

      {/* Reactions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        {reactionButtons.map(({ type, icon: Icon, label, count }) => (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-all",
              reactions?.userReaction === type
                ? "bg-primary/20 text-primary"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MarketIdeaCard;
