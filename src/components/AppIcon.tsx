// 앱 아이콘(문진표 네거티브 체크) — exe/파비콘과 동일한 도안을 화면에서 재사용.
import { useId } from 'react';

export default function AppIcon({ size = 64 }: { size?: number }) {
  const clipId = 'appicon-' + useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="SmartQnR">
      <defs>
        <clipPath id={clipId}>
          <rect x="46" y="34" width="68" height="92" rx="14" />
        </clipPath>
      </defs>
      <circle cx="80" cy="80" r="79" fill="#22a06b" stroke="#1b8457" strokeOpacity="0.35" strokeWidth="1.5" />
      <rect x="46" y="34" width="68" height="92" rx="14" fill="#ffffff" />
      <g clipPath={`url(#${clipId})`}>
        <rect x="58" y="50" width="26" height="7" rx="3.5" fill="#bfe3cf" />
        <path
          d="M40 96 L66 120 L128 52"
          fill="none"
          stroke="#22a06b"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
