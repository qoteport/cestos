'use client';

import React, { memo } from 'react';

interface AppLogoProps {
  src?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

const AppLogo = memo(function AppLogo({
  src = '/assets/images/app_logo.png',
  size = 42,
  className = '',
  onClick,
}: AppLogoProps) {
  return (
    <div
      className={`flex items-center justify-center shrink-0 bg-transparent ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <img
        src={src}
        alt="Cestos Logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain shrink-0 block"
        loading="eager"
        decoding="sync"
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.dataset.fallback) {
            target.dataset.fallback = 'true';
            target.src = '/assets/cestos-logo-with-company-name-no-bg.jpg';
          }
        }}
      />
    </div>
  );
});

export default AppLogo;
