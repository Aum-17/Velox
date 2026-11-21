export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Velox logo">
      <defs>
        <linearGradient id="vx-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FC4C02" />
          <stop offset="1" stopColor="#FF9A4D" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#vx-g)" />
      <path d="M17 17 L32 47 L47 17" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 26h8M6 33h9" stroke="#fff" strokeOpacity=".7" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}
