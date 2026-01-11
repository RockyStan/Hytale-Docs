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

// Ad slot IDs from AdSense
const AD_SLOTS = {
  sidebar: "8249458786",
  article: "4899233101",
  footer: "4443759924",
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

// Discrete article ad - appears after content (in-article format)
export function ArticleAd() {
  if (!AD_SLOTS.article) return null;

  return (
    <div className="my-10 py-6 border-y border-border/50">
      <p className="text-[10px] text-muted-foreground/50 mb-3 uppercase tracking-wider text-center">
        Sponsored
      </p>
      <InArticleAd />
    </div>
  );
}

// Special in-article ad format
function InArticleAd() {
  const adRef = React.useRef<HTMLModElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (typeof window !== "undefined" && window.adsbygoogle && adRef.current) {
          window.adsbygoogle.push({});
        }
      } catch (err) {
        console.error("AdSense error:", err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: "block", textAlign: "center" }}
      data-ad-layout="in-article"
      data-ad-format="fluid"
      data-ad-client={PUBLISHER_ID}
      data-ad-slot={AD_SLOTS.article}
    />
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
