'use client';

import React, { useEffect } from 'react';

interface AdBannerProps {
  slot?: string;
  format?: 'horizontal' | 'rectangle';
  className?: string;
}

export function AdBanner({ slot = '', format = 'horizontal', className = '' }: AdBannerProps) {
  useEffect(() => {
    if (!slot) return;
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense henuz yuklenmediyse sessizce gec
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <div
      className={`w-full overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center justify-center ${
        format === 'horizontal' ? 'min-h-[90px]' : 'min-h-[250px]'
      } ${className}`}
    >
      <span className="text-[9px] uppercase tracking-widest text-slate-600 pt-1">Advertisement</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client="ca-pub-7870310846929838"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}