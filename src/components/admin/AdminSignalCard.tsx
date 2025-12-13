import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Edit, Trash2, Crown, Check, X, Radio, FolderOpen, CheckCircle2, Target, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface AdminSignalCardProps {
  signal: {
    id: string;
    pair: string;
    type: "Buy" | "Sell";
    entry: string;
    tp1: string;
    tp2?: string;
    tp3?: string;
    tp4?: string;
    sl: string;
    tp1_hit: boolean;
    tp2_hit: boolean;
    tp3_hit: boolean;
    tp4_hit: boolean;
    sl_hit?: boolean;
    signal_status?: string;
    created_at: string;
    is_premium?: boolean;
    risk_level?: string;
    signal_type?: string;
    published?: boolean;
  };
  onEdit: (signal: any) => void;
  onDelete: (id: string) => void;
  sectionType: "live" | "open" | "closed";
}

const AdminSignalCard = ({ signal, onEdit, onDelete, sectionType }: AdminSignalCardProps) => {
  const queryClient = useQueryClient();

  const sectionConfig = {
    live: {
      icon: Radio,
      borderColor: "border-yellow-500/30",
      bgGradient: "from-yellow-500/5",
      headerBg: "bg-yellow-500/10 border-yellow-500/20",
      headerText: "text-yellow-600 dark:text-yellow-400",
      iconColor: "text-yellow-500",
    },
    open: {
      icon: FolderOpen,
      borderColor: "border-blue-500/30",
      bgGradient: "from-blue-500/5",
      headerBg: "bg-blue-500/10 border-blue-500/20",
      headerText: "text-blue-600 dark:text-blue-400",
      iconColor: "text-blue-500",
    },
    closed: {
      icon: signal.sl_hit ? CheckCircle2 : CheckCircle2,
      borderColor: signal.sl_hit ? "border-red-500/30" : "border-emerald-500/30",
      bgGradient: signal.sl_hit ? "from-red-500/5" : "from-emerald-500/5",
      headerBg: signal.sl_hit ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20",
      headerText: signal.sl_hit ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
      iconColor: signal.sl_hit ? "text-red-500" : "text-emerald-500",
    },
  };

  const config = sectionConfig[sectionType];
  const Icon = config.icon;

  const toggleTpHit = async (field: string, currentValue: boolean) => {
    try {
      const updates: any = { [field]: !currentValue };
      
      // If marking final TP as hit, auto-close the signal
      if (field === "tp3_hit" && !currentValue && signal.tp3 && !signal.tp4) {
        updates.signal_status = "CLOSE";
      } else if (field === "tp4_hit" && !currentValue && signal.tp4) {
        updates.signal_status = "CLOSE";
      }

      const { error } = await supabase
        .from("signals")
        .update(updates)
        .eq("id", signal.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast.success("Updated successfully");
    } catch (error: any) {
      toast.error("Update failed");
    }
  };

  const markSlHit = async () => {
    try {
      const { error } = await supabase
        .from("signals")
        .update({ sl_hit: true, signal_status: "CLOSE" })
        .eq("id", signal.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast.success("Trade closed - SL Hit");
    } catch (error: any) {
      toast.error("Update failed");
    }
  };

  const moveToOpen = async () => {
    try {
      const { error } = await supabase
        .from("signals")
        .update({ signal_status: "LIVE" })
        .eq("id", signal.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast.success("Signal moved to Open Trades");
    } catch (error: any) {
      toast.error("Update failed");
    }
  };

  const togglePremium = async () => {
    try {
      const { error } = await supabase
        .from("signals")
        .update({ is_premium: !signal.is_premium })
        .eq("id", signal.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast.success(signal.is_premium ? "Premium lock removed" : "Premium lock added");
    } catch (error: any) {
      toast.error("Update failed");
    }
  };

  return (
    <Card className={`overflow-hidden border-2 ${config.borderColor} bg-gradient-to-br ${config.bgGradient} to-transparent`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className={`flex items-center justify-between p-3 ${config.headerBg} border-b`}>
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.iconColor}`} />
            <span className={`text-xs font-bold uppercase ${config.headerText}`}>
              {sectionType === "live" && "Live Signal"}
              {sectionType === "open" && "Open Trade"}
              {sectionType === "closed" && (signal.sl_hit ? "SL Hit" : "TP Done")}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(signal.created_at), "dd MMM HH:mm")}
          </span>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Pair & Type Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`${signal.type === "Buy" ? "bg-emerald-500" : "bg-red-500"} text-white font-bold`}>
                {signal.type.toUpperCase()}
              </Badge>
              <span className="font-bold text-lg">{signal.pair}</span>
              {signal.is_premium && <Crown className="h-4 w-4 text-yellow-500" />}
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(signal)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(signal.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Entry */}
          <div className="bg-muted/50 rounded-lg p-2 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Entry</span>
            <span className="font-bold text-primary">{signal.entry}</span>
          </div>

          {/* Premium Toggle */}
          <div className="flex items-center justify-between bg-yellow-500/10 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-medium">Premium Lock</span>
            </div>
            <Switch checked={signal.is_premium || false} onCheckedChange={togglePremium} />
          </div>

          {/* TP/SL Actions - Only for Live & Open */}
          {sectionType !== "closed" && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">Take Profit Actions</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={signal.tp1_hit ? "default" : "outline"}
                  className={`text-xs ${signal.tp1_hit ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
                  onClick={() => toggleTpHit("tp1_hit", signal.tp1_hit)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  TP1 {signal.tp1}
                </Button>
                {signal.tp2 && (
                  <Button
                    size="sm"
                    variant={signal.tp2_hit ? "default" : "outline"}
                    className={`text-xs ${signal.tp2_hit ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
                    onClick={() => toggleTpHit("tp2_hit", signal.tp2_hit)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    TP2 {signal.tp2}
                  </Button>
                )}
                {signal.tp3 && (
                  <Button
                    size="sm"
                    variant={signal.tp3_hit ? "default" : "outline"}
                    className={`text-xs ${signal.tp3_hit ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
                    onClick={() => toggleTpHit("tp3_hit", signal.tp3_hit)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    TP3 {signal.tp3}
                  </Button>
                )}
                {signal.tp4 && (
                  <Button
                    size="sm"
                    variant={signal.tp4_hit ? "default" : "outline"}
                    className={`text-xs ${signal.tp4_hit ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
                    onClick={() => toggleTpHit("tp4_hit", signal.tp4_hit)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    TP4 {signal.tp4}
                  </Button>
                )}
              </div>

              {/* SL Hit Button */}
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white"
                onClick={markSlHit}
              >
                <ShieldX className="h-3 w-3 mr-1" />
                Close Trade - SL Hit ({signal.sl})
              </Button>

              {/* Move to Open (only for Live) */}
              {sectionType === "live" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs border-blue-500/50 text-blue-500 hover:bg-blue-500 hover:text-white"
                  onClick={moveToOpen}
                >
                  <Target className="h-3 w-3 mr-1" />
                  Move to Open Trades
                </Button>
              )}
            </div>
          )}

          {/* Closed Trade Summary */}
          {sectionType === "closed" && (
            <div className={`text-center p-3 rounded-lg ${signal.sl_hit ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
              <Badge className={`${signal.sl_hit ? 'bg-red-500' : 'bg-emerald-500'} text-white font-bold`}>
                {signal.sl_hit ? '✗ SL HIT' : `✓ ${[signal.tp1_hit, signal.tp2_hit, signal.tp3_hit, signal.tp4_hit].filter(Boolean).length} TP(s) HIT`}
              </Badge>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {signal.risk_level && (
              <Badge variant="outline" className="text-[10px]">{signal.risk_level} Risk</Badge>
            )}
            {signal.signal_type && (
              <Badge variant="outline" className="text-[10px]">{signal.signal_type}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSignalCard;
