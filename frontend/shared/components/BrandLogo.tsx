'use client';

import {useState, type CSSProperties} from 'react';
import Image from 'next/image';
import {DEFAULT_LOGO} from '@/lib/hooks/useBrand';

interface BrandLogoProps {
  /** Logo URL, usually `useBrand().logo` / `usePublicBrand().logo`. */
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  /** Keep the space but hide it, e.g. while settings are still loading. */
  hidden?: boolean;
}

/**
 * The business logo, falling back to the bundled DonClaudio's logo when the
 * custom image fails to load. Takes the URL as a prop so it adds no query
 * subscriptions (or requests) of its own.
 */
export function BrandLogo(props: BrandLogoProps) {
  // Remount per source so a failed custom logo doesn't stick after it changes.
  return <LogoImage key={props.src} {...props} />;
}

function LogoImage({src, alt, hidden, style, ...props}: BrandLogoProps) {
  const [failed, setFailed] = useState(false);
  const finalSrc = failed || !src ? DEFAULT_LOGO : src;

  return (
    <Image
      {...props}
      alt={alt}
      src={finalSrc}
      // Owner-supplied URLs may be on hosts not listed in next.config images.
      unoptimized={!finalSrc.startsWith('/')}
      onError={() => {
        if (finalSrc !== DEFAULT_LOGO) setFailed(true);
      }}
      style={{...style, visibility: hidden ? 'hidden' : undefined}}
    />
  );
}
