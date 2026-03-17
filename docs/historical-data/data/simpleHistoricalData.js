export const HISTORICAL_CATEGORIES = [
  { id: "indices", label: "Indices" },
  { id: "etfs", label: "ETFs" },
  { id: "materias-primas", label: "Materias primas" }
];

export const historicalAssets = [
  createAsset({
    id: "sp500",
    symbol: "SPX",
    name: "S&P 500",
    category: "indices",
    categoryLabel: "Indice",
    currency: "USD",
    description: "Indice amplio de renta variable estadounidense.",
    startValue: 4700,
    changes: [0.018, 0.024, 0.011, -0.009, 0.019, 0.013, 0.022, -0.006, 0.015, 0.01, 0.028, 0.012, 0.016, -0.014, 0.009, 0.021, 0.012, 0.008, -0.011, 0.017, 0.006, 0.014, 0.012, 0.01]
  }),
  createAsset({
    id: "nasdaq100",
    symbol: "NDX",
    name: "Nasdaq 100",
    category: "indices",
    categoryLabel: "Indice",
    currency: "USD",
    description: "Indice de tecnológicas y grandes compañías no financieras de EE.UU.",
    startValue: 16350,
    changes: [0.024, 0.031, 0.015, -0.018, 0.028, 0.017, 0.03, -0.009, 0.021, 0.012, 0.034, 0.019, 0.022, -0.021, 0.011, 0.026, 0.014, 0.009, -0.017, 0.019, 0.007, 0.015, 0.018, 0.012]
  }),
  createAsset({
    id: "eurostoxx50",
    symbol: "SX5E",
    name: "EuroStoxx 50",
    category: "indices",
    categoryLabel: "Indice",
    currency: "EUR",
    description: "Indice de referencia de grandes compañías de la eurozona.",
    startValue: 4200,
    changes: [0.012, 0.014, 0.006, -0.013, 0.011, 0.008, 0.015, -0.004, 0.009, 0.007, 0.018, 0.01, 0.013, -0.01, 0.007, 0.014, 0.008, 0.005, -0.009, 0.012, 0.004, 0.011, 0.009, 0.006]
  }),
  createAsset({
    id: "cspx",
    symbol: "CSPX",
    name: "iShares Core S&P 500 UCITS ETF",
    category: "etfs",
    categoryLabel: "ETF",
    currency: "USD",
    description: "ETF acumulativo que replica el S&P 500.",
    startValue: 440,
    changes: [0.018, 0.023, 0.012, -0.01, 0.018, 0.014, 0.021, -0.005, 0.015, 0.009, 0.026, 0.011, 0.016, -0.013, 0.01, 0.02, 0.011, 0.008, -0.01, 0.016, 0.005, 0.014, 0.011, 0.009]
  }),
  createAsset({
    id: "vwce",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World UCITS ETF",
    category: "etfs",
    categoryLabel: "ETF",
    currency: "USD",
    description: "ETF global de renta variable desarrollada y emergente.",
    startValue: 106,
    changes: [0.014, 0.017, 0.009, -0.008, 0.013, 0.011, 0.016, -0.005, 0.011, 0.008, 0.018, 0.01, 0.012, -0.011, 0.007, 0.015, 0.009, 0.006, -0.008, 0.013, 0.004, 0.01, 0.009, 0.007]
  }),
  createAsset({
    id: "aggh",
    symbol: "AGGH",
    name: "iShares Core Global Aggregate Bond",
    category: "etfs",
    categoryLabel: "ETF",
    currency: "EUR",
    description: "ETF de renta fija global con menor volatilidad.",
    startValue: 5.1,
    changes: [0.003, 0.004, 0.002, -0.002, 0.003, 0.002, 0.004, -0.001, 0.002, 0.002, 0.005, 0.003, 0.003, -0.002, 0.002, 0.004, 0.002, 0.002, -0.001, 0.003, 0.001, 0.002, 0.002, 0.001]
  }),
  createAsset({
    id: "oro",
    symbol: "XAU",
    name: "Oro spot",
    category: "materias-primas",
    categoryLabel: "Materia prima",
    currency: "USD",
    description: "Precio orientativo del oro como activo refugio.",
    startValue: 1985,
    changes: [0.01, 0.008, 0.011, 0.004, -0.006, 0.013, 0.017, 0.007, 0.005, 0.009, 0.014, 0.006, 0.012, 0.004, -0.003, 0.01, 0.008, 0.006, 0.003, 0.012, 0.009, 0.007, 0.011, 0.008]
  }),
  createAsset({
    id: "plata",
    symbol: "XAG",
    name: "Plata spot",
    category: "materias-primas",
    categoryLabel: "Materia prima",
    currency: "USD",
    description: "Precio orientativo de la plata, con mayor volatilidad que el oro.",
    startValue: 22.8,
    changes: [0.016, 0.011, 0.013, -0.012, 0.018, 0.014, 0.021, -0.01, 0.009, 0.012, 0.019, 0.011, 0.014, -0.013, 0.01, 0.018, 0.012, 0.008, -0.009, 0.015, 0.007, 0.013, 0.012, 0.009]
  })
];

function createAsset(definition) {
  return {
    ...definition,
    series: buildSeries(definition.startValue, definition.changes)
  };
}

function buildSeries(startValue, changes) {
  const series = [];
  let value = startValue;
  const startDate = new Date("2024-03-01T00:00:00");

  for (let index = 0; index < changes.length; index += 1) {
    value *= (1 + changes[index]);
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + index);
    series.push({
      date: formatMonth(currentDate),
      value: Number(value.toFixed(value >= 100 ? 2 : 4))
    });
  }

  return series;
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    year: "numeric"
  }).format(date);
}
