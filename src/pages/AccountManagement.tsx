import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MT5CopierBanner } from "@/components/MT5CopierBanner";
import { SpecialOfferBanner } from "@/components/SpecialOfferBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  TrendingUp, 
  Shield, 
  ShieldCheck,
  Clock, 
  MessageCircle, 
  FileText, 
  Wallet,
  BarChart3,
  CheckCircle2,
  Send,
  Link2,
  Settings2,
  DollarSign,
  Zap,
  Crown,
  Star,
  Loader2,
  Wifi,
  User,
  Building2,
  Server,
  Key,
  Lock,
  Mail,
  Globe,
  StickyNote,
  ChevronDown,
  Globe2,
  KeyRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { z } from "zod";

const contactDetailsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  whatsapp: z.string().regex(/^\+\d{1,4}\d{6,14}$/, "Enter a valid WhatsApp number with your own country code (e.g., +447911..., +1415..., +9198..., +92300...)"),
  telegram_username: z.string()
    .transform((v) => v.replace(/^@/, "").trim())
    .refine((v) => v.length >= 5 && v.length <= 32, "Telegram username must be 5-32 characters")
    .refine((v) => /^[a-zA-Z0-9_]+$/.test(v), "Telegram username can only contain letters, numbers and underscores"),
});

// Tab 1 — connect an existing MT4/MT5 trading account directly.
const tradingAccountSchema = contactDetailsSchema.extend({
  preferred_broker: z.string().min(2, "Enter your preferred broker"),
  platform_type: z.string().min(1, "Select platform type"),
  broker_server: z.string().min(2, "Enter broker server"),
  trading_login: z.string().regex(/^\d+$/, "Login must contain only numbers"),
  trading_password: z.string().min(4, "Password must be at least 4 characters"),
  account_size: z.string().min(1, "Select an account size"),
});

// Tab 2 — hand over the broker site/app login instead of MT4/MT5 credentials.
const brokerLoginSchema = contactDetailsSchema.extend({
  broker_site_name: z.string().min(2, "Enter broker site or app name"),
  broker_email: z.string().email("Enter a valid broker email"),
  broker_password: z.string().min(4, "Password must be at least 4 characters"),
  note: z.string().max(500, "Note is too long").optional(),
});

type SubmissionMethod = "trading_account" | "broker_login";
type ServiceMode = "management" | "recovery";



const steps = [
  { icon: Link2, title: "Connect Account", desc: "Link securely via MT4/MT5" },
  { icon: Settings2, title: "Expert Management", desc: "AI + Manual trade execution" },
  { icon: DollarSign, title: "Get Profits", desc: "Regular profit distribution" }
];

