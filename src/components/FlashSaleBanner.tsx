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
    supabase
      .from("special_offers")
      .select("*")
      .eq("is_active", true)
      .gt("end_date", new Date().toISOString())
      .order("end_date", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSale(data));
  }, []);

  useEffect(() => {
    if (!sale) return;
    const t = setInterval(() => {
      const diff = new Date(sale.end_date).getTime() - Date.now();
      if (diff <= 0) {
        setSale(null);
        return;
      }
      const h = Math.floor(diff / 3.6e6),
        m = Math.floor((diff % 3.6e6) / 6e4),
        s = Math.floor((diff % 6e4) / 1000);
      setRemain(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(t);
  }, [sale]);

  if (!sale || dismissed) return null;

  return (
    <div
      className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 flex items-center gap-2 text-xs sm:text-sm cursor-pointer shadow-sm rounded-md my-1"
      onClick={() => nav("/premium")}
    >
      <Zap className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate">
        <b>{sale.title}</b> {sale.description ? `— ${sale.description}` : ""} • Ends in {remain}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        className="p-0.5 hover:bg-white/20 rounded-full transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
