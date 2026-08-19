import React from 'react';

interface BitLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

export const BitLogo: React.FC<BitLogoProps> = ({
  className = "w-full h-full",
  size,
  showText = false
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`} style={style}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        aria-label="Birla Institute of Technology Logo"
      >
        <defs>
          {/* Radial & Linear Gradients */}
          <linearGradient id="bitRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="50%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>

          <linearGradient id="bitGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          <filter id="bitGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer Crimson Background Circle */}
        <circle cx="100" cy="100" r="96" fill="url(#bitRedGrad)" stroke="#f59e0b" strokeWidth="4" />

        {/* Outer Cogwheel / Gear Teeth Ring (Symbol of Engineering) */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          return (
            <rect
              key={`gear-${i}`}
              x="96.5"
              y="2"
              width="7"
              height="8"
              rx="1.5"
              fill="#fbbf24"
              transform={`rotate(${angle} 100 100)`}
            />
          );
        })}

        {/* Outer Gold Accent Ring */}
        <circle cx="100" cy="100" r="88" fill="none" stroke="#fef08a" strokeWidth="1.5" strokeDasharray="3 2" />

        {/* Transparent Inscription Ring (Removed White) */}
        <circle cx="100" cy="100" r="76" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2 1" />

        {/* Curvature Text Paths */}
        <path id="textPathTop" d="M 32 100 A 68 68 0 0 1 168 100" fill="none" />
        <path id="textPathBottom" d="M 168 100 A 68 68 0 0 1 32 100" fill="none" />

        {/* Inscribed Institution Name (Changed to White for visibility) */}
        <text fill="#ffffff" fontSize="11" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif" fontWeight="900" letterSpacing="1.2">
          <textPath href="#textPathTop" startOffset="50%" textAnchor="middle">
            BIRLA INSTITUTE OF TECHNOLOGY
          </textPath>
        </text>

        <text fill="#ffffff" fontSize="9" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif" fontWeight="800" letterSpacing="1">
          <textPath href="#textPathBottom" startOffset="50%" textAnchor="middle">
            MESRA • RANCHI • 1955
          </textPath>
        </text>

        {/* Inner Red Core Circle */}
        <circle cx="100" cy="100" r="54" fill="url(#bitRedGrad)" stroke="#f59e0b" strokeWidth="2.5" filter="url(#bitGlow)" />
        <circle cx="100" cy="100" r="50" fill="none" stroke="#fef08a" strokeWidth="1" opacity="0.6" />

        {/* Center Emblem: Lamp of Knowledge (Diya), Open Book & Flame */}
        <g transform="translate(0, -2)">
          {/* Radiant Sunburst Behind Flame */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`ray-${i}`}
              x1="100"
              y1="64"
              x2="100"
              y2="56"
              stroke="#fef08a"
              strokeWidth="1.5"
              strokeLinecap="round"
              transform={`rotate(${i * 45} 100 64)`}
              opacity="0.8"
            />
          ))}

          {/* Golden Eternal Flame (Jyoti) */}
          <path
            d="M100 52 C96 60, 94 67, 97 73 C99 77, 100 79, 100 81 C100 79, 101 77, 103 73 C106 67, 104 60, 100 52 Z"
            fill="url(#flameGrad)"
            filter="url(#bitGlow)"
          />
          <path
            d="M100 58 C98 64, 97 68, 99 72 C100 74, 100 75, 100 76 C100 75, 100 74, 101 72 C103 68, 102 64, 100 58 Z"
            fill="#ffffff"
            opacity="0.8"
          />

          {/* Traditional Knowledge Lamp (Diya) Base */}
          <path
            d="M86 82 Q100 88 114 82 C114 89, 86 89, 86 82 Z"
            fill="url(#bitGoldGrad)"
            stroke="#b45309"
            strokeWidth="1"
          />
          <ellipse cx="100" cy="82" rx="14" ry="2.5" fill="#fef08a" />

          {/* Open Book of Wisdom & Science */}
          <path
            d="M78 94 Q100 90 100 97 Q100 90 122 94 L122 108 Q100 104 100 111 Q100 104 78 108 Z"
            fill="#ffffff"
            stroke="#991b1b"
            strokeWidth="1.5"
          />
          {/* Book Spine / Pages Details */}
          <path d="M100 97 L100 111" stroke="#991b1b" strokeWidth="1.5" />
          <path d="M83 99 Q96 96 97 101" stroke="#cbd5e1" strokeWidth="1" fill="none" />
          <path d="M83 103 Q96 100 97 105" stroke="#cbd5e1" strokeWidth="1" fill="none" />
          <path d="M117 99 Q104 96 103 101" stroke="#cbd5e1" strokeWidth="1" fill="none" />
          <path d="M117 103 Q104 100 103 105" stroke="#cbd5e1" strokeWidth="1" fill="none" />

          {/* Sanskrit Banner / Foundation Base */}
          <path
            d="M74 116 Q100 112 126 116 L123 124 Q100 120 77 124 Z"
            fill="url(#bitGoldGrad)"
            stroke="#92400e"
            strokeWidth="1"
          />
          <text
            x="100"
            y="122.5"
            textAnchor="middle"
            fontSize="6"
            fontFamily="serif"
            fontWeight="bold"
            fill="#7f1d1d"
            letterSpacing="0.5"
          >
            सा विद्या या विमुक्तये
          </text>
        </g>
      </svg>
    </div>
  );
};
