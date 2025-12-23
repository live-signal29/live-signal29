import { useDetailedAccuracyStats } from "@/hooks/useDetailedAccuracyStats";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown, Calendar, Sun, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const DetailedAccuracyStats = () => {
  const { data: stats, isLoading } = useDetailedAccuracyStats();

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">Signal Performance</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-muted/30 border-border/50">
              <CardContent className="p-3">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Today",
      icon: <Target className="h-3.5 w-3.5" />,
      total: stats?.today_total || 0,
      wins: stats?.today_wins || 0,
      losses: stats?.today_losses || 0,
      accuracy: stats?.today_accuracy,
      gradient: "from-emerald-500/10 to-emerald-600/5",
      border: "border-emerald-500/20",
      color: "text-emerald-500",
    },
    {
      label: "Yesterday",
      icon: <CalendarDays className="h-3.5 w-3.5" />,
      total: stats?.yesterday_total || 0,
      wins: stats?.yesterday_wins || 0,
      losses: stats?.yesterday_losses || 0,
      accuracy: stats?.yesterday_accuracy,
      gradient: "from-blue-500/10 to-blue-600/5",
      border: "border-blue-500/20",
      color: "text-blue-500",
    },
    {
      label: "This Week",
      icon: <Calendar className="h-3.5 w-3.5" />,
      total: stats?.week_total || 0,
      wins: stats?.week_wins || 0,
      losses: stats?.week_losses || 0,
      accuracy: stats?.week_accuracy,
      gradient: "from-amber-500/10 to-amber-600/5",
      border: "border-amber-500/20",
      color: "text-amber-500",
    },
    {
      label: "Weekend",
      icon: <Sun className="h-3.5 w-3.5" />,
      total: stats?.weekend_total || 0,
      wins: stats?.weekend_wins || 0,
      losses: stats?.weekend_losses || 0,
      accuracy: stats?.weekend_accuracy,
      gradient: "from-purple-500/10 to-purple-600/5",
      border: "border-purple-500/20",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">Signal Performance</span>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {statCards.map((stat) => (
          <Card 
            key={stat.label} 
            className={`bg-gradient-to-br ${stat.gradient} ${stat.border} overflow-hidden`}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`p-1 rounded-full bg-background/50 ${stat.color}`}>
                  {stat.icon}
                </div>
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              
              {stat.total > 0 ? (
                <>
                  <p className={`text-xl sm:text-2xl font-bold ${stat.color}`}>
                    {stat.accuracy !== null ? `${stat.accuracy}%` : '—'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] sm:text-xs text-muted-foreground">
                    <span>Total: {stat.total}</span>
                    <span className="flex items-center gap-0.5 text-emerald-500">
                      <TrendingUp className="h-2.5 w-2.5" />
                      {stat.wins}
                    </span>
                    <span className="flex items-center gap-0.5 text-red-500">
                      <TrendingDown className="h-2.5 w-2.5" />
                      {stat.losses}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground/70 mt-1">No Data</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DetailedAccuracyStats;
