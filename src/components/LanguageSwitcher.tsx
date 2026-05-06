import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder={t("language")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="ur">اردو</SelectItem>
          <SelectItem value="hi">हिन्दी</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
