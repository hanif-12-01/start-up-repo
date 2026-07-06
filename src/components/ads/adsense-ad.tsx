"use client";

import React, { useEffect, useRef } from "react";
import { getAdSlotByPlacement, AdPlacement } from "@/lib/ads";

interface AdSenseAdProps {
  placement: AdPlacement;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function AdSenseAd({ placement, className }: AdSenseAdProps) {
  const slot = getAdSlotByPlacement(placement);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
  const isDev = process.env.NODE_ENV !== "production";
  const initialized = useRef(false);

  useEffect(() => {
    if (!slot || !clientId || initialized.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      initialized.current = true;
    } catch (err) {
      console.error("AdSense push error for " + placement, err);
    }
  }, [slot, clientId, placement]);

  if (!slot || !clientId) {
    if (isDev) {
      return (
        <div className={`my-4 p-4 border border-dashed border-slate-300 rounded-lg text-center bg-slate-50 text-xs text-slate-500 font-mono ${className}`}>
          [AdSense placeholder: {placement}]
        </div>
      );
    }
    return null;
  }

  return (
    <section aria-label="Iklan" className={`mt-6 ${className}`}>
      <p className="mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">Iklan</p>
      <div className="overflow-hidden min-h-[90px] flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl p-2.5">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={clientId}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </section>
  );
}
