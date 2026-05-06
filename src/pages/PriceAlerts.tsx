import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useTranslation } from "react-i18next";

const PAIRS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "ETHUSD", "USDCAD", "AUDUSD", "USOIL"];

const PriceAlerts = () => {
  const { t } = useTranslation();
  const { list, create, remove } = usePriceAlerts();
  const [pair, setPair] = useState("XAUUSD");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");

  const submit = () => {
    const num = parseFloat(price);
    if (!num || num <= 0) return;
    create.mutate({ pair, target_price: num, condition });
    setPrice("");
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">{t("price_alerts")}</h1>
        </div>

        <Card className="p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAIRS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={condition} onValueChange={(v: any) => setCondition(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="above">{t("above")} ▲</SelectItem>
                <SelectItem value="below">{t("below")} ▼</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            type="number"
            step="0.0001"
            placeholder={t("target_price")}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Button onClick={submit} disabled={!price || create.isPending} className="w-full">
            {t("add_alert")}
          </Button>
        </Card>

        <div className="space-y-2">
          {list.data?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">{t("no_alerts")}</p>
          )}
          {list.data?.map((a) => (
            <Card key={a.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {a.condition === "above" ? (
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-rose-500" />
                )}
                <div>
                  <p className="font-semibold">{a.pair}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(a.condition)} {a.target_price}
                    {a.triggered_at && " • ✅ Triggered"}
                  </p>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(a.id)}>
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceAlerts;
