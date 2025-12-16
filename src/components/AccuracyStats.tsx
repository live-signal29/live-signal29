import { useAccuracyStats } from "@/hooks/useAccuracyStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Crown, TrendingUp, TrendingDown, Calendar } from "lucide-react";

const AccuracyStats = () => {
  const { data: stats, isLoading } = useAccuracyStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">Last 7 Days Performance</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="animate-pulse bg-muted/50">
            <CardContent className="p-4 h-28" />
          </Card>
          <Card className="animate-pulse bg-muted/50">
            <CardContent className="p-4 h-28" />
          </Card>
        </div>
      </div>
    );
  }

  const freeLosses = (stats?.free_total || 0) - (stats?.free_wins || 0);
  const premiumLosses = (stats?.premium_total || 0) - (stats?.premium_wins || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">Last 7 Days Performance</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Free Signals Accuracy */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <div className="p-1.5 rounded-full bg-emerald-500/20">
                <Target className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              Free Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stats?.free_accuracy !== null ? (
              <>
                <p className="text-2xl font-bold text-emerald-500">
                  {stats.free_accuracy}%
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Total: {stats?.free_total || 0}</span>
                  <span className="flex items-center gap-1 text-emerald-500">
                    <TrendingUp className="h-3 w-3" />
                    {stats?.free_wins || 0} wins
                  </span>
                  <span className="flex items-center gap-1 text-red-500">
                    <TrendingDown className="h-3 w-3" />
                    {freeLosses} losses
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No free signals this week
              </p>
            )}
          </CardContent>
        </Card>

        {/* Premium Signals Accuracy */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <div className="p-1.5 rounded-full bg-amber-500/20">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
              </div>
              Premium Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stats?.premium_accuracy !== null ? (
              <>
                <p className="text-2xl font-bold text-amber-500">
                  {stats.premium_accuracy}%
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Total: {stats?.premium_total || 0}</span>
                  <span className="flex items-center gap-1 text-emerald-500">
                    <TrendingUp className="h-3 w-3" />
                    {stats?.premium_wins || 0} wins
                  </span>
                  <span className="flex items-center gap-1 text-red-500">
                    <TrendingDown className="h-3 w-3" />
                    {premiumLosses} losses
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No premium signals this week
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccuracyStats;
