import {
  HISTORICAL_CATEGORIES,
  historicalAssets
} from "./data/simpleHistoricalData.js";

const STORAGE_KEY = "blas-simple-historical-state";
const THEME_KEY = "blas-historical-theme";
const RANGE_OPTIONS = ["12M", "24M", "MAX"];
const root = document.getElementById("historicalDataModule");

if (root) {
  const state = hydrateState();
  root.dataset.theme = state.theme;
  persistState(state);
  render();
  root.addEventListener("click", handleClick);
  root.addEventListener("change", handleChange);
}

function hydrateState() {
  const firstAsset = historicalAssets[0];
  const fallback = {
    category: firstAsset.category,
    assetId: firstAsset.id,
    range: "12M",
    theme: localStorage.getItem(THEME_KEY) || "light",
    simulation: buildDefaultSimulation()
  };

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const saved = JSON.parse(raw);
    return {
      category: HISTORICAL_CATEGORIES.some((item) => item.id === saved.category) ? saved.category : fallback.category,
      assetId: historicalAssets.some((item) => item.id === saved.assetId) ? saved.assetId : fallback.assetId,
      range: RANGE_OPTIONS.includes(saved.range) ? saved.range : fallback.range,
      theme: saved.theme === "dark" ? "dark" : fallback.theme,
      simulation: normalizeSimulation(saved.simulation)
    };
  } catch {
    return fallback;
  }
}

function normalizeSimulation(simulation) {
  return historicalAssets.reduce((accumulator, asset) => {
    const source = simulation?.[asset.id] || { amount: 10000, years: 5 };
    accumulator[asset.id] = {
      amount: Number(source.amount) > 0 ? Number(source.amount) : 10000,
      years: Number(source.years) > 0 ? Number(source.years) : 5
    };
    return accumulator;
  }, {});
}

function buildDefaultSimulation() {
  return historicalAssets.reduce((accumulator, asset) => {
    accumulator[asset.id] = { amount: 10000, years: 5 };
    return accumulator;
  }, {});
}

function persistState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(THEME_KEY, state.theme);
}

function getState() {
  return hydrateState();
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const state = getState();
  const action = target.dataset.action;

  if (action === "theme") {
    state.theme = state.theme === "light" ? "dark" : "light";
  }

  if (action === "category") {
    state.category = target.dataset.value;
    const categoryAssets = historicalAssets.filter((asset) => asset.category === state.category);
    if (!categoryAssets.some((asset) => asset.id === state.assetId)) {
      state.assetId = categoryAssets[0]?.id || historicalAssets[0].id;
    }
  }

  if (action === "range") {
    state.range = target.dataset.value;
  }

  root.dataset.theme = state.theme;
  persistState(state);
  render();
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) && !(target instanceof HTMLInputElement)) {
    return;
  }

  const state = getState();
  if (target.name === "historical-asset") {
    state.assetId = target.value;
  }

  if (target instanceof HTMLInputElement && target.dataset.simAsset && target.dataset.simField) {
    const assetId = target.dataset.simAsset;
    const field = target.dataset.simField;
    const numericValue = Number(target.value) || 0;
    if (!state.simulation) {
      state.simulation = normalizeSimulation();
    }
    state.simulation[assetId] = {
      ...state.simulation[assetId],
      [field]: numericValue
    };
  }

  persistState(state);
  render();
}

