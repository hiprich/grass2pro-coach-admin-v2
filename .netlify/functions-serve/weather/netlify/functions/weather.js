var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/weather.mjs
var weather_exports = {};
__export(weather_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(weather_exports);

// netlify/functions/_airtable.mjs
var json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(body)
});
var demoData = {
  coach: {
    id: "rec_demo_coach",
    name: "Kobby Mensah",
    role: "Grassroots coach admin",
    credential: "FA Level 1 | DBS checked",
    email: "coach@grass2pro.com"
  },
  players: [
    {
      id: "ply_01",
      name: "Jayden Cole",
      ageGroup: "U11",
      team: "Grass2Pro West",
      position: "CM",
      status: "Active",
      guardianName: "M. Cole",
      consentStatus: "green",
      photoConsent: true,
      videoConsent: true,
      matchPhotoConsent: true,
      matchVideoConsent: true,
      websiteConsent: true,
      socialConsent: false,
      highlightsConsent: true,
      reviewDue: "2026-05-02",
      progressScore: 84
    },
    {
      id: "ply_02",
      name: "Noah Patel",
      ageGroup: "U11",
      team: "Grass2Pro West",
      position: "RW",
      status: "Active",
      guardianName: "A. Patel",
      consentStatus: "amber",
      photoConsent: true,
      videoConsent: true,
      matchPhotoConsent: false,
      matchVideoConsent: false,
      websiteConsent: false,
      socialConsent: false,
      highlightsConsent: false,
      reviewDue: "2026-05-07",
      progressScore: 71
    },
    {
      id: "ply_03",
      name: "Leo Brooks",
      ageGroup: "U8",
      team: "Grass2Pro Juniors",
      position: "ST",
      status: "Needs parent follow-up",
      guardianName: "S. Brooks",
      consentStatus: "grey",
      photoConsent: false,
      videoConsent: false,
      matchPhotoConsent: false,
      matchVideoConsent: false,
      websiteConsent: false,
      socialConsent: false,
      highlightsConsent: false,
      reviewDue: "2026-05-10",
      progressScore: 48
    },
    {
      id: "ply_04",
      name: "Amari James",
      ageGroup: "U11",
      team: "Grass2Pro West",
      position: "CB",
      status: "Withdrawn media consent",
      guardianName: "T. James",
      consentStatus: "red",
      photoConsent: false,
      videoConsent: false,
      matchPhotoConsent: false,
      matchVideoConsent: false,
      websiteConsent: false,
      socialConsent: false,
      highlightsConsent: false,
      reviewDue: "2026-05-12",
      progressScore: 67
    },
    {
      id: "ply_05",
      name: "Ethan Smith",
      ageGroup: "U8",
      team: "Grass2Pro Juniors",
      position: "GK",
      status: "Active",
      guardianName: "R. Smith",
      consentStatus: "green",
      photoConsent: true,
      videoConsent: true,
      matchPhotoConsent: true,
      matchVideoConsent: true,
      websiteConsent: false,
      socialConsent: false,
      highlightsConsent: true,
      reviewDue: "2026-05-04",
      progressScore: 76
    }
  ],
  sidebar: [
    { id: "overview", label: "Overview", count: 5, icon: "home" },
    { id: "players", label: "Players", count: 5, icon: "users" },
    { id: "sessions", label: "Sessions", count: 0, icon: "calendar" },
    { id: "attendance", label: "Attendance", count: 0, icon: "clipboard" },
    { id: "safeguarding", label: "Safeguarding", count: 2, icon: "shield" },
    { id: "payments", label: "Payments", count: 0, icon: "pound" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" }
  ],
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};

// netlify/functions/weather.mjs
var GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
var FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
var WEATHER_CODE_MAP = {
  0: { label: "Clear", emoji: "\u2600\uFE0F" },
  1: { label: "Mostly clear", emoji: "\u{1F324}\uFE0F" },
  2: { label: "Partly cloudy", emoji: "\u26C5" },
  3: { label: "Overcast", emoji: "\u2601\uFE0F" },
  45: { label: "Fog", emoji: "\u{1F32B}\uFE0F" },
  48: { label: "Fog", emoji: "\u{1F32B}\uFE0F" },
  51: { label: "Light drizzle", emoji: "\u{1F326}\uFE0F" },
  53: { label: "Drizzle", emoji: "\u{1F326}\uFE0F" },
  55: { label: "Heavy drizzle", emoji: "\u{1F327}\uFE0F" },
  56: { label: "Freezing drizzle", emoji: "\u{1F328}\uFE0F" },
  57: { label: "Freezing drizzle", emoji: "\u{1F328}\uFE0F" },
  61: { label: "Light rain", emoji: "\u{1F326}\uFE0F" },
  63: { label: "Rain", emoji: "\u{1F327}\uFE0F" },
  65: { label: "Heavy rain", emoji: "\u{1F327}\uFE0F" },
  66: { label: "Freezing rain", emoji: "\u{1F328}\uFE0F" },
  67: { label: "Freezing rain", emoji: "\u{1F328}\uFE0F" },
  71: { label: "Light snow", emoji: "\u{1F328}\uFE0F" },
  73: { label: "Snow", emoji: "\u2744\uFE0F" },
  75: { label: "Heavy snow", emoji: "\u2744\uFE0F" },
  77: { label: "Snow grains", emoji: "\u2744\uFE0F" },
  80: { label: "Showers", emoji: "\u{1F326}\uFE0F" },
  81: { label: "Showers", emoji: "\u{1F327}\uFE0F" },
  82: { label: "Heavy showers", emoji: "\u{1F327}\uFE0F" },
  85: { label: "Snow showers", emoji: "\u{1F328}\uFE0F" },
  86: { label: "Snow showers", emoji: "\u{1F328}\uFE0F" },
  95: { label: "Thunderstorm", emoji: "\u26C8\uFE0F" },
  96: { label: "Thunderstorm", emoji: "\u26C8\uFE0F" },
  99: { label: "Thunderstorm", emoji: "\u26C8\uFE0F" }
};
function describeCode(code) {
  if (code == null || !Number.isFinite(code)) return { label: "", emoji: "" };
  return WEATHER_CODE_MAP[code] || { label: "Mixed", emoji: "\u26C5" };
}
var CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400"
};
function ok(payload) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...CACHE_HEADERS },
    body: JSON.stringify(payload)
  };
}
async function geocode(location) {
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
    country: hit.country || ""
  };
}
async function fetchForecast({ latitude, longitude, date }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "7"
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
    precipChance: daily.precipitation_probability_max?.[idx] ?? null
  };
}
var handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed." });
  }
  const params = event.queryStringParameters || {};
  const location = String(params.location || "").trim();
  const date = String(params.date || "").trim();
  if (!location) {
    return json(400, { error: "location is required" });
  }
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  try {
    const geo = await geocode(location);
    if (!geo) {
      return ok({ ok: false, message: "Location not found", location });
    }
    const forecast = await fetchForecast({
      latitude: geo.latitude,
      longitude: geo.longitude,
      date: safeDate
    });
    if (!forecast) {
      return ok({ ok: false, message: "Forecast not available for that date", location, geo });
    }
    return ok({
      ok: true,
      location,
      place: { name: geo.name, country: geo.country },
      forecast
    });
  } catch (error) {
    console.error("[weather] failed", error);
    return ok({ ok: false, message: "Weather lookup failed", location });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=weather.js.map
