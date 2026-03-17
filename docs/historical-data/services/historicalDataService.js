import {
  createSeededRandom,
  filterSeriesByRange,
  fromIsoDate,
  getBusinessDays,
  toIsoDate
} from "../utils/marketMath.js";
import { assetProfiles } from "../data/assetProfiles.js";

const START_DATE = new Date("2021-01-04T00:00:00");
const END_DATE = new Date("2026-03-13T00:00:00");
const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";

export const DATA_PROVIDERS = [
  {
    id: "mock",
    label: "Mock local",
    requiresApiKey: false,
    description: "Usa la capa local determinista y funciona incluso abriendo el proyecto como archivo."
  },
  {
    id: "alphaVantage",
    label: "Alpha Vantage",
    requiresApiKey: true,
    description: "Consulta series diarias reales cuando hay clave API y usa fallback local por activo si algo falla."
  }
];

const MARKET_REGIMES = [
  {
    start: "2021-01-04",
    end: "2021-12-31",
    equityDrift: 0.13,
    bondDrift: -0.01,
    volatilityMultiplier: 0.82,
    rateShock: 0.08,
    description: "Recuperación post-pandemia y expansión múltiplo en renta variable."
  },
  {
    start: "2022-01-03",
    end: "2022-10-14",
    equityDrift: -0.22,
    bondDrift: -0.16,
    volatilityMultiplier: 1.58,
    rateShock: 0.42,
    description: "Bear market por inflación persistente y subidas agresivas de tipos."
  },
  {
    start: "2022-10-17",
    end: "2023-07-31",
    equityDrift: 0.19,
    bondDrift: 0.05,
    volatilityMultiplier: 0.93,
    rateShock: -0.08,
    description: "Rebote liderado por calidad y tecnología tras el suelo de 2022."
  },
  {
    start: "2023-08-01",
    end: "2024-12-31",
    equityDrift: 0.12,
    bondDrift: 0.06,
    volatilityMultiplier: 0.78,
    rateShock: -0.11,
    description: "Desinflación gradual, crecimiento estable y menor prima de riesgo."
  },
  {
    start: "2025-01-02",
    end: "2025-10-31",
    equityDrift: 0.03,
    bondDrift: 0.04,
    volatilityMultiplier: 1.06,
    rateShock: 0.02,
    description: "Normalización de valoraciones con mercado más selectivo y disperso."
  },
  {
    start: "2025-11-03",
    end: "2026-03-13",
    equityDrift: 0.07,
    bondDrift: 0.03,
    volatilityMultiplier: 0.9,
    rateShock: -0.03,
    description: "Mercado mixto con rotación defensiva y recuperación moderada."
  }
];

const SPECIAL_EVENTS = [
  { date: "2022-06-13", impact: -0.035, tag: "Pico de inflación USA" },
  { date: "2022-09-13", impact: -0.042, tag: "CPI sorpresa al alza" },
  { date: "2023-03-13", impact: -0.018, bondImpact: 0.009, tag: "Estrés bancario regional" },
  { date: "2023-11-14", impact: 0.021, bondImpact: 0.014, tag: "Desinflación confirmada" },
  { date: "2024-07-25", impact: -0.012, tag: "Rotación sectorial en megacaps" },
  { date: "2025-04-10", impact: -0.017, bondImpact: 0.006, tag: "Repricing de crecimiento global" }
];

let cachedProfiles = null;
let businessDaysCache = null;
const cachedSeries = new Map();
const remoteSeriesCache = new Map();

export async function getAssetProfiles() {
  if (cachedProfiles) {
    return cachedProfiles;
  }

  cachedProfiles = assetProfiles;
  return cachedProfiles;
}

export async function getHistoricalDataset() {
  const profiles = await getAssetProfiles();
  const entries = profiles.map((profile) => [profile.symbol, getOrCreateMockSeries(profile)]);
  return Object.fromEntries(entries);
}

export async function getAssetData(symbol, rangeKey = "1Y") {
  const profile = await getAssetProfileBySymbol(symbol);
  const series = profile ? getOrCreateMockSeries(profile) : [];
  return filterSeriesByRange(series, rangeKey);
}

export async function getAssetsData(symbols, rangeKey = "1Y") {
  return symbols.reduce((accumulator, symbol) => {
    const profile = assetProfiles.find((item) => item.symbol === symbol);
    if (profile) {
      accumulator[symbol] = filterSeriesByRange(getOrCreateMockSeries(profile), rangeKey);
    }
    return accumulator;
  }, {});
}

