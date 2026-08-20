import type {
  GeoLocation,
  WeatherData,
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
} from "../types";

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const REVERSE_GEO_URL = "https://geocoding-api.open-meteo.com/v1/reverse";

export class WeatherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherError";
  }
}

export async function searchLocation(query: string): Promise<GeoLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `${GEO_URL}?name=${encodeURIComponent(
    trimmed
  )}&count=5&language=en&format=json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new WeatherError("Failed to search location. Please try again.");
  }
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    return [];
  }
  return data.results.map((r: any) => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country ?? "",
    admin1: r.admin1,
  }));
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeoLocation> {
  const url = `${REVERSE_GEO_URL}?latitude=${latitude}&longitude=${longitude}&language=en&format=json`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        return {
          name: r.name,
          latitude,
          longitude,
          country: r.country ?? "",
          admin1: r.admin1,
        };
      }
    }
  } catch {
    // fall through to generic
  }
  return {
    name: "My Location",
    latitude,
    longitude,
    country: "",
  };
}

export async function fetchWeather(location: GeoLocation): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,visibility,uv_index",
    hourly:
      "temperature_2m,weather_code,precipitation_probability,is_day,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,wind_speed_10m_max,uv_index_max",
    timezone: "auto",
    forecast_days: "7",
    wind_speed_unit: "kmh",
  });

  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) {
    if (res.status === 400 || res.status === 404) {
      throw new WeatherError("Weather data not found for this location.");
    }
    throw new WeatherError("Failed to fetch weather data. Please try again.");
  }
  const data = await res.json();
  if (!data.current) {
    throw new WeatherError("No weather data available for this location.");
  }

  const current: CurrentWeather = {
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    weatherCode: data.current.weather_code,
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    isDay: data.current.is_day === 1,
    pressure: data.current.pressure_msl,
    uvIndex: data.current.uv_index,
    visibility: data.current.visibility,
    precipitation: data.current.precipitation,
    cloudCover: data.current.cloud_cover,
  };

  const hourly: HourlyForecast = {
    time: data.hourly.time,
    temperature: data.hourly.temperature_2m,
    weatherCode: data.hourly.weather_code,
    precipitationProbability: data.hourly.precipitation_probability,
    isDay: data.hourly.is_day,
    windSpeed: data.hourly.wind_speed_10m,
  };

  const daily: DailyForecast = {
    time: data.daily.time,
    weatherCode: data.daily.weather_code,
    tempMax: data.daily.temperature_2m_max,
    tempMin: data.daily.temperature_2m_min,
    sunrise: data.daily.sunrise,
    sunset: data.daily.sunset,
    precipitationProbability: data.daily.precipitation_probability_max,
    windSpeedMax: data.daily.wind_speed_10m_max,
    uvIndexMax: data.daily.uv_index_max,
  };

  return {
    location,
    current,
    hourly,
    daily,
    timezone: data.timezone,
    utcOffsetSeconds: data.utc_offset_seconds,
  };
}

export async function detectLocationByIp(): Promise<GeoLocation> {
  const res = await fetch("https://ipinfo.io/json?token=");
  if (!res.ok) {
    throw new WeatherError("Could not detect your location automatically.");
  }
  const data = await res.json();
  if (!data.loc || !data.city) {
    throw new WeatherError("Could not detect your location automatically.");
  }
  const [lat, lon] = data.loc.split(",").map((v: string) => parseFloat(v));
  return {
    name: data.city,
    latitude: lat,
    longitude: lon,
    country: data.country ?? "",
    admin1: data.region,
  };
}
