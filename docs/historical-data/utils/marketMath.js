const DAY_MS = 24 * 60 * 60 * 1000;

export const RANGE_OPTIONS = ["1M", "3M", "6M", "1Y", "5Y", "MAX"];
export const CHART_TYPES = ["line", "candlestick", "bar"];

export function createSeededRandom(seedText) {
  let hash = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function fromIsoDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function getBusinessDays(startDate, endDate) {
  const days = [];
  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      days.push(new Date(cursor));
    }
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values) {
  if (values.length < 2) {
    return 0;
  }
  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function calculateDrawdown(series) {
  let peak = -Infinity;
  let maxDrawdown = 0;

  series.forEach((item) => {
    peak = Math.max(peak, item.adjustedClose);
    const drawdown = peak === 0 ? 0 : (item.adjustedClose - peak) / peak;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
  });

  return maxDrawdown;
}

export function calculateReturns(series) {
  const returns = [];
  for (let index = 1; index < series.length; index += 1) {
    const previous = series[index - 1].adjustedClose;
    const current = series[index].adjustedClose;
    if (previous > 0) {
      returns.push((current - previous) / previous);
    }
  }
  return returns;
}

export function calculateMetrics(series) {
  if (!series.length) {
    return {
      accumulatedReturn: 0,
      annualizedVolatility: 0,
      drawdown: 0,
      maxClose: 0,
      minClose: 0,
      firstClose: 0,
      lastClose: 0
    };
  }

  const returns = calculateReturns(series);
  const firstClose = series[0].adjustedClose;
  const lastClose = series[series.length - 1].adjustedClose;
  const accumulatedReturn = firstClose === 0 ? 0 : (lastClose - firstClose) / firstClose;
  const annualizedVolatility = standardDeviation(returns) * Math.sqrt(252);
  const closes = series.map((item) => item.adjustedClose);

  return {
    accumulatedReturn,
    annualizedVolatility,
    drawdown: calculateDrawdown(series),
    maxClose: Math.max(...closes),
    minClose: Math.min(...closes),
    firstClose,
    lastClose
  };
}

export function calculateSimpleMovingAverage(series, period) {
  if (!series.length) {
    return [];
  }

  return series.map((item, index) => {
    if (index + 1 < period) {
      return {
        date: item.date,
        value: null
      };
    }

    const window = series.slice(index + 1 - period, index + 1);
    return {
      date: item.date,
      value: average(window.map((entry) => entry.adjustedClose))
    };
  });
}

export function calculateExponentialMovingAverage(series, period) {
  if (!series.length) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  let previous = series[0].adjustedClose;

  return series.map((item, index) => {
    if (index === 0) {
      return {
        date: item.date,
        value: previous
      };
    }

    previous = (item.adjustedClose - previous) * multiplier + previous;
    return {
      date: item.date,
      value: previous
    };
  });
}

export function calculateRsi(series, period = 14) {
  if (series.length <= period) {
    return null;
  }

  let gainSum = 0;
  let lossSum = 0;

  for (let index = 1; index <= period; index += 1) {
    const delta = series[index].adjustedClose - series[index - 1].adjustedClose;
    gainSum += Math.max(delta, 0);
    lossSum += Math.max(-delta, 0);
  }

  let averageGain = gainSum / period;
  let averageLoss = lossSum / period;
  let rsi = averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss));

  for (let index = period + 1; index < series.length; index += 1) {
    const delta = series[index].adjustedClose - series[index - 1].adjustedClose;
    const gain = Math.max(delta, 0);
    const loss = Math.max(-delta, 0);
    averageGain = ((averageGain * (period - 1)) + gain) / period;
    averageLoss = ((averageLoss * (period - 1)) + loss) / period;
    rsi = averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss));
  }

  return rsi;
}

export function calculateAtr(series, period = 14) {
  if (series.length <= period) {
    return null;
  }

  const trueRanges = [];
  for (let index = 1; index < series.length; index += 1) {
    const current = series[index];
    const previous = series[index - 1];
    trueRanges.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.adjustedClose),
        Math.abs(current.low - previous.adjustedClose)
      )
    );
  }

  return average(trueRanges.slice(-period));
}

export function calculateRollingVolatility(series, period = 20) {
  if (series.length <= period) {
    return 0;
  }

  return standardDeviation(calculateReturns(series).slice(-period)) * Math.sqrt(252);
}

export function calculateAverageVolume(series, period = 20) {
  if (!series.length) {
    return 0;
  }

  return average(series.slice(-period).map((entry) => entry.volume || 0));
}

