import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Trash2, Plus } from "lucide-react";
import { useTradeJournal } from "@/hooks/useTradeJournal";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const TradeJournal = () => {
  const { t } = useTranslation();
  const { list, create, remove, stats } = useTradeJournal();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    pair: "XAUUSD",
    trade_type: "BUY" as "BUY" | "SELL",
    entry_price: "",
    exit_price: "",
    lot_size: "0.01",
    result: "open" as "win" | "loss" | "breakeven" | "open",
    pnl: "",
    notes: "",
  });

  const s = stats(list.data || []);

  const submit = () => {
    if (!form.entry_price) return;
    create.mutate({
      pair: form.pair,
      trade_type: form.trade_type,
      entry_price: parseFloat(form.entry_price),
      exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
      lot_size: parseFloat(form.lot_size) || 0.01,
      result: form.result,
      pnl: form.pnl ? parseFloat(form.pnl) : null,
      notes: form.notes || null,
      closed_at: form.result !== "open" ? new Date().toISOString() : null,
    });
    setOpen(false);
    setForm({ ...form, entry_price: "", exit_price: "", pnl: "", notes: "" });
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("trade_journal")}</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("add_trade")}</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t("add_trade")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={t("pair")} value={form.pair} onChange={(e) => setForm({ ...form, pair: e.target.value.toUpperCase() })} />
                  <Select value={form.trade_type} onValueChange={(v: any) => setForm({ ...form, trade_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="BUY">BUY</SelectItem><SelectItem value="SELL">SELL</SelectItem></SelectContent>
                  </Select>
                </div>
                <Input type="number" step="0.0001" placeholder={t("entry")} value={form.entry_price} onChange={(e) => setForm({ ...form, entry_price: e.target.value })} />
                <Input type="number" step="0.0001" placeholder={t("exit")} value={form.exit_price} onChange={(e) => setForm({ ...form, exit_price: e.target.value })} />
                <Input type="number" step="0.01" placeholder={t("lot_size")} value={form.lot_size} onChange={(e) => setForm({ ...form, lot_size: e.target.value })} />
                <Select value={form.result} onValueChange={(v: any) => setForm({ ...form, result: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t("open")}</SelectItem>
                    <SelectItem value="win">{t("win")}</SelectItem>
                    <SelectItem value="loss">{t("loss")}</SelectItem>
                    <SelectItem value="breakeven">{t("breakeven")}</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" step="0.01" placeholder="P/L (USD)" value={form.pnl} onChange={(e) => setForm({ ...form, pnl: e.target.value })} />
                <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <Button onClick={submit} className="w-full" disabled={create.isPending}>{t("add_trade")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t("total_trades")}</p>
            <p className="text-xl font-bold">{s.total}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t("win_rate")}</p>
            <p className="text-xl font-bold text-emerald-500">{s.winRate.toFixed(0)}%</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t("total_pnl")}</p>
            <p className={`text-xl font-bold ${s.totalPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              ${s.totalPnl.toFixed(2)}
            </p>
          </Card>
        </div>

        <div className="space-y-2">
          {list.data?.map((e) => (
            <Card key={e.id} className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{e.pair}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${e.trade_type === "BUY" ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"}`}>
                      {e.trade_type}
                    </span>
                    {e.result && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        e.result === "win" ? "bg-emerald-500/20 text-emerald-600" :
                        e.result === "loss" ? "bg-rose-500/20 text-rose-600" :
                        e.result === "breakeven" ? "bg-amber-500/20 text-amber-600" :
                        "bg-blue-500/20 text-blue-600"
                      }`}>{t(e.result)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("entry")}: {e.entry_price} {e.exit_price && `→ ${t("exit")}: ${e.exit_price}`} • {e.lot_size} lot
                  </p>
                  {e.pnl != null && (
                    <p className={`text-sm font-semibold mt-1 ${Number(e.pnl) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      ${Number(e.pnl).toFixed(2)}
                    </p>
                  )}
                  {e.notes && <p className="text-xs text-muted-foreground mt-1 italic">{e.notes}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(e.id)}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            </Card>
          ))}
          {list.data?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No trades logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeJournal;
