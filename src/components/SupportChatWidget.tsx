import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Minus, X, Send, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-brain`;
const SESSION_KEY = "ls_support_session";
const MSGS_KEY = "ls_support_msgs";
const RATE_URL = "https://play.google.com/store/apps/details?id=co.median.android.krkqyaz";

const HIDDEN_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/onboarding", "/admin"];

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

function clearStoredChat() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(MSGS_KEY);
  } catch {
    /* ignore */
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
  const [offer, setOffer] = useState(false);
  const [contact, setContact] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [ended, setEnded] = useState(false);
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
    if (!ended) {
      try {
        localStorage.setItem(MSGS_KEY, JSON.stringify(messages.slice(-30)));
      } catch {
        /* ignore */
      }
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, handoff, ended]);

  // Hidden on login / signup / onboarding and admin pages
  const path = location.pathname.toLowerCase();
  if (HIDDEN_PATHS.some((p) => path === p || path.startsWith(p + "/"))) return null;

  const hasConversation = messages.some((m) => m.role === "user");

  // Fresh chat: new session id + greeting
  const resetChat = () => {
    clearStoredChat();
    setMessages([GREETING]);
    setInput("");
    setHandoff(false);
    setOffer(false);
    setContact("");
    setContactSent(false);
    setContactError("");
    setConfirmClose(false);
    setEnded(false);
  };

  // X button: ask first (only if the visitor actually chatted)
  const requestClose = () => {
    if (!hasConversation) {
      setOpen(false);
      return;
    }
    setConfirmClose(true);
  };

  const endChat = () => {
    const sessionId = getSessionId();
    // tell the backend (fire and forget), then forget this chat locally
    callSupport({ channel: "web", session_id: sessionId, action: "close" }).catch(() => {});
    clearStoredChat();
    setConfirmClose(false);
    setEnded(true);
  };

  const finishAndClose = () => {
    resetChat();
    setOpen(false);
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setOffer(false);
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
      if (data.offer) setOffer(true);
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
        <div className="fixed inset-x-3 bottom-24 z-50 flex max-h-[70vh] min-h-[320px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:left-auto sm:right-4 sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <div className="text-sm font-semibold">Live Support</div>
              <div className="text-xs opacity-80">Auto-reply • human help available</div>
            </div>
            <div className="flex items-center gap-3">
              {!ended && (
                <button onClick={() => setOpen(false)} aria-label="Minimize">
                  <Minus className="h-5 w-5" />
                </button>
              )}
              <button onClick={ended ? finishAndClose : requestClose} aria-label="Close chat">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Rating screen after the chat is closed */}
          {ended ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="text-3xl">✅</div>
              <div className="text-base font-semibold">Chat band ho gayi</div>
              <p className="text-sm text-muted-foreground">
                Hamari madad ka shukriya! Agar aapko support pasand aayi to app ko rate zaroor karein.
              </p>
              <div className="flex gap-1 text-yellow-500">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <a
                href={RATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                ⭐ App ko rate karein
              </a>
              <button
                onClick={() => {
                  resetChat();
                }}
                className="w-full rounded-full border px-4 py-2 text-sm"
              >
                Naya chat shuru karein
              </button>
              <button onClick={finishAndClose} className="text-xs text-muted-foreground underline">
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex-1 space-y-2 overflow-y-auto p-3">
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

                {offer && !loading && !handoff && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => send("Haan, team se connect karein")}
                      className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    >
                      ✅ Haan, connect karein
                    </button>
                    <button onClick={() => setOffer(false)} className="rounded-full border px-3 py-1.5 text-xs">
                      Nahi, shukriya
                    </button>
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
                  <p className="text-center text-xs text-muted-foreground">
                    ✅ {contact} mil gaya. Team jald Telegram par reply karegi.
                  </p>
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
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  aria-label="Send"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* Close confirmation */}
          {confirmClose && !ended && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 p-6">
              <div className="w-full max-w-xs rounded-2xl border bg-background p-5 text-center shadow-xl">
                <div className="mb-1 text-base font-semibold">Chat band karein?</div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Band karne par ye chat khatam ho jayegi aur dobara kholne par naya chat shuru hoga.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmClose(false)} className="flex-1 rounded-full border px-4 py-2 text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={endChat}
                    className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Yes, close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SupportChatWidget;
