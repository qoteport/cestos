'use client';

import { useEffect } from 'react';

/** Gives refresh controls a short visual response even when the data is unchanged. */
export default function RefreshButtonFeedback() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      if (!button) return;
      const icon = button.querySelector<SVGElement>('svg.lucide-refresh-cw');
      if (!icon || icon.classList.contains('animate-spin')) return;

      icon.getAnimations().forEach((animation) => animation.cancel());
      icon.animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
        { duration: 650, easing: 'ease-in-out' },
      );
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
