import { useEffect, useRef } from "react";

// ============================================================
// Publisher ID is already set up site-wide in index.html:
//   <meta name="google-adsense-account" content="ca-pub-1895906484640218">
//   <script async src="...adsbygoogle.js?client=ca-pub-1895906484640218">
//
// This component renders ONE ad unit for a given slot ID. You
// don't have any ad units created yet, so nothing will actually
// show until you:
//   1. Go to AdSense -> Ads -> By ad unit -> create a "Display ad"
//      (responsive) for each placement you want (e.g. one for the
//      signals feed, one for the Results page).
//   2. Copy the numeric slot ID AdSense gives you (looks like
//      "1234567890") into src/config/ads.ts.
//
// Until a slot ID is filled in, this component renders nothing —
// it will NOT show a broken/empty ad box.
// ============================================================

interface AdSlotProps {
  slot: string;
  className?: string;
  format?: string;
}

const AdSlot = ({ slot, className = "", format = "auto" }: AdSlotProps) => {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!slot) return;
    if (pushedRef.current) return;
    try {
      // @ts-ignore -- adsbygoogle is injected globally by the script in index.html
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch (e) {
      console.error("AdSense push failed:", e);
    }
  }, [slot]);

  // No slot configured yet for this placement -> render nothing,
  // never a broken/empty ad box.
  if (!slot) return null;

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle block ${className}`}
      style={{ display: "block" }}
      data-ad-client="ca-pub-1895906484640218"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
};

export default AdSlot;
