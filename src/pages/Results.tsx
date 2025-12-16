import { useAccuracyStats } from "@/hooks/useAccuracyStats";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Crown, TrendingUp, TrendingDown, BarChart3, Calendar } from "lucide-react";
import SEO from "@/components/SEO";

const Results = () => {
  const { data: stats, isLoading } = useAccuracyStats();

  const freeLosses = (stats?.free_total || 0) - (stats?.free_wins || 0);
  const premiumLosses = (stats?.premium_total || 0) - (stats?.premium_wins || 0);

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
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Signal Results</h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Last 7 Days Performance</span>
            </div>
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
                  {stats?.free_accuracy !== null ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-4xl font-bold text-emerald-500">
                            {stats.free_accuracy}%
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
                            <span className="text-red-500 font-medium">{freeLosses} Losses</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${stats.free_accuracy}%` }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground py-4">
                      No free signals this week
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Premium Signals Accuracy - Visible to ALL users */}
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
                  {stats?.premium_accuracy !== null ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-4xl font-bold text-amber-500">
                            {stats.premium_accuracy}%
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
                            <span className="text-red-500 font-medium">{premiumLosses} Losses</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${stats.premium_accuracy}%` }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground py-4">
                      No premium signals this week
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Weekly Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-foreground">
                        {(stats?.free_total || 0) + (stats?.premium_total || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Signals</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-500">
                        {(stats?.free_wins || 0) + (stats?.premium_wins || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Wins</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-red-500">
                        {freeLosses + premiumLosses}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Losses</p>
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
