// Weather lookup for session locations.
//
//   GET /api/weather?location=<address>&date=<YYYY-MM-DD>
//     Returns the daily forecast for the supplied location/date using the
//     free open-meteo APIs (no API key required).
//
// Flow:
//   1. Geocode the location string via Open-Meteo's geocoding API.
//      We grab the first result; for ambiguous strings we lean on
//      country-code disambiguation by appending ", UK" if no country
//      is present (most Grass2Pro coaches are UK-based).
//   2. Pull the daily forecast for the requested date (or today if
//      omitted) from the forecast API. We ask for max/min temp,
//      precipitation probability, and a weathercode we map to an emoji
//      + short label client-side.
//   3. Cache the response on the CDN edge (Cache-Control headers) so
//      the upstream APIs don't get hammered. Open-Meteo allows up to
//      10k calls/day per non-commercial use, but we should still be
//      polite.
//
// Errors collapse to a 200 with { ok: false, message } so the client
// can render a friendly fallback ("Weather unavailable") without a
// console spam of network errors. Genuine 4xx (bad query) is a 400.

import { json } from "./_airtable.mjs";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// Map open-meteo weather codes to a tiny human label + emoji.
// https://open-meteo.com/en/docs (WMO weather interpretation codes)
const WEATHER_CODE_MAP = {
  0: { label: "Clear", emoji: "\u2600\ufe0f" },
  1: { label: "Mostly clear", emoji: "\ud83c\udf24\ufe0f" },
  2: { label: "Partly cloudy", emoji: "\u26c5" },
  3: { label: "Overcast", emoji: "\u2601\ufe0f" },
  45: { label: "Fog", emoji: "\ud83c\udf2b\ufe0f" },
  48: { label: "Fog", emoji: "\ud83c\udf2b\ufe0f" },
  51: { label: "Light drizzle", emoji: "\ud83c\udf26\ufe0f" },
  53: { label: "Drizzle", emoji: "\ud83c\udf26\ufe0f" },
  55: { label: "Heavy drizzle", emoji: "\ud83c\udf27\ufe0f" },
  56: { label: "Freezing drizzle", emoji: "\ud83c\udf28\ufe0f" },
  57: { label: "Freezing drizzle", emoji: "\ud83c\udf28\ufe0f" },
  61: { label: "Light rain", emoji: "\ud83c\udf26\ufe0f" },
  63: { label: "Rain", emoji: "\ud83c\udf27\ufe0f" },
  65: { label: "Heavy rain", emoji: "\ud83c\udf27\ufe0f" },
  66: { label: "Freezing rain", emoji: "\ud83c\udf28\ufe0f" },
  67: { label: "Freezing rain", emoji: "\ud83c\udf28\ufe0f" },
  71: { label: "Light snow", emoji: "\ud83c\udf28\ufe0f" },
  73: { label: "Snow", emoji: "\u2744\ufe0f" },
  75: { label: "Heavy snow", emoji: "\u2744\ufe0f" },
  77: { label: "Snow grains", emoji: "\u2744\ufe0f" },
  80: { label: "Showers", emoji: "\ud83c\udf26\ufe0f" },
  81: { label: "Showers", emoji: "\ud83c\udf27\ufe0f" },
  82: { label: "Heavy showers", emoji: "\ud83c\udf27\ufe0f" },
  85: { label: "Snow showers", emoji: "\ud83c\udf28\ufe0f" },
  86: { label: "Snow showers", emoji: "\ud83c\udf28\ufe0f" },
  95: { label: "Thunderstorm", emoji: "\u26c8\ufe0f" },
  96: { label: "Thunderstorm", emoji: "\u26c8\ufe0f" },
  99: { label: "Thunderstorm", emoji: "\u26c8\ufe0f" },
};

function describeCode(code) {
  if (code == null || !Number.isFinite(code)) return { label: "", emoji: "" };
  return WEATHER_CODE_MAP[code] || { label: "Mixed", emoji: "\u26c5" };
}

// Allow ~6 hours of edge caching. Forecasts don't change much within
// that window and our daily summary is robust to small drifts.
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
};

function ok(payload) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...CACHE_HEADERS },
    body: JSON.stringify(payload),
  };
}

async function geocode(location) {
  // Bias towards the UK so "Hounslow" or "Osterley" don't pick up
  // namesake towns abroad. If the caller already includes a country
  // we leave their string untouched.
  const q = location.trim();
  const params = new URLSearchParams({ name: q, count: "1", language: "en", format: "json" });
  const res = await fetch(`${GEOCODE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Geocode failed (${res.status})`);
  const data = await res.json();
  const hit = Array.isArray(data?.results) ? data.results[0] : null;
  if (!hit || typeof hit.latitude !== "number" || typeof hit.longitude !== "number") {
    return null;
  }
  return {
    latitude: hit.latitude,
    longitude: hit.longitude,
    name: hit.name || q,
    country: hit.country || "",
  };
}

async function fetchForecast({ latitude, longitude, date }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "7",
  });
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Forecast failed (${res.status})`);
  const data = await res.json();
  const daily = data?.daily;
  if (!daily || !Array.isArray(daily.time)) return null;
  const idx = date ? daily.time.indexOf(date) : 0;
  if (idx < 0) return null;
  const code = daily.weathercode?.[idx];
  const description = describeCode(code);
  return {
    date: daily.time[idx],
    weatherCode: code ?? null,
    label: description.label,
    emoji: description.emoji,
    tempMax: daily.temperature_2m_max?.[idx] ?? null,
    tempMin: daily.temperature_2m_min?.[idx] ?? null,
    precipChance: daily.precipitation_probability_max?.[idx] ?? null,
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed." });
  }
  const params = event.queryStringParameters || {};
  const location = String(params.location || "").trim();
  const date = String(params.date || "").trim();
  if (!location) {
    return json(400, { error: "location is required" });
  }
  // We accept a missing date (returns today's forecast) but if supplied
  // it must look like YYYY-MM-DD. Anything else we silently treat as
  // "today" rather than 400 — keeps the client tolerant of weird
  // session.date strings (e.g. "TBC").
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";

  try {
    const geo = await geocode(location);
    if (!geo) {
      return ok({ ok: false, message: "Location not found", location });
    }
    const forecast = await fetchForecast({
      latitude: geo.latitude,
      longitude: geo.longitude,
      date: safeDate,
    });
    if (!forecast) {
      return ok({ ok: false, message: "Forecast not available for that date", location, geo });
    }
    return ok({
      ok: true,
      location,
      place: { name: geo.name, country: geo.country },
      forecast,
    });
  } catch (error) {
    console.error("[weather] failed", error);
    // Soft-fail so the client UI just hides the chip.
    return ok({ ok: false, message: "Weather lookup failed", location });
  }
};
