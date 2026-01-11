"use client";

import * as React from "react";

interface AdUnitProps {
  slot: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdUnit({ slot, format = "auto", className = "" }: AdUnitProps) {
  const adRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, []);

  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_ID || "ca-pub-4389631952462736";

  return (
    <div ref={adRef} className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// Sidebar ad component
export function SidebarAd() {
  return (
    <div className="hidden lg:block sticky top-20">
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Sponsored</p>
        <AdUnit slot="SIDEBAR_SLOT_ID" format="vertical" />
      </div>
    </div>
  );
}

// In-content ad component
export function ContentAd() {
  return (
    <div className="my-8 rounded-lg border border-border bg-card/50 p-4">
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Sponsored</p>
      <AdUnit slot="CONTENT_SLOT_ID" format="horizontal" />
    </div>
  );
}
