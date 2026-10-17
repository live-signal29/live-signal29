import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-brain`;
const SESSION_KEY = "ls_support_session";
const MSGS_KEY = "ls_support_msgs";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "Salam! 👋 Main Live Support hoon. Signals, premium ya license key ke baare mein poochiye.",
};

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `web:${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `web:${Math.random().toString(36).slice(2, 14)}x`;
  }
}

async function callSupport(payload: Record<string, unknown>) {
  const res = await fetch(SUPPORT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Support error");
  return data;
}

const SupportChatWidget = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [contact, setContact] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState("");
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MSGS_KEY) || "[]");
      return Array.isArray(saved) && saved.length ? saved.slice(-30) : [GREETING];
    } catch {
      return [GREETING];
    }
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(MSGS_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* ignore */
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, handoff]);

  // Hidden on admin pages
  if (location.pathname.toLowerCase().startsWith("/admin")) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;
      const data = await callSupport({
        channel: "web",
        session_id: getSessionId(),
        message: text,
        name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
        user_id: user?.id || null,
      });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.handoff) setHandoff(true);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Abhi support available nahi hai. Thori der baad try karein ya Telegram par contact karein." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendContact = async () => {
    const c = contact.trim();
    if (contactSending) return;
    if (!/^(https?:\/\/t\.me\/)?@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(c)) {
      setContactError("Sahi Telegram @username likhein (kam az kam 5 haroof).");
      return;
    }
    setContactError("");
    setContactSending(true);
    try {
      const res = await callSupport({ channel: "web", session_id: getSessionId(), action: "contact", contact: c });
      if (res?.contact) setContact(res.contact);
      setContactSent(true);
    } catch {
      setContactError("Send nahi hua. Dobara try karein.");
    } finally {
      setContactSending(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Live Support"
          className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-24 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:left-auto sm:right-4 sm:w-96">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <div className="text-sm font-semibold">Live Support</div>
              <div className="text-xs opacity-80">Auto-reply • human help available</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            {handoff && !contactSent && (
              <div className="rounded-xl border bg-muted/50 p-3 text-xs">
                <p className="mb-2">Team aapko Telegram par reply karegi. Apna Telegram @username likhein:</p>
                <div className="flex gap-2">
                  <input
                    value={contact}
                    onChange={(e) => {
                      setContact(e.target.value);
                      setContactError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && sendContact()}
                    placeholder="@telegram_username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    maxLength={60}
                    className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                  />
                  <button
                    onClick={sendContact}
                    disabled={contactSending || !contact.trim()}
                    className="flex min-w-[64px] items-center justify-center rounded-md bg-primary px-3 text-primary-foreground disabled:opacity-60"
                  >
                    {contactSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                  </button>
                </div>
                {contactError && <p className="mt-2 text-destructive">{contactError}</p>}
              </div>
            )}
            {handoff && contactSent && (
              <p className="text-center text-xs text-muted-foreground">✅ {contact} mil gaya. Team jald Telegram par reply karegi.</p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 border-t p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Apna sawal likhein..."
              maxLength={600}
              className="min-w-0 flex-1 rounded-full border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatWidget;
