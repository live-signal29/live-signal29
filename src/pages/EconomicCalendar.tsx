import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useForexNews } from "@/hooks/useForexNews";
import { Card } from "@/components/ui/card";
import { Calendar, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const impactColor = (impact: string) => {
  switch (impact) {
    case "high": return "bg-destructive text-destructive-foreground";
    case "medium": return "bg-amber-500 text-white";
    default: return "bg-muted text-muted-foreground";
  }
};

const EconomicCalendar = () => {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { data, isLoading } = useForexNews(tab === "upcoming");

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Economic Calendar - High Impact Forex News Events"
        description="Track upcoming high-impact economic events: NFP, CPI, FOMC and more."
      />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-full bg-primary/10 mb-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Economic Calendar</h1>
            <p className="text-sm text-muted-foreground">High-impact news that moves markets</p>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              variant={tab === "upcoming" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("upcoming")}
              className="flex-1"
            >
              <Clock className="h-4 w-4 mr-1" />
              Upcoming
            </Button>
            <Button
              variant={tab === "past" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("past")}
              className="flex-1"
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Past Events
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading events…</div>
          ) : !data || data.length === 0 ? (
            <Card className="p-8 text-center glass-card">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No {tab} events found.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {data.map((event) => {
                const time = new Date(event.event_time);
                return (
                  <Card key={event.id} className="p-3 glass-card hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${impactColor(event.impact)}`}>
                        {event.impact}
                      </div>
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{event.currency}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{event.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {time.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    {(event.forecast || event.previous || event.actual) && (
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border text-center">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Previous</p>
                          <p className="text-xs font-mono">{event.previous || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Forecast</p>
                          <p className="text-xs font-mono">{event.forecast || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Actual</p>
                          <p className="text-xs font-mono font-bold">{event.actual || "—"}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EconomicCalendar;
