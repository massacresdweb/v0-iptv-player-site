export default function Logo({
  className = "",
  size = "default",
}: { className?: string; size?: "small" | "default" | "large" }) {
  const sizes = {
    small: "text-2xl",
    default: "text-4xl",
    large: "text-6xl",
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative logo-glow">
        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse-glow" />
        <svg
          className={`${sizes[size]} relative z-10`}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(263, 90%, 75%)" />
              <stop offset="50%" stopColor="hsl(270, 85%, 68%)" />
              <stop offset="100%" stopColor="hsl(280, 90%, 65%)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* TV Screen */}
          <rect x="15" y="20" width="70" height="50" rx="8" fill="url(#logo-gradient)" filter="url(#glow)" />
          <rect x="20" y="25" width="60" height="40" rx="4" fill="hsl(263, 90%, 15%)" />
          {/* Play Icon */}
          <path d="M 40 35 L 40 55 L 58 45 Z" fill="url(#logo-gradient)" filter="url(#glow)" />
          {/* Antenna */}
          <line x1="30" y1="20" x2="20" y2="5" stroke="url(#logo-gradient)" strokeWidth="3" strokeLinecap="round" />
          <line x1="70" y1="20" x2="80" y2="5" stroke="url(#logo-gradient)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="5" r="3" fill="url(#logo-gradient)" />
          <circle cx="80" cy="5" r="3" fill="url(#logo-gradient)" />
          {/* Stand */}
          <rect x="45" y="70" width="10" height="15" fill="url(#logo-gradient)" />
          <rect x="35" y="85" width="30" height="5" rx="2" fill="url(#logo-gradient)" />
        </svg>
      </div>
      <span className={`neon-text ${sizes[size]} font-bold tracking-tight`}>MassTV</span>
    </div>
  )
}
