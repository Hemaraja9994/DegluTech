import React, { useId } from 'react';

interface DegluTechLogoProps {
  size?: number;
  title?: string;
}

export const DegluTechLogo: React.FC<DegluTechLogoProps> = ({
  size = 44,
  title = 'DegluTech clinical logo',
}) => {
  const titleId = useId();
  const descId = useId();
  const shellId = useId();
  const pulseId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      focusable="false"
    >
      <title id={titleId}>{title}</title>
      <desc id={descId}>A head and neck rehab mark with a swallowing pathway and speech wave cues.</desc>
      <defs>
        <linearGradient id={shellId} x1="8" y1="6" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f8ea8" />
          <stop offset="1" stopColor="#114e6b" />
        </linearGradient>
        <linearGradient id={pulseId} x1="17" y1="18" x2="51" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d8f3f7" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#${shellId})`} />
      <path
        d="M34 15c6.5 0 11.5 4.9 11.5 11.1 0 4.1-2 7.2-5 9.4-2.2 1.6-3.4 3.8-3.4 6.4v2.8c0 3.7-3 6.7-6.7 6.7h-5.1"
        fill="none"
        stroke={`url(#${pulseId})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M29.5 19.5c-4.7.7-8.2 4.7-8.2 9.4 0 3.6 2.1 6.8 5.2 8.3 2.5 1.2 4.3 3.3 5.1 5.9"
        fill="none"
        stroke="#ffffff"
        strokeOpacity=".9"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M18 31.2c4.5 1.1 8.3 1.1 11.7-.2"
        fill="none"
        stroke="#93e4ed"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M44 20c2.5 1.6 4.1 3.8 4.8 6.4M49 16c3.7 2.4 6.1 5.8 7 10"
        fill="none"
        stroke="#b9eef4"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="34.5" cy="27" r="2.7" fill="#ffffff" />
      <path d="M23 48h14" fill="none" stroke="#93e4ed" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};
