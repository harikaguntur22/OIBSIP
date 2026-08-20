interface WeatherInfo {
  label: string;
  icon: string;
}

const DAY_ICONS: Record<number, string> = {
  0: "clear-day",
  1: "partly-cloudy-day",
  2: "partly-cloudy-day",
  3: "cloudy",
  45: "fog",
  48: "fog",
  51: "drizzle",
  53: "drizzle",
  55: "drizzle",
  56: "drizzle",
  57: "drizzle",
  61: "rain",
  63: "rain",
  65: "rain",
  66: "sleet",
  67: "sleet",
  71: "snow",
  73: "snow",
  75: "snow",
  77: "snow",
  80: "rain",
  81: "rain",
  82: "rain",
  85: "snow",
  86: "snow",
  95: "thunderstorm",
  96: "thunderstorm",
  99: "thunderstorm",
};

const NIGHT_ICONS: Record<number, string> = {
  0: "clear-night",
  1: "partly-cloudy-night",
  2: "partly-cloudy-night",
  3: "cloudy",
};

const LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export function getWeatherInfo(code: number, isDay: boolean): WeatherInfo {
  const label = LABELS[code] ?? "Unknown";
  const iconKey = isDay
    ? (DAY_ICONS[code] ?? "cloudy")
    : (NIGHT_ICONS[code] ?? "cloudy");
  return { label, icon: iconKey };
}

export function getWeatherIconOnly(code: number, isDay: boolean): string {
  return isDay
    ? (DAY_ICONS[code] ?? "cloudy")
    : (NIGHT_ICONS[code] ?? "cloudy");
}
