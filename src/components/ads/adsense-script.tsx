"use client";

import Script from "next/script";

export default function AdSenseScript() {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_ADSENSE === "true";
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;

  if (!enabled || !clientId) {
    return null;
  }

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
