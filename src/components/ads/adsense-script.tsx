"use client";

import Script from "next/script";
import { getAdsenseClient, isAdsenseEnabled } from "@/lib/ads";

export default function AdSenseScript() {
  const enabled = isAdsenseEnabled();
  const clientId = getAdsenseClient();

  if (!enabled || !clientId) {
    return null;
  }

  return (
    <Script
      id="google-adsense-script"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}

