import { ReactNode } from "react";
import { Radio, FolderOpen, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignalSectionProps {
  type: "live" | "open" | "closed";
  title: string;
  count?: number;
  children: ReactNode;
  className?: string;
}

const sectionConfig = {
  live: {
    icon: Radio,
    headerBg: "bg-yellow-500/10 border-yellow-500/30",
    headerText: "text-yellow-600 dark:text-yellow-400",
    iconColor: "text-yellow-500",
    badge: "bg-yellow-500 text-yellow-950",
  },
  open: {
    icon: FolderOpen,
    headerBg: "bg-blue-500/10 border-blue-500/30",
    headerText: "text-blue-600 dark:text-blue-400",
    iconColor: "text-blue-500",
    badge: "bg-blue-500 text-white",
  },
  closed: {
    icon: CheckCircle2,
    headerBg: "bg-emerald-500/10 border-emerald-500/30",
    headerText: "text-emerald-600 dark:text-emerald-400",
    iconColor: "text-emerald-500",
    badge: "bg-emerald-500 text-white",
  },
};

const SignalSection = ({ type, title, count, children, className }: SignalSectionProps) => {
  const config = sectionConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Section Header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3 rounded-lg border",
        config.headerBg
      )}>
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", config.iconColor)} />
          <h2 className={cn("font-bold text-sm sm:text-base uppercase tracking-wide", config.headerText)}>
            {title}
          </h2>
        </div>
        {count !== undefined && (
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", config.badge)}>
            {count}
          </span>
        )}
      </div>

      {/* Section Content */}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};

export default SignalSection;