function render() {
  const state = getState();
  const assets = historicalAssets.filter((asset) => asset.category === state.category);
  const asset = assets.find((item) => item.id === state.assetId) || assets[0] || historicalAssets[0];
  const points = sliceSeries(asset.series, state.range);
  const stats = buildStats(points);
  const selectedSimulation = buildAssetSimulation(asset, state.simulation?.[asset.id]);

  root.innerHTML = `
    <div class="historical-data-app hd-simple-app">
      <section class="hd-panel hd-hero">
        <div>
          <p class="hd-kicker">Datos rápidos</p>
          <h2>Datos Históricos</h2>
          <p class="hd-hero-copy">
            Vista simple con datos locales para índices, ETFs y materias primas. Elige un activo y ves su evolución sin cargas pesadas.
          </p>
        </div>
        <div class="hd-hero-actions">
          <button type="button" class="hd-theme-toggle" data-action="theme">
            ${state.theme === "light" ? "Modo oscuro" : "Modo claro"}
          </button>
          <div class="hd-hero-meta">
            <span>Ligero</span>
            <span>Datos locales</span>
            <span>${asset.categoryLabel}</span>
          </div>
        </div>
      </section>

      <section class="hd-panel hd-simple-controls">
        <div class="hd-simple-filters">
          <div>
            <p class="hd-kicker">Tipo</p>
            <div class="hd-range-selector">
              ${HISTORICAL_CATEGORIES.map((category) => `
                <button type="button" class="hd-pill ${category.id === state.category ? "is-active" : ""}" data-action="category" data-value="${category.id}">
                  ${category.label}
                </button>
              `).join("")}
            </div>
          </div>

          <label class="hd-inline-label hd-simple-select">
            <span>Activo</span>
            <select class="hd-select" name="historical-asset">
              ${assets.map((item) => `
                <option value="${item.id}" ${item.id === asset.id ? "selected" : ""}>${item.symbol} · ${item.name}</option>
              `).join("")}
            </select>
          </label>

          <div>
            <p class="hd-kicker">Rango</p>
            <div class="hd-range-selector">
              ${RANGE_OPTIONS.map((range) => `
                <button type="button" class="hd-pill ${range === state.range ? "is-active" : ""}" data-action="range" data-value="${range}">
                  ${range}
                </button>
              `).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="hd-simple-grid">
        <article class="hd-panel hd-simple-summary">
          <div class="hd-panel-head">
            <div>
              <p class="hd-kicker">Activo seleccionado</p>
              <h4>${asset.symbol} · ${asset.name}</h4>
            </div>
            <span>${asset.currency}</span>
          </div>
          <p class="hd-simple-copy">${asset.description}</p>
          <div class="hd-simple-stats">
            <div class="hd-indicator-card">
              <span>Último valor</span>
              <strong>${formatPrice(stats.lastValue, asset.currency)}</strong>
            </div>
            <div class="hd-indicator-card">
              <span>Variación</span>
              <strong class="${stats.changePct >= 0 ? "is-positive" : "is-negative"}">${formatPercent(stats.changePct)}</strong>
            </div>
            <div class="hd-indicator-card">
              <span>Máximo</span>
              <strong>${formatPrice(stats.maxValue, asset.currency)}</strong>
            </div>
            <div class="hd-indicator-card">
              <span>Mínimo</span>
              <strong>${formatPrice(stats.minValue, asset.currency)}</strong>
            </div>
          </div>
        </article>

        <article class="hd-panel hd-simple-chart-panel">
          <div class="hd-panel-head">
            <div>
              <p class="hd-kicker">Evolución</p>
              <h4>${asset.symbol}</h4>
            </div>
            <span>${points[0]?.date || ""} a ${points[points.length - 1]?.date || ""}</span>
          </div>
          ${renderChart(points, asset)}
        </article>
      </section>

      <section class="hd-panel hd-simulation-panel">
        <div class="hd-panel-head">
          <div>
            <p class="hd-kicker">Simulación por inversión</p>
            <h4>Cálculo solo para el activo seleccionado</h4>
          </div>
          <span>${asset.symbol}</span>
        </div>
        <div class="hd-simulation-grid">
          ${renderSimulationCard(selectedSimulation)}
        </div>
      </section>

      <section class="hd-panel hd-simple-table-panel">
        <div class="hd-panel-head">
          <div>
            <p class="hd-kicker">Últimos datos</p>
            <h4>Serie resumida</h4>
          </div>
          <span>${asset.categoryLabel}</span>
        </div>
        <div class="hd-table-wrap">
          <table class="hd-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Valor</th>
                <th>Variación</th>
              </tr>
            </thead>
            <tbody>${buildRows(points, asset.currency)}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function buildAssetSimulation(asset, input) {
  const monthlyReturns = asset.changes.slice();
  const averageMonthlyReturn = average(monthlyReturns);
  const annualizedReturn = Math.pow(1 + averageMonthlyReturn, 12) - 1;
  const annualizedVolatility = standardDeviation(monthlyReturns) * Math.sqrt(12);
  const worstMonth = Math.min(...monthlyReturns);
  const maxDrawdown = calculateMaxDrawdown(buildCategoryPath(monthlyReturns));
  const amount = Math.max(0, Number(input?.amount) || 10000);
  const years = Math.max(1, Number(input?.years) || 5);
  const projectedValue = amount * Math.pow(1 + annualizedReturn, years);
  const gain = projectedValue - amount;
  const scenarios = buildProjectionScenarios(monthlyReturns, amount, years, asset.currency);

  return {
    id: asset.id,
    label: asset.name,
    symbol: asset.symbol,
    amount,
    years,
    annualizedReturn,
    annualizedVolatility,
    worstMonth,
    maxDrawdown,
    projectedValue,
    gain,
    scenarios,
    riskLabel: resolveRiskLabel(annualizedVolatility),
    examples: `${asset.symbol} · ${asset.categoryLabel}`,
    currency: asset.currency,
    description: asset.description
  };
}

function renderSimulationCard(simulation) {
  return `
    <article class="hd-simulation-card">
      <div class="hd-simulation-layout">
        <div class="hd-simulation-main">
          <div class="hd-panel-head">
            <div>
              <p class="hd-kicker">${simulation.symbol}</p>
              <h4>${simulation.label}</h4>
            </div>
            <span>${simulation.riskLabel}</span>
          </div>
          <p class="hd-simple-copy">${simulation.description}</p>
          <div class="hd-panel-head hd-simulation-subhead">
            <div>
              <h4>${simulation.riskLabel}</h4>
            </div>
            <span>${simulation.examples}</span>
          </div>
          <div class="hd-simulation-inputs">
            <label class="hd-inline-label">
              <span>Cantidad inicial</span>
              <input
                class="hd-search"
                type="number"
                min="0"
                step="100"
                value="${simulation.amount}"
                data-sim-asset="${simulation.id}"
                data-sim-field="amount"
              />
            </label>
            <label class="hd-inline-label">
              <span>Años</span>
              <input
                class="hd-search"
                type="number"
                min="1"
                step="1"
                value="${simulation.years}"
                data-sim-asset="${simulation.id}"
                data-sim-field="years"
              />
            </label>
          </div>
        </div>

        <div class="hd-simulation-results">
          <div class="hd-simple-stats hd-simulation-stats">
            <div class="hd-indicator-card">
              <span>Valor proyectado</span>
              <strong>${formatPrice(simulation.projectedValue, simulation.currency)}</strong>
            </div>
            <div class="hd-indicator-card">
              <span>Ganancia esperada</span>
              <strong class="${simulation.gain >= 0 ? "is-positive" : "is-negative"}">${formatPrice(simulation.gain, simulation.currency)}</strong>
            </div>
            <div class="hd-indicator-card">
              <span>Rentabilidad media anual</span>
              <strong class="${simulation.annualizedReturn >= 0 ? "is-positive" : "is-negative"}">${formatPercent(simulation.annualizedReturn)}</strong>
            </div>
            <div class="hd-indicator-card">
              <span>Volatilidad anual</span>
              <strong>${formatPercent(simulation.annualizedVolatility)}</strong>
            </div>
            <div class="hd-indicator-card">
              <span>Peor mes</span>
              <strong class="is-negative">${formatPercent(simulation.worstMonth)}</strong>
            </div>
            <div class="hd-indicator-card">
              <span>Drawdown histórico</span>
              <strong class="is-negative">${formatPercent(simulation.maxDrawdown)}</strong>
            </div>
          </div>
          <div class="hd-scenario-grid">
            ${simulation.scenarios.map((scenario) => `
              <div class="hd-scenario-card ${scenario.toneClass}">
                <span>${scenario.label}</span>
                <strong>${formatPrice(scenario.projectedValue, simulation.currency)}</strong>
                <small>${formatPercent(scenario.annualizedReturn)} anual · ${formatPrice(scenario.gain, simulation.currency)} de ganancia</small>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </article>
  `;
}

function buildProjectionScenarios(monthlyReturns, amount, years, currency) {
  const sorted = monthlyReturns.slice().sort((left, right) => left - right);
  const segmentSize = Math.max(1, Math.ceil(sorted.length / 3));
  const worstMonthly = average(sorted.slice(0, segmentSize));
  const bestMonthly = average(sorted.slice(-segmentSize));
  const baseMonthly = average(monthlyReturns);

  return [
    createScenario("Mejor rendimiento", bestMonthly, amount, years, currency, "is-positive"),
    createScenario("Rendimiento medio", baseMonthly, amount, years, currency, ""),
    createScenario("Peor rendimiento", worstMonthly, amount, years, currency, "is-negative")
  ];
}

function createScenario(label, monthlyReturn, amount, years, currency, toneClass) {
  const annualizedReturn = Math.pow(1 + monthlyReturn, 12) - 1;
  const projectedValue = amount * Math.pow(1 + annualizedReturn, years);
  return {
    label,
    annualizedReturn,
    projectedValue,
    gain: projectedValue - amount,
    toneClass,
    currency
  };
}

function buildCategoryPath(monthlyReturns) {
  const path = [100];
  let value = 100;
  monthlyReturns.forEach((monthlyReturn) => {
    value *= 1 + monthlyReturn;
    path.push(value);
  });
  return path;
}

function calculateMaxDrawdown(path) {
  let peak = path[0] || 0;
  let drawdown = 0;
  path.forEach((value) => {
    peak = Math.max(peak, value);
    if (peak > 0) {
      drawdown = Math.min(drawdown, (value - peak) / peak);
    }
  });
  return drawdown;
}

function resolveRiskLabel(volatility) {
  if (volatility >= 0.2) {
    return "Riesgo alto";
  }
  if (volatility >= 0.1) {
    return "Riesgo medio";
  }
  return "Riesgo moderado";
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
}

function standardDeviation(values) {
  if (values.length < 2) {
    return 0;
  }
  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function sliceSeries(series, range) {
  if (range === "MAX") {
    return series;
  }
  return series.slice(range === "12M" ? -12 : -24);
}

function buildStats(points) {
  const values = points.map((item) => item.value);
  const firstValue = values[0] || 0;
  const lastValue = values[values.length - 1] || 0;
  return {
    lastValue,
    changePct: firstValue ? (lastValue - firstValue) / firstValue : 0,
    maxValue: Math.max(...values),
    minValue: Math.min(...values)
  };
}

function renderChart(points, asset) {
  if (points.length < 2) {
    return '<div class="hd-empty-copy">No hay datos suficientes para dibujar el gráfico.</div>';
  }

  const width = 920;
  const height = 280;
  const padding = 22;
  const values = points.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const coordinates = points.map((point, index) => {
    const x = padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.value - minValue) / valueRange) * (height - padding * 2);
    return [x, y];
  });

  const linePath = coordinates.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  return `
    <div class="hd-simple-chart-wrap">
      <svg viewBox="0 0 ${width} ${height}" class="hd-simple-chart" role="img" aria-label="Gráfico histórico de ${asset.name}">
        <defs>
          <linearGradient id="hdAreaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(12,107,88,0.32)"></stop>
            <stop offset="100%" stop-color="rgba(12,107,88,0.03)"></stop>
          </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#hdAreaGradient)"></path>
        <path d="${linePath}" fill="none" stroke="#0c6b58" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
        ${coordinates.map(([x, y], index) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4" fill="#0c6b58"><title>${points[index].date}: ${formatPrice(points[index].value, asset.currency)}</title></circle>`).join("")}
      </svg>
      <div class="hd-simple-axis">
        <span>${points[0].date}</span>
        <span>${formatPrice(minValue, asset.currency)}</span>
        <span>${formatPrice(maxValue, asset.currency)}</span>
        <span>${points[points.length - 1].date}</span>
      </div>
    </div>
  `;
}

function buildRows(points, currency) {
  return points.slice().reverse().slice(0, 8).map((point, index, rows) => {
    const previous = rows[index + 1]?.value ?? point.value;
    const variation = previous ? (point.value - previous) / previous : 0;
    return `
      <tr>
        <td>${point.date}</td>
        <td>${formatPrice(point.value, currency)}</td>
        <td class="${variation >= 0 ? "is-positive" : "is-negative"}">${formatPercent(variation)}</td>
      </tr>
    `;
  }).join("");
}

function formatPrice(value, currency) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 2 : 4
  }).format(value);
}

function formatPercent(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    maximumFractionDigits: 2,
    signDisplay: "exceptZero"
  }).format(value);
}
