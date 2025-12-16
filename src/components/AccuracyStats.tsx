import { useAccuracyStats } from "@/hooks/useAccuracyStats";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Crown, Target } from "lucide-react";

const AccuracyStats = () => {
  const { data: stats, isLoading } = useAccuracyStats();
  const { hasAccess } = useSubscriptionAccess();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Card className="animate-pulse bg-muted/50">
          <CardContent className="p-4 h-20" />
        </Card>
        {hasAccess && (
          <Card className="animate-pulse bg-muted/50">
            <CardContent className="p-4 h-20" />
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      {/* Free Accuracy - visible to all */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-emerald-500/20">
                <Target className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Free Signals</p>
                <p className="text-lg font-bold text-emerald-500">
                  {stats?.free_accuracy || 0}%
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {stats?.free_wins || 0} / {stats?.free_total || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">wins</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium Accuracy - visible to premium users only */}
      {hasAccess && (
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-amber-500/20">
                  <Crown className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Premium Signals</p>
                  <p className="text-lg font-bold text-amber-500">
                    {stats?.premium_accuracy || 0}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {stats?.premium_wins || 0} / {stats?.premium_total || 0}
                </p>
                <p className="text-[10px] text-muted-foreground">wins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccuracyStats;
