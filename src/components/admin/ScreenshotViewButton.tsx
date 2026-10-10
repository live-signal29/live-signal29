import { useState } from "react";
import { Image as ImageIcon, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { SCREENSHOT_BUCKET } from "@/lib/applicationScreenshot";
import { toast } from "sonner";

// Screenshots are never shown inline. The signed URL is only created when the
// admin clicks, and it expires after 2 minutes.
export const ScreenshotViewButton = ({ path, title = "Screenshot" }: { path: string; title?: string }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from(SCREENSHOT_BUCKET).createSignedUrl(path, 120);
      if (error || !data?.signedUrl) throw error ?? new Error("No URL");
      setUrl(data.signedUrl);
      setOpen(true);
    } catch (err) {
      console.error("screenshot url failed:", err);
      toast.error("Could not load screenshot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleClick} disabled={loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
        View Screenshot
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setUrl(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </DialogHeader>
          {url && (
            <div className="space-y-3">
              <img src={url} alt={title} className="w-full rounded-lg border border-border/50" />
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Open full size
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScreenshotViewButton;
