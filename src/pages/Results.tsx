import { useAccuracyStats } from "@/hooks/useAccuracyStats";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Crown, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import SEO from "@/components/SEO";

const Results = () => {
  const { data: stats, isLoading } = useAccuracyStats();
  const { hasAccess } = useSubscriptionAccess();

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Trading Results - Signal Accuracy"
        description="View trading signal accuracy and performance results"
      />
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Signal Results</h1>
            <p className="text-muted-foreground">Track our trading signal performance</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6 h-40" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Free Signals Accuracy */}
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 rounded-full bg-emerald-500/20">
                      <Target className="h-5 w-5 text-emerald-500" />
                    </div>
                    Free Signals Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-4xl font-bold text-emerald-500">
                        {stats?.free_accuracy || 0}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on {stats?.free_total || 0} signals
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-500 font-medium">{stats?.free_wins || 0} Wins</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="text-red-500 font-medium">{(stats?.free_total || 0) - (stats?.free_wins || 0)} Losses</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${stats?.free_accuracy || 0}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Premium Signals Accuracy - Only for Premium Users */}
              {hasAccess && (
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-2 rounded-full bg-amber-500/20">
                        <Crown className="h-5 w-5 text-amber-500" />
                      </div>
                      Premium Signals Accuracy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-4xl font-bold text-amber-500">
                          {stats?.premium_accuracy || 0}%
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Based on {stats?.premium_total || 0} signals
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                          <span className="text-emerald-500 font-medium">{stats?.premium_wins || 0} Wins</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="text-red-500 font-medium">{(stats?.premium_total || 0) - (stats?.premium_wins || 0)} Losses</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${stats?.premium_accuracy || 0}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lock message for non-premium users */}
              {!hasAccess && (
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-6 text-center">
                    <Crown className="h-10 w-10 text-amber-500/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Upgrade to Premium to view premium signal accuracy
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Summary Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Overall Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-foreground">
                        {(stats?.free_total || 0) + (hasAccess ? (stats?.premium_total || 0) : 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Signals</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-500">
                        {(stats?.free_wins || 0) + (hasAccess ? (stats?.premium_wins || 0) : 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Wins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Results;
