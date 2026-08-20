export type Unit = "celsius" | "fahrenheit";

export interface GeoLocation {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  isDay: boolean;
  pressure: number;
  uvIndex: number;
  visibility: number;
  precipitation: number;
  cloudCover: number;
}

export interface HourlyForecast {
  time: string[];
  temperature: number[];
  weatherCode: number[];
  precipitationProbability: number[];
  isDay: number[];
  windSpeed: number[];
}

export interface DailyForecast {
  time: string[];
  weatherCode: number[];
  tempMax: number[];
  tempMin: number[];
  sunrise: string[];
  sunset: string[];
  precipitationProbability: number[];
  windSpeedMax: number[];
  uvIndexMax: number[];
}

export interface WeatherData {
  location: GeoLocation;
  current: CurrentWeather;
  hourly: HourlyForecast;
  daily: DailyForecast;
  timezone: string;
  utcOffsetSeconds: number;
}
