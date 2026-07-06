"use client";

import React from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { trackAdClickAction } from "@/app/actions/ads";

interface SponsoredOfferCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  targetUrl: string;
}

export function SponsoredOfferCard({
  id,
  title,
  description,
  imageUrl,
  targetUrl,
}: SponsoredOfferCardProps) {
  const handleClick = async () => {
    try {
      await trackAdClickAction(id);
    } catch (err) {
      console.error("Failed to track ad click", err);
    }
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={handleClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-150 bg-slate-50/50 p-5 shadow-xs transition-all duration-300 hover:border-indigo-200 hover:bg-indigo-50/10 cursor-pointer"
    >
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-indigo-700 border border-indigo-100">
        <Sparkles className="h-2.5 w-2.5 text-indigo-600" />
        Sponsor
      </div>

      <div className="flex gap-4 items-start">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="h-16 w-16 rounded-xl object-cover border border-slate-150 shrink-0 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-soft">
            <Sparkles className="h-6 w-6" />
          </div>
        )}

        <div className="space-y-1 pr-14 flex-1">
          <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
            {title}
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
