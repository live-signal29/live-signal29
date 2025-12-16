import { useChartReactions, ReactionType } from "@/hooks/useChartReactions";
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
    <div className="flex items-center gap-2 flex-wrap">
      {reactions.map(({ type, emoji }) => (
        <button
          key={type}
          onClick={(e) => {
            e.stopPropagation();
            if (isAuthenticated) {
              toggleReaction(type);
            }
          }}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-105",
            userReaction === type
              ? "bg-primary/20 text-primary ring-1 ring-primary/30"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
          disabled={!isAuthenticated}
        >
          <span className="text-lg">{emoji}</span>
          <span className="font-medium">{reactionCounts[type]}</span>
        </button>
      ))}
    </div>
  );
};
