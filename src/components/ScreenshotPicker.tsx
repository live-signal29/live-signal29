import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MAX_PICK_BYTES } from "@/lib/applicationScreenshot";

interface ScreenshotPickerProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

// Long phone screenshot names (e.g. Screenshot_2026-10-09-19-22-40-62_0bea77...jpg)
// must never widen the form, so shorten them and keep the extension visible.
const shortName = (name: string, max = 28): string => {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 && name.length - dot <= 6 ? name.slice(dot) : "";
  return `${name.slice(0, max - ext.length - 1)}…${ext}`;
};

// Optional screenshot field shown on the copier / recovery / account-management forms.
export const ScreenshotPicker = ({ file, onChange, disabled }: ScreenshotPickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = ""; // allow re-picking the same file
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (picked.size > MAX_PICK_BYTES) {
      toast.error("Image is too large", { description: "Please choose an image under 20 MB." });
      return;
    }
    onChange(picked);
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-1.5">
      <Label className="text-xs font-medium">
        Screenshot <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePick}
        disabled={disabled}
      />

      {file && preview ? (
        <div className="flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-lg border border-border/60 bg-muted/30 p-2">
          <img src={preview} alt="Selected screenshot" className="h-14 w-14 shrink-0 rounded-md object-cover border border-border/40" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="block max-w-full truncate text-xs font-medium">{shortName(file.name)}</p>
            <p className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Remove screenshot"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
        >
          <ImagePlus className="h-4 w-4" />
          Add screenshot of your account / login details
        </button>
      )}

      <p className="text-[10px] leading-snug text-muted-foreground">
        Optional — only our team can see it.
      </p>
    </div>
  );
};

export default ScreenshotPicker;
