"use client";

import React, { useEffect, useState } from "react";
import { getAdForPlacementAction, trackAdImpressionAction } from "@/app/actions/ads";
import { SponsoredOfferCard } from "./sponsored-card";

interface AdSlotProps {
  placement: string;
  businessType?: string;
}

export function AdSlot({ placement, businessType }: AdSlotProps) {
  const [ad, setAd] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await getAdForPlacementAction(placement, businessType);
        if (res.success && res.ad) {
          setAd(res.ad);
          // Track impression immediately on display
          await trackAdImpressionAction(res.ad.id);
        }
      } catch (err) {
        console.error("Failed to load ad for placement " + placement, err);
      } finally {
        setLoaded(true);
      }
    };

    fetchAd();
  }, [placement, businessType]);

  if (!loaded || !ad) return null;

  return (
    <div className="w-full mt-6">
      <SponsoredOfferCard
        id={ad.id}
        title={ad.title}
        description={ad.description}
        imageUrl={ad.imageUrl}
        targetUrl={ad.targetUrl}
      />
    </div>
  );
}
