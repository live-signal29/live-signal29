import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const BrokerAccountButton = () => {
  return (
    <div className="fixed bottom-6 left-6 z-50">
      <Button
        onClick={() => window.open("https://one.exnessonelink.com/a/vtkbbmje", "_blank")}
        className="h-14 px-6 rounded-full shadow-lg hover:scale-105 transition-transform"
        size="lg"
      >
        <ExternalLink className="mr-2 h-5 w-5" />
        Open Broker Account
      </Button>
    </div>
  );
};
