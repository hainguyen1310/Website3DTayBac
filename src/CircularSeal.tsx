export default function CircularSeal({
  text = "TINH HOA TÂY BẮC • THIÊN NHIÊN THUẦN KHIẾT •",
  size = 120,
  className = "",
  variant = "hero",
}: {
  text?: string;
  size?: number;
  className?: string;
  variant?: "hero" | "gift" | "story";
}) {
  const pathId = `seal-path-${variant}`;

  if (variant === "story") {
    return (
      <div className={`moc-circular-seal moc-seal-story ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 160 160" width={size} height={size}>
          <circle cx="80" cy="80" r="76" fill="#f4eee3" stroke="#dfd6c5" strokeWidth="1.2" />
          <circle cx="80" cy="80" r="70" fill="none" stroke="#5f5647" strokeWidth="1.3" strokeDasharray="5 3.5" />
          <defs>
            <path id="seal-story-top" d="M 26,80 A 54,54 0 0,1 134,80" fill="none" />
            <path id="seal-story-bot" d="M 134,84 A 54,54 0 0,1 26,84" fill="none" />
          </defs>
          <text fill="#2a3c30" fontSize="12.5" fontWeight="600" letterSpacing="4.5">
            <textPath href="#seal-story-top" startOffset="50%" textAnchor="middle">
              TÂY BẮC
            </textPath>
          </text>
          <text fill="#2a3c30" fontSize="12.5" fontWeight="600" letterSpacing="4.5">
            <textPath href="#seal-story-bot" startOffset="50%" textAnchor="middle">
              LÀ NHÀ
            </textPath>
          </text>
          <g transform="translate(68, 64) scale(1.1)" stroke="#2a3c30" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22V12" />
            <path d="M12 12C9 7 3 9 3 13C3 17 9 17 12 14" />
            <path d="M12 11C15 6 21 8 21 12C21 16 15 16 12 13" />
            <path d="M12 12C12 7 9 3 12 2C15 3 12 7 12 12" />
          </g>
        </svg>
      </div>
    );
  }

  if (variant === "gift") {
    return (
      <div className={`moc-circular-seal moc-seal-gift ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 160 160" width={size} height={size}>
          <defs>
            <path
              id={pathId}
              d="M 80, 80 m -58, 0 a 58,58 0 1,1 116,0 a 58,58 0 1,1 -116,0"
            />
          </defs>
          <circle cx="80" cy="80" r="76" fill="#f8f4ed" stroke="#224430" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.8" />
          <circle cx="80" cy="80" r="69" fill="none" stroke="#224430" strokeWidth="1.6" />
          <circle cx="80" cy="80" r="46" fill="none" stroke="#224430" strokeWidth="1" strokeDasharray="2 3" opacity="0.65" />
          <text fill="#224430" fontSize="10.2" fontWeight="600" letterSpacing="2.6">
            <textPath href={`#${pathId}`} startOffset="0%">
              {text}
            </textPath>
          </text>
          <g transform="translate(67, 65) scale(1.15)" stroke="#224430" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M12 21V12" />
            <path d="M12 12C8 8 3 10 3 14C3 18 9 18 12 14" />
            <path d="M12 11C16 7 21 9 21 13C21 17 15 17 12 13" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div className={`moc-circular-seal moc-seal-hero ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 160" width={size} height={size}>
        <defs>
          <path
            id={pathId}
            d="M 80, 80 m -58, 0 a 58,58 0 1,1 116,0 a 58,58 0 1,1 -116,0"
          />
        </defs>
        <circle cx="80" cy="80" r="76" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />
        <circle cx="80" cy="80" r="69" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="80" cy="80" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" opacity="0.75" />
        <text fill="currentColor" fontSize="10.2" fontWeight="600" letterSpacing="2.8">
          <textPath href={`#${pathId}`} startOffset="0%">
            {text}
          </textPath>
        </text>
        <g transform="translate(67, 65) scale(1.1)" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M12 21v-7m0-3a5 5 0 0 1 5-5c0 3.5-2.2 7-5 9m0-9a5 5 0 0 0-5 5c0 3.5 2.2 7 5 9" />
        </g>
      </svg>
    </div>
  );
}