export function buildTechnicalIndicators(series) {
  if (!series.length) {
    return {
      sma20Series: [],
      sma50Series: [],
      ema20Series: [],
      latest: null,
      signals: []
    };
  }

  const sma20Series = calculateSimpleMovingAverage(series, 20);
  const sma50Series = calculateSimpleMovingAverage(series, 50);
  const ema20Series = calculateExponentialMovingAverage(series, 20);
  const latestPoint = series[series.length - 1];
  const sma20 = sma20Series[sma20Series.length - 1]?.value ?? null;
  const sma50 = sma50Series[sma50Series.length - 1]?.value ?? null;
  const ema20 = ema20Series[ema20Series.length - 1]?.value ?? null;
  const rsi14 = calculateRsi(series, 14);
  const atr14 = calculateAtr(series, 14);
  const realizedVolatility20 = calculateRollingVolatility(series, 20);
  const averageVolume20 = calculateAverageVolume(series, 20);
  const volumeRatio20 = averageVolume20 === 0 ? 0 : (latestPoint.volume || 0) / averageVolume20;
  const momentum20 = series.length > 20
    ? (latestPoint.adjustedClose - series[series.length - 21].adjustedClose) / series[series.length - 21].adjustedClose
    : 0;
  const priceVsSma20 = sma20 ? (latestPoint.adjustedClose - sma20) / sma20 : 0;
  const priceVsSma50 = sma50 ? (latestPoint.adjustedClose - sma50) / sma50 : 0;
  const trend = sma20 && sma50
    ? latestPoint.adjustedClose > sma20 && sma20 > sma50
      ? "Alcista"
      : latestPoint.adjustedClose < sma20 && sma20 < sma50
        ? "Bajista"
        : "Mixta"
    : "Insuficiente";

  const signals = [
    trend === "Alcista"
      ? "Precio por encima de SMA20 y SMA50, con sesgo técnico favorable."
      : trend === "Bajista"
        ? "Precio por debajo de las medias principales, con presión de tendencia."
        : "El precio se mueve entre medias, con estructura menos definida.",
    rsi14 !== null
      ? rsi14 >= 70
        ? "RSI 14 sugiere sobrecompra de corto plazo."
        : rsi14 <= 30
          ? "RSI 14 sugiere sobreventa de corto plazo."
          : "RSI 14 permanece en zona neutral."
      : "No hay suficiente histórico para RSI 14.",
    volumeRatio20 >= 1.25
      ? "El volumen reciente está acelerado frente a su media de 20 sesiones."
      : volumeRatio20 <= 0.8
        ? "El volumen reciente está por debajo del ritmo habitual."
        : "El volumen reciente se mantiene cerca de su media de 20 sesiones."
  ];

  return {
    sma20Series,
    sma50Series,
    ema20Series,
    latest: {
      trend,
      rsi14,
      atr14,
      realizedVolatility20,
      averageVolume20,
      volumeRatio20,
      momentum20,
      priceVsSma20,
      priceVsSma50,
      sma20,
      sma50,
      ema20,
      close: latestPoint.adjustedClose
    },
    signals
  };
}

export function filterSeriesByRange(series, rangeKey) {
  if (!series.length || rangeKey === "MAX") {
    return series;
  }

  const endDate = fromIsoDate(series[series.length - 1].date);
  const monthsByRange = {
    "1M": 1,
    "3M": 3,
    "6M": 6,
    "1Y": 12,
    "5Y": 60
  };

  const months = monthsByRange[rangeKey] ?? 12;
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - months);

  return series.filter((item) => fromIsoDate(item.date) >= startDate);
}

export function normalizeSeries(series) {
  if (!series.length) {
    return [];
  }
  const base = series[0].adjustedClose || 1;
  return series.map((item) => ({
    date: item.date,
    value: (item.adjustedClose / base) * 100
  }));
}

export function resampleMonthlyReturns(series) {
  const buckets = new Map();

  series.forEach((item) => {
    const key = item.date.slice(0, 7);
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(item);
  });

  return [...buckets.entries()].map(([month, values]) => {
    const open = values[0].adjustedClose;
    const close = values[values.length - 1].adjustedClose;
    return {
      month,
      returnPct: open === 0 ? 0 : ((close - open) / open) * 100
    };
  });
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat("es-ES", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatPrice(value, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 2 : 4
  }).format(value);
}

export function formatPercent(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    maximumFractionDigits: 2,
    signDisplay: "exceptZero"
  }).format(value);
}
