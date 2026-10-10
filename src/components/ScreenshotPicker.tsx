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
    <div className="space-y-1.5">
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
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-2">
          <img src={preview} alt="Selected screenshot" className="h-14 w-14 rounded-md object-cover border border-border/40" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{file.name}</p>
            <p className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
