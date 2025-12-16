import { useChartReactions, ReactionType } from "@/hooks/useChartReactions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChartReactionsProps {
  chartId: string;
}

const reactions: { type: ReactionType; emoji: string }[] = [
  { type: 'thumbsup', emoji: '👍' },
  { type: 'heart', emoji: '❤️' },
  { type: 'fire', emoji: '🔥' },
  { type: 'rocket', emoji: '🚀' },
];

export const ChartReactions = ({ chartId }: ChartReactionsProps) => {
  const { reactionCounts, userReaction, toggleReaction, isAuthenticated } = useChartReactions(chartId);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map(({ type, emoji }) => (
        <Button
          key={type}
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (isAuthenticated) {
              toggleReaction(type);
            }
          }}
          className={cn(
            "h-8 px-2 gap-1 text-sm transition-all",
            userReaction === type && "bg-primary/20 border border-primary/40"
          )}
          disabled={!isAuthenticated}
        >
          <span className="text-base">{emoji}</span>
          {reactionCounts[type] > 0 && (
            <span className="text-xs text-muted-foreground">{reactionCounts[type]}</span>
          )}
        </Button>
      ))}
    </div>
  );
};
