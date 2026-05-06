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
    <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Flame className="h-10 w-10 text-orange-500 animate-pulse" />
          <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {streak.current_streak}
          </span>
        </div>
        <div className="flex-1">
          <p className="font-semibold">
            {streak.current_streak} {streak.current_streak === 1 ? t("day") : t("days")} {t("streak")}
          </p>
          <p className="text-xs text-muted-foreground">
            {daysToReward === 7 ? t("streak_msg") : `${daysToReward} ${t("days")} → 🎁 +1 day bonus`}
          </p>
        </div>
      </div>
    </Card>
  );
};
