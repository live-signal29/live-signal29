import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Header } from "@/components/Header";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

interface Brief { id: string; title: string; summary: string; sentiment: string; brief_date: string; created_at: string; }

export default function MarketBrief() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    supabase.from("market_briefs").select("*").order("created_at", { ascending: false }).limit(30).then(({ data }) => {
      setBriefs((data as Brief[]) || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const generateNow = async () => {
    setLoading(true);
    await supabase.functions.invoke("generate-market-brief");
    load();
  };

  const sentIcon = (s?: string) => s === "bullish" ? <TrendingUp className="w-4 h-4 text-success-deep" /> : s === "bearish" ? <TrendingDown className="w-4 h-4 text-destructive" /> : <Minus className="w-4 h-4 text-muted-foreground" />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Newspaper className="text-primary" /> Daily Market Brief</h1>
          <button onClick={generateNow} className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground">Refresh</button>
        </div>
        {loading ? <p>Loading...</p> : briefs.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">No briefs yet. Tap Refresh to generate one!</Card>
        ) : (
          <div className="space-y-3">
            {briefs.map(b => (
              <Card key={b.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="flex items-center gap-1">{sentIcon(b.sentiment)} {b.sentiment || "neutral"}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{format(new Date(b.created_at), "MMM dd, HH:mm")}</span>
                </div>
                <h3 className="font-semibold mb-2">{b.title}</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{b.summary}</ReactMarkdown>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
