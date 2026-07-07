"use client";

import React, { useEffect, useRef } from "react";
import {
  getAdSlotByPlacement,
  getAdsenseClient,
  isAdsenseEnabled,
  AdPlacement,
} from "@/lib/ads";

interface AdSenseAdProps {
  placement: AdPlacement;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSenseAd({ placement, className }: AdSenseAdProps) {
  const slot = getAdSlotByPlacement(placement);
  const client = getAdsenseClient();
  const enabled = isAdsenseEnabled();
  const isDev = process.env.NODE_ENV !== "production";
  const initialized = useRef(false);

  useEffect(() => {
    if (!enabled || !slot || !client || initialized.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      initialized.current = true;
    } catch (err) {
      console.error("AdSense push error for " + placement, err);
    }
  }, [enabled, slot, client, placement]);

  const isIncomplete = !enabled || !slot || !client;

  if (isIncomplete) {
    if (isDev) {
      return (
        <section aria-label="Iklan" className={`my-6 p-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center shadow-xs ${className}`}>
          <p className="mb-1 text-[9px] uppercase font-extrabold tracking-wider text-slate-400">Iklan</p>
          <p className="text-xs text-slate-500 font-mono font-semibold">Placeholder AdSense: {placement}</p>
        </section>
      );
    }
    return null;
  }

  return (
    <section aria-label="Iklan" className={`my-6 ${className}`}>
      <p className="mb-2 text-[9px] uppercase font-extrabold tracking-wider text-slate-400">Iklan</p>
      <div className="overflow-hidden min-h-[90px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-xs">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </section>
  );
}

