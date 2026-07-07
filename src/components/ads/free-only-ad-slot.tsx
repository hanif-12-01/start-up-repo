"use client";

import AdSenseScript from "./adsense-script";
import { AdSenseAd } from "./adsense-ad";
import { AdPlacement } from "@/lib/ads";

interface FreeOnlyAdSlotProps {
  adsEnabled: boolean;
  placement: AdPlacement;
  className?: string;
}

export function FreeOnlyAdSlot({ adsEnabled, placement, className }: FreeOnlyAdSlotProps) {
  if (!adsEnabled) return null;
  return (
    <>
      <AdSenseScript />
      <AdSenseAd placement={placement} className={className} />
    </>
  );
}