export async function getAssetsDataWithProvider(symbols, rangeKey = "1Y", options = {}) {
  const provider = options.provider || "mock";
  const apiKey = options.apiKey?.trim() || "";

  if (provider !== "alphaVantage" || !apiKey) {
    const dataset = await getAssetsData(symbols, rangeKey);
    return {
      dataset,
      statuses: Object.fromEntries(
        symbols.map((symbol) => [
          symbol,
          createMockStatus(symbol, provider === "alphaVantage" ? "Clave API no configurada." : "Fuente local activa.")
        ])
      ),
      provider: provider === "alphaVantage" ? "mock" : provider
    };
  }

  const output = {};
  const statuses = {};

  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const profile = assetProfiles.find((item) => item.symbol === symbol);
      if (!profile) {
        throw new Error("Activo no reconocido.");
      }

      const series = await fetchAlphaVantageSeries(profile, apiKey);
      return {
        symbol,
        series,
        liveSymbol: profile.liveSymbols?.alphaVantage || profile.symbol,
        liveNote: profile.liveNote || "Serie diaria real cargada desde Alpha Vantage."
      };
    })
  );

  results.forEach((result, index) => {
    const symbol = symbols[index];

    if (result.status === "fulfilled" && result.value.series.length) {
      output[symbol] = filterSeriesByRange(result.value.series, rangeKey);
      statuses[symbol] = {
        source: "live",
        provider: "alphaVantage",
        symbolUsed: result.value.liveSymbol,
        note: result.value.liveNote
      };
      return;
    }

    const profile = assetProfiles.find((item) => item.symbol === symbol);
    output[symbol] = filterSeriesByRange(profile ? getOrCreateMockSeries(profile) : [], rangeKey);
    statuses[symbol] = createMockStatus(
      symbol,
      result.status === "rejected" ? result.reason?.message || "Fallback local por error remoto." : "Fallback local activado."
    );
  });

  return {
    dataset: output,
    statuses,
    provider: "alphaVantage"
  };
}

export function getMarketNarrative(rangeSeries) {
  if (!rangeSeries.length) {
    return [];
  }

  const first = fromIsoDate(rangeSeries[0].date);
  const last = fromIsoDate(rangeSeries[rangeSeries.length - 1].date);

  return MARKET_REGIMES.filter((regime) => {
    const regimeStart = fromIsoDate(regime.start);
    const regimeEnd = fromIsoDate(regime.end);
    return regimeEnd >= first && regimeStart <= last;
  }).map((regime) => regime.description);
}

function generateAssetSeries(profile, businessDays) {
  const random = createSeededRandom(`${profile.symbol}-${businessDays.length}`);
  const series = [];
  let adjustedClose = profile.basePrice;

  for (let index = 0; index < businessDays.length; index += 1) {
    const date = businessDays[index];
    const regime = findRegime(date);
    const eventImpact = findEventImpact(profile, date);
    const seasonal = Math.sin(index / 27) * 0.0009 + Math.cos(index / 61) * 0.0005;
    const drift = resolveDrift(profile, regime) / 252;
    const volatility = (profile.annualVolatility * regime.volatilityMultiplier) / Math.sqrt(252);
    const shock = gaussian(random) * volatility;
    const dailyReturn = drift + shock + seasonal + eventImpact;

    const open = adjustedClose;
    adjustedClose = Math.max(open * (1 + dailyReturn), profile.basePrice * 0.35);

    const intradayRange = Math.max(Math.abs(shock) * 1.8 + volatility * 0.7, 0.0028);
    const wickUp = random() * intradayRange;
    const wickDown = random() * intradayRange;
    const high = Math.max(open, adjustedClose) * (1 + wickUp);
    const low = Math.min(open, adjustedClose) * Math.max(0.82, 1 - wickDown);
    const close = adjustedClose * (1 - profile.yield / 2520);
    const volume = profile.volumeBase === 0
      ? 0
      : Math.round(profile.volumeBase * (0.72 + random() * 0.66 + Math.abs(shock) * 6.5 + Math.abs(eventImpact) * 22));

    series.push({
      date: toIsoDate(date),
      open: round(open),
      high: round(Math.max(high, open, adjustedClose)),
      low: round(Math.min(low, open, adjustedClose)),
      close: round(close),
      adjustedClose: round(adjustedClose),
      volume
    });
  }

  return series;
}

