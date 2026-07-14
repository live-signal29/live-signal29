import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { toast } from "sonner";

export default function Portfolio() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({ broker: "Exness", account_number: "", nickname: "", balance: 0, equity: 0, profit_loss: 0 });

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("portfolio_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAccounts(data || []);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Sign in first");
    if (!form.account_number) return toast.error("Enter account number");
    const { error } = await supabase.from("portfolio_accounts").insert({ ...form, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("Account added");
    setForm({ broker: "Exness", account_number: "", nickname: "", balance: 0, equity: 0, profit_loss: 0 });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("portfolio_accounts").delete().eq("id", id);
    load();
  };

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const totalPL = accounts.reduce((s, a) => s + Number(a.profit_loss || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="text-primary" /> Portfolio Tracker</h1>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Total Balance</div><div className="text-xl font-bold">${totalBalance.toFixed(2)}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Total P/L</div><div className={`text-xl font-bold ${totalPL >= 0 ? "text-success-deep" : "text-destructive"}`}>{totalPL >= 0 ? "+" : ""}${totalPL.toFixed(2)}</div></Card>
        </div>

        <Card className="p-4 space-y-2">
          <h3 className="font-semibold">Add account</h3>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Broker" value={form.broker} onChange={e => setForm({ ...form, broker: e.target.value })} />
            <Input placeholder="Account #" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} />
            <Input placeholder="Nickname" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
            <Input type="number" placeholder="Balance" value={form.balance} onChange={e => setForm({ ...form, balance: +e.target.value })} />
            <Input type="number" placeholder="Equity" value={form.equity} onChange={e => setForm({ ...form, equity: +e.target.value })} />
            <Input type="number" placeholder="P/L" value={form.profit_loss} onChange={e => setForm({ ...form, profit_loss: +e.target.value })} />
          </div>
          <Button onClick={add} className="w-full"><Plus className="w-4 h-4 mr-2" />Add Account</Button>
        </Card>

        <div className="space-y-2">
          {accounts.map(a => (
            <Card key={a.id} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-semibold">{a.nickname || a.broker} <span className="text-xs text-muted-foreground">#{a.account_number}</span></div>
                <div className="text-xs text-muted-foreground">Balance: ${Number(a.balance).toFixed(2)} • Equity: ${Number(a.equity).toFixed(2)}</div>
              </div>
              <div className={`font-bold ${a.profit_loss >= 0 ? "text-success-deep" : "text-destructive"}`}>{a.profit_loss >= 0 ? "+" : ""}${Number(a.profit_loss).toFixed(2)}</div>
              <button onClick={() => remove(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
