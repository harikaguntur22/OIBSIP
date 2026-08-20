interface WeatherIconProps {
  icon: string;
  size?: number;
  className?: string;
}

export function WeatherIcon({ icon, size = 64, className = "" }: WeatherIconProps) {
  const s = size;
  const common = {
    width: s,
    height: s,
    viewBox: "0 0 64 64",
    className: `weather-icon ${className}`,
  };

  switch (icon) {
    case "clear-day":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="14" fill="#fbbf24" className="sun-core" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="32"
              y1="8"
              x2="32"
              y2="14"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${deg} 32 32)`}
              className="sun-ray"
              style={{ transformOrigin: "32px 32px", animationDelay: `${deg * 0.05}s` }}
            />
          ))}
        </svg>
      );
    case "clear-night":
      return (
        <svg {...common}>
          <path
            d="M44 38a16 16 0 1 1-18-22 12 12 0 0 0 18 22z"
            fill="#fde68a"
            opacity="0.95"
          />
          <circle cx="38" cy="22" r="1.5" fill="#fff" opacity="0.8" />
          <circle cx="46" cy="28" r="1" fill="#fff" opacity="0.7" />
        </svg>
      );
    case "partly-cloudy-day":
      return (
        <svg {...common}>
          <circle cx="22" cy="22" r="10" fill="#fbbf24" />
          <path
            d="M44 44a8 8 0 0 0-8-8 10 10 0 0 0-19 3 7 7 0 0 0 1 14h22a7 7 0 0 0 4-9z"
            fill="#e2e8f0"
            stroke="#cbd5e1"
            strokeWidth="1"
          />
        </svg>
      );
    case "partly-cloudy-night":
      return (
        <svg {...common}>
          <path
            d="M28 24a9 9 0 1 1-10-12 7 7 0 0 0 10 12z"
            fill="#fde68a"
            opacity="0.9"
          />
          <path
            d="M46 46a8 8 0 0 0-8-8 10 10 0 0 0-19 3 7 7 0 0 0 1 14h22a7 7 0 0 0 4-9z"
            fill="#cbd5e1"
            stroke="#94a3b8"
            strokeWidth="1"
          />
        </svg>
      );
    case "cloudy":
      return (
        <svg {...common}>
          <path
            d="M48 38a9 9 0 0 0-9-9 11 11 0 0 0-21 3 8 8 0 0 0 1 16h26a8 8 0 0 0 3-10z"
            fill="#cbd5e1"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "fog":
      return (
        <svg {...common}>
          <path
            d="M46 30a8 8 0 0 0-8-8 10 10 0 0 0-19 3 7 7 0 0 0 1 14h22a7 7 0 0 0 4-9z"
            fill="#cbd5e1"
          />
          {[36, 42, 48].map((y, i) => (
            <line
              key={y}
              x1="14"
              y1={y}
              x2="50"
              y2={y}
              stroke="#94a3b8"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="fog-line"
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          ))}
        </svg>
      );
    case "drizzle":
      return (
        <svg {...common}>
          <path
            d="M46 32a8 8 0 0 0-8-8 10 10 0 0 0-19 3 7 7 0 0 0 1 14h22a7 7 0 0 0 4-9z"
            fill="#cbd5e1"
          />
          {[26, 36, 46].map((x, i) => (
            <line
              key={x}
              x1={x}
              y1="44"
              x2={x - 2}
              y2="52"
              stroke="#60a5fa"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="raindrop"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </svg>
      );
    case "rain":
      return (
        <svg {...common}>
          <path
            d="M46 30a8 8 0 0 0-8-8 10 10 0 0 0-19 3 7 7 0 0 0 1 14h22a7 7 0 0 0 4-9z"
            fill="#94a3b8"
          />
          {[20, 30, 40, 50].map((x, i) => (
            <line
              key={x}
              x1={x}
              y1="42"
              x2={x - 3}
              y2="54"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              className="raindrop"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </svg>
      );
    case "sleet":
      return (
        <svg {...common}>
          <path
            d="M46 30a8 8 0 0 0-8-8 10 10 0 0 0-19 3 7 7 0 0 0 1 14h22a7 7 0 0 0 4-9z"
            fill="#94a3b8"
          />
          <line x1="22" y1="42" x2="19" y2="52" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" className="raindrop" />
          <circle cx="34" cy="48" r="2.5" fill="#e0f2fe" className="snowflake" />
          <line x1="44" y1="42" x2="41" y2="52" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" className="raindrop" style={{ animationDelay: "0.3s" }} />
        </svg>
      );
    case "snow":
      return (
        <svg {...common}>
          <path
            d="M46 30a8 8 0 0 0-8-8 10 10 0 0 0-19 3 7 7 0 0 0 1 14h22a7 7 0 0 0 4-9z"
            fill="#cbd5e1"
          />
          {[
            { x: 22, y: 46 },
            { x: 34, y: 50 },
            { x: 46, y: 46 },
          ].map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill="#fff"
              stroke="#bae6fd"
              strokeWidth="1"
              className="snowflake"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </svg>
      );
    case "thunderstorm":
      return (
        <svg {...common}>
          <path
            d="M46 28a8 8 0 0 0-8-8 10 10 0 0 0-19 3 7 7 0 0 0 1 14h22a7 7 0 0 0 4-9z"
            fill="#64748b"
          />
          <path
            d="M30 40l-4 8h4l-2 8 8-12h-4l3-4z"
            fill="#fbbf24"
            className="lightning"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="16" fill="#cbd5e1" />
        </svg>
      );
  }
}
