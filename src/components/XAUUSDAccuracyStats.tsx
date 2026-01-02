import { useXAUUSDAccuracyStats, XAUUSDDayData } from "@/hooks/useXAUUSDAccuracyStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown, BarChart3, Activity, Zap, Calendar, Clock, CalendarDays, Sun } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, parseISO } from "date-fns";

const XAUUSDAccuracyStats = () => {
  const { data: stats, isLoading } = useXAUUSDAccuracyStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-10 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = stats?.last_7_days?.map((day: XAUUSDDayData) => ({
    date: format(parseISO(day.date), "EEE"),
    fullDate: format(parseISO(day.date), "MMM d"),
    wins: day.wins,
    losses: day.losses,
    pips: day.pips,
    total: day.total,
  })) || [];

  const hasData = (stats?.total_signals || 0) > 0;

  // Date-wise performance cards
  const dateCards = [
    {
      label: "Today",
      icon: Calendar,
      total: stats?.today_total || 0,
      wins: stats?.today_wins || 0,
      losses: stats?.today_losses || 0,
      accuracy: stats?.today_accuracy,
      color: "from-blue-500/20 to-blue-600/10",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-500",
    },
    {
      label: "Yesterday",
      icon: Clock,
      total: stats?.yesterday_total || 0,
      wins: stats?.yesterday_wins || 0,
      losses: stats?.yesterday_losses || 0,
      accuracy: stats?.yesterday_accuracy,
      color: "from-purple-500/20 to-purple-600/10",
      borderColor: "border-purple-500/30",
      iconColor: "text-purple-500",
    },
    {
      label: "This Week",
      icon: CalendarDays,
      total: stats?.week_total || 0,
      wins: stats?.week_wins || 0,
      losses: stats?.week_losses || 0,
      accuracy: stats?.week_accuracy,
      color: "from-emerald-500/20 to-emerald-600/10",
      borderColor: "border-emerald-500/30",
      iconColor: "text-emerald-500",
    },
    {
      label: "Weekend",
      icon: Sun,
      total: stats?.weekend_total || 0,
      wins: stats?.weekend_wins || 0,
      losses: stats?.weekend_losses || 0,
      accuracy: stats?.weekend_accuracy,
      color: "from-orange-500/20 to-orange-600/10",
      borderColor: "border-orange-500/30",
      iconColor: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Date-wise Performance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {dateCards.map((card) => {
          const hasCardData = card.total > 0;
          const Icon = card.icon;
          
          return (
            <Card 
              key={card.label} 
              className={`bg-gradient-to-br ${card.color} ${card.borderColor} overflow-hidden`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                  <span className="text-sm font-medium text-foreground">{card.label}</span>
                </div>
                
                {hasCardData ? (
                  <>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className={`text-2xl font-bold ${card.iconColor}`}>
                        {card.accuracy !== null ? `${card.accuracy}%` : '-'}
                      </span>
                      <span className="text-xs text-muted-foreground">accuracy</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{card.total} trades</span>
                      <span className="text-emerald-500">{card.wins}W</span>
                      <span className="text-red-500">{card.losses}L</span>
                    </div>
                  </>
                ) : (
                  <div className="py-2">
                    <span className="text-muted-foreground text-sm">No Data</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main XAUUSD Stats Card */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-full bg-amber-500/20">
              <Target className="h-5 w-5 text-amber-500" />
            </div>
            XAUUSD Signal Accuracy
            <span className="ml-auto text-xs font-normal text-muted-foreground bg-amber-500/10 px-2 py-1 rounded-full">
              Gold/XAU
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <>
              {/* Main Win Rate Display */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-5xl font-bold text-amber-500">
                    {stats?.win_rate || 0}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Win Rate • {stats?.total_signals || 0} Total Signals
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <div className="flex items-center gap-2 text-sm justify-end">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-500 font-medium">{stats?.total_wins || 0} Wins</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm justify-end">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="text-red-500 font-medium">{stats?.total_losses || 0} Losses</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.win_rate || 0}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <BarChart3 className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className={`text-xl font-bold ${(stats?.total_pips || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {(stats?.total_pips || 0) >= 0 ? '+' : ''}{stats?.total_pips || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Total Pips</p>
                </div>
                
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-xl font-bold text-emerald-500">
                    +{stats?.avg_win_pips || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Avg Win</p>
                </div>
                
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  </div>
                  <p className="text-xl font-bold text-red-500">
                    -{stats?.avg_loss_pips || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Avg Loss</p>
                </div>
                
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {stats?.total_signals || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Signals</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-amber-500/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No closed XAUUSD signals yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Stats will appear when signals close</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7-Day Performance Chart */}
      {hasData && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Last 7 Days Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }} 
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    className="text-muted-foreground"
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                  />
                  <Bar dataKey="wins" name="Wins" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="losses" name="Losses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Pips Chart */}
            <div className="h-32 mt-4">
              <p className="text-xs text-muted-foreground mb-2">Daily Pips</p>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`${value >= 0 ? '+' : ''}${value} pips`, 'Pips']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pips" 
                    stroke="hsl(45, 93%, 47%)" 
                    fill="hsl(45, 93%, 47%)" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default XAUUSDAccuracyStats;