function getOrCreateMockSeries(profile) {
  if (cachedSeries.has(profile.symbol)) {
    return cachedSeries.get(profile.symbol);
  }

  if (!businessDaysCache) {
    businessDaysCache = getBusinessDays(START_DATE, END_DATE);
  }

  const series = generateAssetSeries(profile, businessDaysCache);
  cachedSeries.set(profile.symbol, series);
  return series;
}

async function getAssetProfileBySymbol(symbol) {
  const profiles = await getAssetProfiles();
  return profiles.find((profile) => profile.symbol === symbol) || null;
}

async function fetchAlphaVantageSeries(profile, apiKey) {
  const liveSymbol = profile.liveSymbols?.alphaVantage || profile.symbol;
  const cacheKey = `${liveSymbol}:${apiKey}`;

  if (remoteSeriesCache.has(cacheKey)) {
    return remoteSeriesCache.get(cacheKey);
  }

  const url = new URL(ALPHA_VANTAGE_BASE_URL);
  url.searchParams.set("function", "TIME_SERIES_DAILY");
  url.searchParams.set("symbol", liveSymbol);
  url.searchParams.set("outputsize", "full");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al consultar Alpha Vantage.`);
  }

  const payload = await response.json();
  if (payload["Error Message"]) {
    throw new Error(payload["Error Message"]);
  }
  if (payload.Note) {
    throw new Error("Alpha Vantage devolvió límite de cuota o throttling.");
  }
  if (payload.Information) {
    throw new Error(payload.Information);
  }

  const rawSeries = payload["Time Series (Daily)"];
  if (!rawSeries) {
    throw new Error("No se recibió una serie diaria válida desde Alpha Vantage.");
  }

  const series = Object.entries(rawSeries)
    .map(([date, value]) => {
      const open = Number(value["1. open"]);
      const high = Number(value["2. high"]);
      const low = Number(value["3. low"]);
      const close = Number(value["4. close"]);
      const volume = Number(value["5. volume"] || 0);

      return {
        date,
        open: round(open),
        high: round(high),
        low: round(low),
        close: round(close),
        adjustedClose: round(close),
        volume
      };
    })
    .filter((entry) => Number.isFinite(entry.open) && Number.isFinite(entry.adjustedClose))
    .sort((left, right) => left.date.localeCompare(right.date));

  if (!series.length) {
    throw new Error("La respuesta remota no contenía velas utilizables.");
  }

  remoteSeriesCache.set(cacheKey, series);
  return series;
}

function resolveDrift(profile, regime) {
  const regimeDrift = profile.marketClass === "bond" ? regime.bondDrift : regime.equityDrift;
  const ratePenalty = regime.rateShock * profile.rateSensitivity;
  return profile.annualDrift * 0.48 + regimeDrift * 0.52 - ratePenalty;
}

function findRegime(date) {
  return MARKET_REGIMES.find((regime) => {
    const start = fromIsoDate(regime.start);
    const end = fromIsoDate(regime.end);
    return date >= start && date <= end;
  }) ?? MARKET_REGIMES[MARKET_REGIMES.length - 1];
}

function findEventImpact(profile, date) {
  const isoDate = toIsoDate(date);
  const event = SPECIAL_EVENTS.find((item) => item.date === isoDate);
  if (!event) {
    return 0;
  }

  const baseImpact = profile.marketClass === "bond"
    ? (event.bondImpact ?? event.impact * -0.25)
    : event.impact * profile.beta;

  if (profile.sectorBias === "financials" && event.tag.includes("bancario")) {
    return baseImpact * 1.45;
  }

  if (profile.sectorBias.includes("tech") && event.tag.includes("megacaps")) {
    return baseImpact * 1.35;
  }

  return baseImpact;
}

function gaussian(random) {
  let u = 0;
  let v = 0;
  while (u === 0) {
    u = random();
  }
  while (v === 0) {
    v = random();
  }
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function round(value) {
  return Number(value.toFixed(value >= 100 ? 2 : 4));
}

function createMockStatus(symbol, note) {
  return {
    source: "mock",
    provider: "mock",
    symbolUsed: symbol,
    note
  };
}