const AccountManagement = () => {
  const [serviceMode, setServiceMode] = useState<ServiceMode>("management");
  const [requirementsOpen, setRequirementsOpen] = useState(true);
  const [submissionMethod, setSubmissionMethod] = useState<SubmissionMethod>("trading_account");
  const [formData, setFormData] = useState({
    name: "", whatsapp: "", telegram_username: "", preferred_broker: "",
    platform_type: "", broker_server: "", trading_login: "",
    trading_password: "", account_size: "",
    broker_site_name: "", broker_email: "", broker_password: "", note: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set right after a successful submit. The application is saved at this
  // point, but not yet confirmed — confirmation only happens once the
  // applicant actually starts the Telegram bot (that's what gives us a
  // chat_id to message them on automatically, e.g. for profit-share
  // payment requests later).
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTelegramTimers = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // While the "confirm on Telegram" screen is showing, poll for the
  // applicant having linked (i.e. tapped Start in the bot).
  useEffect(() => {
    if (!telegramLink || !applicationId || verified) return;

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("account-management-status", {
          body: { id: applicationId },
        });
        if (data?.success && data?.linked) {
          setVerified(true);
        }
      } catch {
        // silent — just try again on the next tick
      }
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [telegramLink, applicationId, verified]);

  useEffect(() => {
    if (!verified) return;
    toast.success("Telegram linked!", {
      description: "Your application is confirmed. Our team will reach out shortly.",
    });
    closeTimeoutRef.current = setTimeout(() => {
      setTelegramLink(null);
      setApplicationId(null);
      setVerified(false);
    }, 3000);

    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified]);

  useEffect(() => () => clearTelegramTimers(), []);

  const handleScroll = () => {
    if (sliderRef.current) {
      const scrollLeft = sliderRef.current.scrollLeft;
      const cardWidth = sliderRef.current.offsetWidth * 0.75;
      const index = Math.round(scrollLeft / cardWidth);
      setActiveSlide(Math.min(index, plans.length - 1));
    }
  };

  const { data: performanceData } = useQuery({
    queryKey: ['account-performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_performance')
        .select('*')
        .eq('is_published', true)
        .order('date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      const schema = submissionMethod === "trading_account" ? tradingAccountSchema : brokerLoginSchema;
      const validated = schema.parse(formData);
      setIsSubmitting(true);

      // Submitted through a SECURITY DEFINER RPC instead of a direct table
      // insert — direct anon inserts into this table were being rejected
      // by RLS even with a fully permissive INSERT policy, so this routes
      // around that instead of depending on it.
      const v = validated as Record<string, string | undefined>;
      const serviceLabel = serviceMode === "recovery" ? "Loss Recovery" : "Account Management";
      const submittedNote = [
        `Service requested: ${serviceLabel}`,
        v.note?.trim(),
      ].filter(Boolean).join(" — ");
      const { data: newId, error } = await supabase.rpc(
        'submit_account_management_application',
        {
          p_submission_type: submissionMethod,
          p_name: v.name!,
          p_whatsapp: v.whatsapp!,
          p_telegram_username: v.telegram_username,
          p_preferred_broker: v.preferred_broker,
          p_platform_type: v.platform_type,
          p_broker_server: v.broker_server,
          p_trading_login: v.trading_login,
          p_trading_password: v.trading_password,
          p_account_size: v.account_size,
          p_broker_site_name: v.broker_site_name,
          p_broker_email: v.broker_email,
          p_broker_password: v.broker_password,
          p_note: submittedNote,
        }
      );

      if (error) throw error;
      const inserted = { id: newId as unknown as string };

      let telegram_link: string | null = null;
      try {
        const { data: notifyResult } = await supabase.functions.invoke(
          'account-management-notify',
          { body: { ...validated, submission_type: submissionMethod, service_mode: serviceMode, service_label: serviceLabel, applicationId: inserted?.id } }
        );
        telegram_link = notifyResult?.telegram_link ?? null;
      } catch (err) {
        console.error('Notify failed:', err);
      }

      setFormData({
        name: "", whatsapp: "", telegram_username: "", preferred_broker: "",
        platform_type: "", broker_server: "", trading_login: "",
        trading_password: "", account_size: "",
        broker_site_name: "", broker_email: "", broker_password: "", note: ""
      });

      if (telegram_link && inserted?.id) {
        // Don't show the generic success toast yet — the application isn't
        // confirmed until they start the Telegram bot.
        setApplicationId(inserted.id);
        setTelegramLink(telegram_link);
      } else {
        toast.success("Application submitted successfully!", {
          description: "We'll contact you on WhatsApp shortly."
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach(e => {
          if (e.path[0]) fieldErrors[e.path[0].toString()] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        toast.error("Failed to submit application");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-emerald-500/20 pb-16">
      <Header />
      
      <main className="container mx-auto px-4 py-4 space-y-8">
        <MT5CopierBanner />
        <SpecialOfferBanner page="account" />

        {/* Service Switcher + Hero */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-1.5 shadow-sm">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setServiceMode("management")}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition-all",
                  serviceMode === "management"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Account Management
              </button>
              <button
                type="button"
                onClick={() => setServiceMode("recovery")}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition-all",
                  serviceMode === "recovery"
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                Loss Recovery
              </button>
            </div>
          </div>

          <div className="text-center space-y-2 py-1">
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase",
              serviceMode === "management"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400"
            )}>
              {serviceMode === "management" ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" />
              )}
              {serviceMode === "management" ? "MT4 / MT5 Account Management" : "MT4 / MT5 Loss Recovery Service"}
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              {serviceMode === "management" ? (
                <>Professional <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">Account Management</span></>
              ) : (
                <>Trading <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">Loss Recovery</span></>
              )}
            </h1>

            <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm max-w-xl mx-auto">
              {serviceMode === "management"
                ? "Let our team manage your existing MT4/MT5 account with defined risk controls, active monitoring and a structured trading plan."
                : "A structured, risk-controlled approach for accounts recovering from previous trading losses. Recovery is not guaranteed and depends on market conditions."
              }
            </p>

            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {["Same Broker", "Same Platform", "Same Account Details"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-3 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                >
                  ✓ {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Important Requirements */}
        <section className="space-y-3">
          <Card className="border-emerald-200/70 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/80 via-white/80 to-cyan-50/60 dark:from-emerald-950/30 dark:via-slate-900/80 dark:to-cyan-950/20 shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Important Requirements</CardTitle>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Please read before connecting your account
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Badge className="border-0 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    Required
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setRequirementsOpen((v) => !v)}
                    className="mt-2 block ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    {requirementsOpen ? "Hide details" : "Show details"}{" "}
                    <ChevronDown className={cn("inline h-3.5 w-3.5 transition-transform", requirementsOpen && "rotate-180")} />
                  </button>
                </div>
              </div>
            </CardHeader>

            {requirementsOpen && (
              <CardContent className="space-y-3 pt-0">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Account Balance — $100 Minimum, Unlimited Maximum</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        A minimum account balance of <strong>$100</strong> is required. There is <strong>no maximum balance limit.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Profit Share — {serviceMode === "management" ? "40%" : "50%"}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        <strong>{serviceMode === "management" ? "40%" : "50%"}</strong> of generated profits will be shared with our team. The remaining <strong>{serviceMode === "management" ? "60%" : "50%"} belongs to you.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-600 dark:text-sky-400">
                      <Send className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Automatic Profit Updates</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        Our team bot will automatically send your <strong>profit and performance details</strong> through Telegram.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                      <Globe2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Any Broker Account Accepted</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        We support <strong>Exness, XM, Deriv, Binomo, IC Markets, FBS, HFM</strong> and every other broker — any MT4/MT5 or broker-site login is accepted, as long as it&apos;s a genuine live trading account.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-red-500/10 p-2.5 text-red-600 dark:text-red-400">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Account Types Not Accepted</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        Demo, Cent, Contest, and Bonus accounts cannot be connected. Requests using these account types will be rejected.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Provide Correct MT5 Details</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        Make sure your <strong>MT5 Login, Broker Name, Broker Server, and Trading Password</strong> are entered correctly so our team can verify and connect your account.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </section>

        {/* Application Form */}
        <section id="apply-form" className="max-w-xl mx-auto pt-2 scroll-mt-20">
          <Card className="border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-slate-900/5 dark:shadow-black/20 overflow-hidden">
            <CardHeader className="text-center pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-b from-emerald-500/[0.04] to-transparent">
              <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-lg font-bold">
                {serviceMode === "management" ? "Connect Your Trading Account" : "Start Your Recovery Account"}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {serviceMode === "management"
                  ? "Use your existing broker, platform and account details to get started."
                  : "Use your existing broker, platform and account details for the recovery service."}
              </p>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* ---------------- Contact Details ---------------- */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <User className="h-3.5 w-3.5" />
                    Contact Details
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Full Name <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <User className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus-visible:ring-emerald-500/40"
                        />
                      </div>
                      {errors.name && <p className="text-[10px] text-destructive">{errors.name}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">WhatsApp Number <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <MessageCircle className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="e.g., +447911123456"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus-visible:ring-emerald-500/40"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                        Use your own country code — e.g. +44 (UK), +1 (US/Canada), +91 (India),
                        +92 (Pakistan). Don't just enter +92 if that isn't your country.
                      </p>
                      {errors.whatsapp && <p className="text-[10px] text-destructive">{errors.whatsapp}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Telegram Username <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Send className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="e.g., @aliraza"
                          value={formData.telegram_username}
                          onChange={(e) => setFormData({ ...formData, telegram_username: e.target.value })}
                          className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus-visible:ring-emerald-500/40"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                        Required to confirm your application via our Telegram bot after you submit.
                      </p>
                      {errors.telegram_username && <p className="text-[10px] text-destructive">{errors.telegram_username}</p>}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800/60" />

                {/* ---------------- Any broker accepted ---------------- */}
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Any Broker Account Accepted
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Exness, XM, Deriv, Binomo, IC Markets, FBS, HFM
                      </span>{" "}
                      and every other broker — any MT4/MT5 or broker-site login is accepted, as long as it's a genuine live trading account.
                    </p>
                  </div>
                </div>

                {/* ---------------- Connection Method Tabs ---------------- */}
                <Tabs
                  value={submissionMethod}
                  onValueChange={(v) => { setSubmissionMethod(v as SubmissionMethod); setErrors({}); }}
                  className="space-y-4"
                >
                  <TabsList className="grid w-full grid-cols-2 h-11 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                    <TabsTrigger
                      value="trading_account"
                      className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm"
                    >
                      <Key className="h-3.5 w-3.5" />
                      Trading Account
                    </TabsTrigger>
                    <TabsTrigger
                      value="broker_login"
                      className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Broker Login
                    </TabsTrigger>
                  </TabsList>

                  {/* ---- Tab 1: MT4/MT5 trading account (server + investor login) ---- */}
                  <TabsContent value="trading_account" className="space-y-5 mt-0">
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <Building2 className="h-3.5 w-3.5" />
                        Broker &amp; Trading Account
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Preferred Broker <span className="text-red-500">*</span></Label>
                          <div className="relative">
                            <Building2 className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              placeholder="Exness / XM / IC Markets"
                              value={formData.preferred_broker}
                              onChange={(e) => setFormData({ ...formData, preferred_broker: e.target.value })}
                              className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus-visible:ring-emerald-500/40"
                            />
                          </div>
                          {errors.preferred_broker && <p className="text-[10px] text-destructive">{errors.preferred_broker}</p>}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Platform Type <span className="text-red-500">*</span></Label>
                          <div className="relative">
                            <Settings2 className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                            <Select value={formData.platform_type} onValueChange={(v) => setFormData({ ...formData, platform_type: v })}>
                              <SelectTrigger className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus:ring-emerald-500/40">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MT4">MT4</SelectItem>
                                <SelectItem value="MT5">MT5</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {errors.platform_type && <p className="text-[10px] text-destructive">{errors.platform_type}</p>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Broker Server Name <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Server className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            placeholder="e.g., Exness-Real11"
                            value={formData.broker_server}
                            onChange={(e) => setFormData({ ...formData, broker_server: e.target.value })}
                            className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus-visible:ring-emerald-500/40"
                          />
                        </div>
                        {errors.broker_server && <p className="text-[10px] text-destructive">{errors.broker_server}</p>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Trading Login (ID) <span className="text-red-500">*</span></Label>
                          <div className="relative">
                            <Key className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              placeholder="e.g., 37383838"
                              value={formData.trading_login}
                              onChange={(e) => setFormData({ ...formData, trading_login: e.target.value.replace(/\D/g, '') })}
                              className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus-visible:ring-emerald-500/40"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <span>✓ Enter ONLY numbers (e.g., 37383838)</span>
                          </p>
                          {errors.trading_login && <p className="text-[10px] text-destructive">{errors.trading_login}</p>}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Trading Password <span className="text-red-500">*</span></Label>
                          <div className="relative">
                            <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              type="password"
                              placeholder="Investor/Master Password"
                              value={formData.trading_password}
                              onChange={(e) => setFormData({ ...formData, trading_password: e.target.value })}
                              className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus-visible:ring-emerald-500/40"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            <span>Used only to connect your account — kept private and secure</span>
                          </p>
                          {errors.trading_password && <p className="text-[10px] text-destructive">{errors.trading_password}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800/60" />

                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <Wallet className="h-3.5 w-3.5" />
                        Account Tier
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Account Size <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <DollarSign className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                          <Select value={formData.account_size} onValueChange={(v) => setFormData({ ...formData, account_size: v })}>
                            <SelectTrigger className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus:ring-emerald-500/40">
                              <SelectValue placeholder="Select Account Size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="$100">$100 (Starter)</SelectItem>
                              <SelectItem value="$1,000">$1,000 (Growth)</SelectItem>
                              <SelectItem value="$10,000">$10,000 (Pro)</SelectItem>
                              <SelectItem value="$50,000">$50,000 (Institutional)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {errors.account_size && <p className="text-[10px] text-destructive">{errors.account_size}</p>}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ---- Tab 2: hand over the broker site/app login instead ---- */}
                  <TabsContent value="broker_login" className="space-y-3 mt-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <Globe className="h-3.5 w-3.5" />
                      Broker Details
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Broker Site or App Name <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Globe className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="e.g., Exness / XM / IC Markets app"
                          value={formData.broker_site_name}
                          onChange={(e) => setFormData({ ...formData, broker_site_name: e.target.value })}
                          className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus-visible:ring-emerald-500/40"
                        />
                      </div>
                      {errors.broker_site_name && <p className="text-[10px] text-destructive">{errors.broker_site_name}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Broker Email <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Mail className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            value={formData.broker_email}
                            onChange={(e) => setFormData({ ...formData, broker_email: e.target.value })}
                            className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus-visible:ring-emerald-500/40"
                          />
                        </div>
                        {errors.broker_email && <p className="text-[10px] text-destructive">{errors.broker_email}</p>}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Broker Password <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="password"
                            placeholder="Broker login password"
                            value={formData.broker_password}
                            onChange={(e) => setFormData({ ...formData, broker_password: e.target.value })}
                            className="h-11 pl-10 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus-visible:ring-emerald-500/40"
                          />
                        </div>
                        {errors.broker_password && <p className="text-[10px] text-destructive">{errors.broker_password}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Note <span className="text-slate-400 font-normal">(optional)</span></Label>
                      <div className="relative">
                        <StickyNote className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
                        <Textarea
                          placeholder="Anything else we should know?"
                          value={formData.note}
                          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                          className="min-h-[80px] pl-10 pt-2.5 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 focus-visible:ring-emerald-500/40"
                        />
                      </div>
                      {errors.note && <p className="text-[10px] text-destructive">{errors.note}</p>}
                    </div>
                  </TabsContent>
                </Tabs>

                {serviceMode === "recovery" && (
                  <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/70 dark:bg-orange-950/20 p-3">
                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <p className="text-[10px] leading-relaxed text-orange-800 dark:text-orange-300">
                        Loss recovery is not guaranteed. The recovery approach, risk limits and suitability will be reviewed before any trading action.
                      </p>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-sm font-bold rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white shadow-lg shadow-emerald-500/25 transition-transform active:scale-[0.99]" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-2" />
                      Submit Application Now
                    </>
                  )}
                </Button>

                <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                  <ShieldCheck className="h-3 w-3" />
                  Your details are used only for service review and account connection
                </p>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Trust Badges */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 py-2">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 shadow-sm">
            <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-semibold text-xs">Secure Capital</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">Protected Strategy</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 shadow-sm">
            <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-semibold text-xs">24/7 Monitoring</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">Active Risk Control</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 shadow-sm">
            <MessageCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-semibold text-xs">WhatsApp Alerts</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">Real-time Trade Logs</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 shadow-sm">
            <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-semibold text-xs">Full Transparency</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">Verified Statements</div>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================
          TELEGRAM CONFIRMATION — shown right after a successful
          submit. The application is saved already, but stays
          unconfirmed until the applicant starts the bot (same flow
          as the Copy Management "Connect" dialog).
      ===================================================== */}
      <Dialog
        open={!!telegramLink}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            clearTelegramTimers();
            setTelegramLink(null);
            setApplicationId(null);
            setVerified(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-6">
          {verified ? (
            <>
              <DialogHeader className="items-center text-center space-y-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <DialogTitle className="text-lg">Verified Successfully!</DialogTitle>
                <DialogDescription className="text-sm">
                  Your application is confirmed. Our team will reach out on WhatsApp shortly.
                </DialogDescription>
              </DialogHeader>
              <div className="pt-2 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="items-center text-center space-y-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
                  <Clock className="h-7 w-7" />
                </div>
                <DialogTitle className="text-lg">Application Received — Not Confirmed Yet</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  Your details have been sent to our team, but your application is still{" "}
                  <span className="font-semibold text-foreground">pending</span>. To confirm your
                  application and get notified the moment your status changes, start our Telegram
                  bot below.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-1">
                <Button
                  asChild
                  className="w-full h-11 gap-2 bg-[#26A5E4] hover:bg-[#1e8fc9] text-white font-semibold"
                >
                  <a href={telegramLink ?? "#"} target="_blank" rel="noopener noreferrer">
                    <Send className="h-4 w-4" />
                    Start Bot to Confirm Application
                  </a>
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Waiting for you to confirm in Telegram...
                </div>

                <div className="space-y-2 pt-1">
                  <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Required to confirm your application and send you status updates.
                  </p>
                  <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-600 dark:text-amber-400">
                    <Wifi className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    If Telegram doesn't open or shows an error, turn on a VPN and try again —
                    Telegram is restricted in some countries without one.
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AccountManagement;
