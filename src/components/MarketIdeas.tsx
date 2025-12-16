import { useMarketIdeas } from "@/hooks/useMarketIdeas";
import MarketIdeaCard from "./MarketIdeaCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

const MarketIdeas = () => {
  const { data: ideas, isLoading } = useMarketIdeas();

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Market Ideas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-muted/50 rounded-lg h-24" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!ideas || ideas.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Market Ideas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ideas.map((idea) => (
          <MarketIdeaCard key={idea.id} idea={idea} />
        ))}
      </CardContent>
    </Card>
  );
};

export default MarketIdeas;
