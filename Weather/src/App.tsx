import { useState, useEffect, useCallback, useRef } from "react";
import type { WeatherData, GeoLocation, Unit } from "./types";
import {
  searchLocation,
  fetchWeather,
  detectLocationByIp,
  WeatherError,
} from "./services/weatherApi";
import { getWeatherInfo } from "./weatherCodes";
import { WeatherIcon } from "./components/WeatherIcon";

const cToF = (c: number) => (c * 9) / 5 + 32;

const windDirLabel = (deg: number) => {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
};

const formatHour = (isoTime: string, offset: number) => {
  const dt = new Date(isoTime);
  const local = new Date(dt.getTime() + offset * 1000);
  return local.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
  });
};

const formatDay = (isoDate: string, offset: number) => {
  const dt = new Date(isoDate + "T12:00:00");
  const local = new Date(dt.getTime() + offset * 1000);
  const today = new Date();
  const localToday = new Date(today.getTime() + offset * 1000);
  if (local.toDateString() === localToday.toDateString()) return "Today";
  return local.toLocaleDateString("en-US", { weekday: "short" });
};

const uvLabel = (uv: number) => {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
};

export default function App() {
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState<Unit>("celsius");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayTemp = (c: number) => {
    const val = unit === "celsius" ? c : cToF(c);
    return Math.round(val);
  };

  const tempUnit = unit === "celsius" ? "°C" : "°F";

  const loadWeather = useCallback(async (location: GeoLocation) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(location);
      setWeather(data);
    } catch (err) {
      const msg =
        err instanceof WeatherError
          ? err.message
          : "Something went wrong. Please check your connection and try again.";
      setError(msg);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const autoDetect = useCallback(async () => {
    setAutoDetecting(true);
    setError(null);
    try {
      const loc = await detectLocationByIp();
      await loadWeather(loc);
    } catch (err) {
      setError(
        err instanceof WeatherError
          ? err.message
          : "Could not detect your location. Please enter a city manually."
      );
    } finally {
      setAutoDetecting(false);
    }
  }, [loadWeather]);

  // Auto-detect on first load
  useEffect(() => {
    autoDetect();
  }, [autoDetect]);

  // Debounced city search
  useEffect(() => {
    if (!query.trim() || !showSuggestions) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const results = await searchLocation(query);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, showSuggestions]);

  const selectSuggestion = (loc: GeoLocation) => {
    setQuery(`${loc.name}${loc.admin1 ? ", " + loc.admin1 : ""}`);
    setShowSuggestions(false);
    setSuggestions([]);
    loadWeather(loc);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError("Please enter a city name or ZIP code.");
      return;
    }
    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
      return;
    }
    // Fallback: search then load
    setLoading(true);
    setError(null);
    searchLocation(query)
      .then((results) => {
        if (results.length === 0) {
          throw new WeatherError(
            `No location found for "${query.trim()}". Check the spelling and try again.`
          );
        }
        return loadWeather(results[0]);
      })
      .catch((err) => {
        setError(
          err instanceof WeatherError
            ? err.message
            : "Could not find that location. Please try again."
        );
        setWeather(null);
        setLoading(false);
      });
  };

  const toggleUnit = () =>
    setUnit((u) => (u === "celsius" ? "fahrenheit" : "celsius"));

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => setShowSuggestions(false), 150);
  };
  const handleFocus = () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setShowSuggestions(true);
  };

  const now = weather ? new Date() : null;
  const currentHourIdx = weather
    ? (() => {
        const localNow = new Date(
          (now!.getTime() / 1000 + weather.utcOffsetSeconds) * 1000
        );
        const hourStr = localNow.toISOString().slice(0, 13);
        const idx = weather.hourly.time.findIndex((t) => t.slice(0, 13) >= hourStr);
        return idx >= 0 ? idx : 0;
      })()
    : 0;

  const next6Hours = weather
    ? Array.from({ length: 6 }, (_, i) => currentHourIdx + i)
    : [];

  const next5Days = weather
    ? weather.daily.time.slice(0, 5)
    : [];

  const currentInfo = weather
    ? getWeatherInfo(weather.current.weatherCode, weather.current.isDay)
    : null;

  const formatLocationName = (loc: GeoLocation) => {
    const parts = [loc.name];
    if (loc.admin1 && loc.admin1 !== loc.name) parts.push(loc.admin1);
    if (loc.country) parts.push(loc.country);
    return parts.join(", ");
  };

  return (
    <div className="app">
      <div className="bg-gradient" />
      <div className="container">
        <header className="header">
          <div className="brand">
            <WeatherIcon icon="partly-cloudy-day" size={36} />
            <h1>Skyline</h1>
          </div>
          <button
            className="unit-toggle"
            onClick={toggleUnit}
            aria-label="Toggle temperature unit"
            title="Switch between Celsius and Fahrenheit"
          >
            <span className={unit === "celsius" ? "active" : ""}>°C</span>
            <span className="divider">/</span>
            <span className={unit === "fahrenheit" ? "active" : ""}>°F</span>
          </button>
        </header>

        <form className="search-form" onSubmit={handleSubmit} autoComplete="off">
          <div className="search-row">
            <div className="input-wrap">
              <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                  setError(null);
                }}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder="Search city or ZIP code..."
                aria-label="City or ZIP code"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="suggestions">
                  {suggestions.map((s, i) => (
                    <li
                      key={`${s.latitude},${s.longitude},${i}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSuggestion(s);
                      }}
                    >
                      <span className="sug-name">{s.name}</span>
                      <span className="sug-region">
                        {[s.admin1, s.country].filter(Boolean).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Loading..." : "Get Weather"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={autoDetect}
              disabled={autoDetecting}
              title="Detect my location"
            >
              {autoDetecting ? "Locating..." : "My Location"}
            </button>
          </div>
        </form>

        {error && (
          <div className="error-banner" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading && !weather && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Fetching weather data...</p>
          </div>
        )}

        {weather && currentInfo && (
          <div className="weather-content">
            <section className="current-card">
              <div className="current-main">
                <div className="location-info">
                  <h2>{formatLocationName(weather.location)}</h2>
                  <p className="local-time">
                    {now &&
                      new Date(
                        now.getTime() + weather.utcOffsetSeconds * 1000
                      ).toLocaleString("en-US", {
                        weekday: "long",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                  </p>
                </div>
                <div className="current-temp-block">
                  <WeatherIcon
                    icon={currentInfo.icon}
                    size={96}
                    className="hero-icon"
                  />
                  <div className="temp-display">
                    <span className="temp-value">
                      {displayTemp(weather.current.temperature)}
                    </span>
                    <span className="temp-unit">{tempUnit}</span>
                  </div>
                  <p className="condition-label">{currentInfo.label}</p>
                  <p className="feels-like">
                    Feels like {displayTemp(weather.current.apparentTemperature)}
                    {tempUnit}
                  </p>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric">
                  <span className="metric-label">Humidity</span>
                  <span className="metric-value">{weather.current.humidity}%</span>
                  <div className="metric-bar">
                    <div
                      className="metric-fill humidity"
                      style={{ width: `${weather.current.humidity}%` }}
                    />
                  </div>
                </div>
                <div className="metric">
                  <span className="metric-label">Wind</span>
                  <span className="metric-value">
                    {Math.round(weather.current.windSpeed)} km/h
                  </span>
                  <span className="metric-sub">
                    {windDirLabel(weather.current.windDirection)}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Pressure</span>
                  <span className="metric-value">
                    {Math.round(weather.current.pressure)}
                  </span>
                  <span className="metric-sub">hPa</span>
                </div>
                <div className="metric">
                  <span className="metric-label">UV Index</span>
                  <span className="metric-value">
                    {Math.round(weather.current.uvIndex)}
                  </span>
                  <span className="metric-sub">{uvLabel(weather.current.uvIndex)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Visibility</span>
                  <span className="metric-value">
                    {Math.round(weather.current.visibility / 1000)}
                  </span>
                  <span className="metric-sub">km</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Cloud Cover</span>
                  <span className="metric-value">{weather.current.cloudCover}%</span>
                  <div className="metric-bar">
                    <div
                      className="metric-fill cloud"
                      style={{ width: `${weather.current.cloudCover}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="hourly-panel">
              <div className="panel-header">
                <h3>Next 6 Hours</h3>
              </div>
              <div className="hourly-scroll">
                {next6Hours.map((idx, i) => {
                  const info = getWeatherInfo(
                    weather.hourly.weatherCode[idx],
                    weather.hourly.isDay[idx] === 1
                  );
                  const pop = weather.hourly.precipitationProbability[idx];
                  return (
                    <div className="hour-card" key={i}>
                      <span className="hour-time">
                        {i === 0 ? "Now" : formatHour(weather.hourly.time[idx], weather.utcOffsetSeconds)}
                      </span>
                      <WeatherIcon icon={info.icon} size={44} />
                      <span className="hour-temp">
                        {displayTemp(weather.hourly.temperature[idx])}
                        {tempUnit}
                      </span>
                      <span className="hour-pop">
                        {pop > 0 ? `${pop}%` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="daily-panel">
              <div className="panel-header">
                <h3>5-Day Forecast</h3>
              </div>
              <div className="daily-list">
                {next5Days.map((day, i) => {
                  const info = getWeatherInfo(weather.daily.weatherCode[i], true);
                  const maxT = displayTemp(weather.daily.tempMax[i]);
                  const minT = displayTemp(weather.daily.tempMin[i]);
                  const range = weather.daily.tempMax[i] - weather.daily.tempMin[i];
                  const pop = weather.daily.precipitationProbability[i];
                  return (
                    <div className="day-row" key={day}>
                      <span className="day-name">
                        {formatDay(day, weather.utcOffsetSeconds)}
                      </span>
                      <div className="day-icon">
                        <WeatherIcon icon={info.icon} size={36} />
                      </div>
                      <span className="day-condition">{info.label}</span>
                      <span className="day-pop">{pop > 0 ? `${pop}%` : "—"}</span>
                      <div className="day-temps">
                        <span className="day-low">{minT}°</span>
                        <div className="day-bar">
                          <div
                            className="day-bar-fill"
                            style={{
                              left: `${((weather.daily.tempMin[i] - (weather.daily.tempMin[i] - 2)) / Math.max(range, 1)) * 100}%`,
                              width: `${(range / Math.max(range + 4, 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="day-high">{maxT}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        <footer className="footer">
          <p>
            Weather data by{" "}
            <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">
              Open-Meteo
            </a>{" "}
            · Location by{" "}
            <a href="https://ipinfo.io" target="_blank" rel="noopener noreferrer">
              ipinfo.io
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
