import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Zap, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function FlashSaleBanner() {
  const [sale, setSale] = useState<any>(null);
  const [remain, setRemain] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    supabase.from("flash_sales").select("*").eq("active", true).gt("ends_at", new Date().toISOString()).order("ends_at").limit(1).maybeSingle().then(({ data }) => setSale(data));
  }, []);

  useEffect(() => {
    if (!sale) return;
    const t = setInterval(() => {
      const diff = new Date(sale.ends_at).getTime() - Date.now();
      if (diff <= 0) { setSale(null); return; }
      const h = Math.floor(diff / 3.6e6), m = Math.floor((diff % 3.6e6) / 6e4), s = Math.floor((diff % 6e4) / 1000);
      setRemain(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(t);
  }, [sale]);

  if (!sale || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2 flex items-center gap-2 text-sm cursor-pointer" onClick={() => nav("/premium")}>
      <Zap className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate"><b>{sale.title}</b> — {sale.discount_percent}% OFF • Ends in {remain}</span>
      <button onClick={e => { e.stopPropagation(); setDismissed(true); }}><X className="w-4 h-4" /></button>
    </div>
  );
}
