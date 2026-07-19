import { Flame } from "lucide-react";
import { useLoginStreak } from "@/hooks/useLoginStreak";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";

export const StreakBadge = () => {
  const streak = useLoginStreak();
  const { t } = useTranslation();
  if (!streak) return null;

  const daysToReward = 7 - (streak.current_streak % 7);
  return (
    <Card className="p-2.5 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
      <div className="flex items-center gap-2.5">
        <div className="relative flex-shrink-0">
          <Flame className="h-7 w-7 text-orange-500 animate-pulse" />
          <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {streak.current_streak}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">
            {streak.current_streak} {streak.current_streak === 1 ? t("day") : t("days")} {t("streak")}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {daysToReward === 7 ? t("streak_msg") : `${daysToReward} ${t("days")} → 🎁 +1 day bonus`}
          </p>
        </div>
      </div>
    </Card>
  );
};

