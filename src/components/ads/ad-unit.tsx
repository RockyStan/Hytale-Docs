"use client";

import * as React from "react";

interface AdUnitProps {
  slot?: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID || "ca-pub-4389631952462736";

// Ad slot IDs - Replace these with your actual slot IDs from AdSense
const AD_SLOTS = {
  sidebar: "", // Create in AdSense: Display ad, vertical
  article: "", // Create in AdSense: In-article ad
  footer: "",  // Create in AdSense: Display ad, horizontal
};

export function AdUnit({ slot, format = "auto", className = "" }: AdUnitProps) {
  const adRef = React.useRef<HTMLModElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    // Only load if we have a slot ID
    if (!slot) return;

    const timer = setTimeout(() => {
      try {
        if (typeof window !== "undefined" && window.adsbygoogle && adRef.current) {
          window.adsbygoogle.push({});
          setIsLoaded(true);
        }
      } catch (err) {
        console.error("AdSense error:", err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [slot]);

  // Don't render if no slot ID configured
  if (!slot) return null;

  return (
    <div className={`ad-container overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: isLoaded ? "auto" : "0" }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// Discrete sidebar ad - appears at bottom of sidebar
export function SidebarAd() {
  if (!AD_SLOTS.sidebar) return null;

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <p className="text-[10px] text-muted-foreground/60 mb-2 uppercase tracking-wider">
        Sponsored
      </p>
      <AdUnit slot={AD_SLOTS.sidebar} format="vertical" />
    </div>
  );
}

// Discrete article ad - appears after content
export function ArticleAd() {
  if (!AD_SLOTS.article) return null;

  return (
    <div className="my-10 py-6 border-y border-border/50">
      <p className="text-[10px] text-muted-foreground/50 mb-3 uppercase tracking-wider text-center">
        Sponsored
      </p>
      <AdUnit slot={AD_SLOTS.article} format="horizontal" />
    </div>
  );
}

// Discrete footer ad
export function FooterAd() {
  if (!AD_SLOTS.footer) return null;

  return (
    <div className="py-4">
      <p className="text-[10px] text-muted-foreground/50 mb-2 uppercase tracking-wider text-center">
        Sponsored
      </p>
      <AdUnit slot={AD_SLOTS.footer} format="horizontal" />
    </div>
  );
}
