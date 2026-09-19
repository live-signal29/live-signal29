import { useEffect, useMemo, useState } from "react";
// ⚠️ Adjust this import to match your project's Supabase client path.
// If your app was built with Lovable, this is usually the correct path already.
import { supabase } from "@/integrations/supabase/client";

interface PairRow {
  pair: string;
  category: string | null;
  is_approved: boolean;
}

export default function TelegramPairApprovals() {
  const [rows, setRows] = useState<PairRow[]>([]);
  const [dirty, setDirty] = useState<Record<string, boolean>>({}); // pair -> new is_approved
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPair, setNewPair] = useState("");
  const [newCategory, setNewCategory] = useState("FOREX");
  const [message, setMessage] = useState<string | null>(null);

  async function loadRows() {
    setLoading(true);
    const { data, error } = await supabase
      .from("telegram_pair_approvals")
      .select("pair, category, is_approved")
      .order("category", { ascending: true })
      .order("pair", { ascending: true });
    if (!error && data) setRows(data as PairRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadRows();
  }, []);

  const grouped = useMemo(() => {
    const filtered = rows.filter((r) =>
      r.pair.toLowerCase().includes(search.toLowerCase())
    );
    const map: Record<string, PairRow[]> = {};
    for (const r of filtered) {
      const cat = r.category || "UNCATEGORIZED";
      if (!map[cat]) map[cat] = [];
      map[cat].push(r);
    }
    return map;
  }, [rows, search]);

  function toggle(pair: string, current: boolean) {
    const next = dirty[pair] !== undefined ? !dirty[pair] : !current;
    setDirty((d) => ({ ...d, [pair]: next }));
  }

  function isChecked(row: PairRow) {
    return dirty[row.pair] !== undefined ? dirty[row.pair] : row.is_approved;
  }

  function setAllInCategory(category: string, value: boolean) {
    const updates: Record<string, boolean> = {};
    (grouped[category] || []).forEach((r) => (updates[r.pair] = value));
    setDirty((d) => ({ ...d, ...updates }));
  }

  async function saveChanges() {
    const pairsToUpdate = Object.keys(dirty);
    if (pairsToUpdate.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      // One update per changed pair (small volume, simple & safe).
      for (const pair of pairsToUpdate) {
        const { error } = await supabase
          .from("telegram_pair_approvals")
          .update({ is_approved: dirty[pair] })
          .eq("pair", pair);
        if (error) throw error;
      }
      setMessage(`Saved ✓ ${pairsToUpdate.length} pair(s) updated.`);
      setDirty({});
      await loadRows();
    } catch (err: any) {
      setMessage(`Error: ${err.message || "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  async function addNewPair() {
    const pair = newPair.trim();
    if (!pair) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from("telegram_pair_approvals")
      .upsert({ pair, category: newCategory, is_approved: true }, { onConflict: "pair" });
    setSaving(false);
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setNewPair("");
      setMessage(`Added & approved "${pair}" ✓`);
      await loadRows();
    }
  }

  const hasChanges = Object.keys(dirty).length > 0;

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading pairs…</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Telegram Signal Approvals</h2>
        <p className="text-sm text-gray-500">
          Sirf yahan tick kiye gaye pairs ke signals Telegram channel par post honge.
          Naya pair signals table mein aaye to yahan by default "not approved" list mein add ho jata hai.
        </p>
      </div>

      {/* Add / register a new pair manually */}
      <div className="flex gap-2 items-center border rounded-lg p-3 bg-gray-50">
        <input
          className="border rounded px-2 py-1 text-sm flex-1"
          placeholder="e.g. XAUUSD"
          value={newPair}
          onChange={(e) => setNewPair(e.target.value)}
        />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        >
          <option value="FOREX">FOREX</option>
          <option value="CRYPTO">CRYPTO</option>
          <option value="COMMODITIES">COMMODITIES</option>
          <option value="DERIV">DERIV</option>
        </select>
        <button
          onClick={addNewPair}
          disabled={saving || !newPair.trim()}
          className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded disabled:opacity-50"
        >
          Add & Approve
        </button>
      </div>

      {/* Search filter */}
      <input
        className="border rounded px-3 py-2 text-sm w-full"
        placeholder="Search pair…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Grouped checklist */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, pairs]) => (
          <div key={category} className="border rounded-lg">
            <div className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-t-lg">
              <span className="font-medium text-sm">{category}</span>
              <div className="flex gap-2">
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => setAllInCategory(category, true)}
                >
                  Select all
                </button>
                <button
                  className="text-xs text-gray-500 hover:underline"
                  onClick={() => setAllInCategory(category, false)}
                >
                  Clear all
                </button>
              </div>
            </div>
            <div className="divide-y">
              {pairs.map((row) => (
                <label
                  key={row.pair}
                  className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                >
                  <span>{row.pair}</span>
                  <input
                    type="checkbox"
                    checked={isChecked(row)}
                    onChange={() => toggle(row.pair, row.is_approved)}
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <p className="text-sm text-gray-500">Koi pair nahi mila.</p>
        )}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-white border-t pt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {hasChanges ? `${Object.keys(dirty).length} unsaved change(s)` : "No changes"}
        </span>
        <button
          onClick={saveChanges}
          disabled={!hasChanges || saving}
          className="bg-green-600 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {message && (
        <p className={`text-sm ${message.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
