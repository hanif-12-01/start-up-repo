import React from 'react';
// Synthetic logo placeholder; no external asset requests.
export default function Image({ alt, width, height, className }: { alt: string; width: number; height: number; className?: string }) {
  return <svg role="img" aria-label={alt} width={width} height={height} className={className}><rect width={width} height={height} fill="currentColor" /></svg>;
}
