import {
  computed,
  onMounted,
  ref,
  watch
} from "../../vendor/vue.esm-browser.prod.js";
import {
  DATA_PROVIDERS,
  getAssetProfiles,
  getAssetsDataWithProvider,
  getMarketNarrative
} from "../services/historicalDataService.js";
import {
  buildTechnicalIndicators,
  calculateMetrics,
  CHART_TYPES,
  normalizeSeries,
  RANGE_OPTIONS,
  resampleMonthlyReturns
} from "../utils/marketMath.js";

const STORAGE_KEY = "blas-historical-preferences";

export function useHistoricalData() {
  const loading = ref(true);
  const refreshing = ref(false);
  const error = ref("");
  const profiles = ref([]);
  const selectedSymbols = ref(["CSPX", "VWCE"]);
  const primarySymbol = ref("CSPX");
  const range = ref("1Y");
  const chartType = ref("line");
  const search = ref("");
  const dataset = ref({});
  const provider = ref("mock");
  const draftProvider = ref("mock");
  const apiKey = ref("");
  const draftApiKey = ref("");
  const providerStatuses = ref({});

  const filteredProfiles = computed(() => {
    const query = search.value.trim().toLowerCase();
    if (!query) {
      return profiles.value;
    }

    return profiles.value.filter((profile) => {
      const haystack = `${profile.symbol} ${profile.name} ${profile.type} ${profile.region}`.toLowerCase();
      return haystack.includes(query);
    });
  });

  const activeProfiles = computed(() => profiles.value.filter((profile) => selectedSymbols.value.includes(profile.symbol)));
  const primarySeries = computed(() => dataset.value[primarySymbol.value] ?? []);
  const comparisonSeries = computed(() => {
    return activeProfiles.value.map((profile) => ({
      profile,
      candles: dataset.value[profile.symbol] ?? [],
      normalized: normalizeSeries(dataset.value[profile.symbol] ?? []),
      metrics: calculateMetrics(dataset.value[profile.symbol] ?? [])
    }));
  });
  const tableRows = computed(() => primarySeries.value.slice().reverse());
  const monthlyReturns = computed(() => resampleMonthlyReturns(primarySeries.value));
  const narrative = computed(() => getMarketNarrative(primarySeries.value));
  const indicators = computed(() => buildTechnicalIndicators(primarySeries.value));
  const primaryStatus = computed(() => providerStatuses.value[primarySymbol.value] || null);
  const providerStatusList = computed(() => {
    return activeProfiles.value.map((profile) => ({
      profile,
      status: providerStatuses.value[profile.symbol] || null
    }));
  });
  const providerMeta = computed(() => {
    const statuses = Object.values(providerStatuses.value);
    const liveCount = statuses.filter((item) => item?.source === "live").length;
    const mockCount = statuses.filter((item) => item?.source !== "live").length;
    const activeProvider = DATA_PROVIDERS.find((item) => item.id === provider.value) || DATA_PROVIDERS[0];

    if (provider.value === "alphaVantage" && !apiKey.value) {
      return {
        summaryLabel: "Sin clave API: fallback local",
        detailLabel: "Proveedor remoto configurado sin clave",
        activeProvider
      };
    }

    return {
      summaryLabel: liveCount ? `${liveCount} serie${liveCount > 1 ? "s" : ""} en vivo` : "Mock local activo",
      detailLabel: mockCount ? `${mockCount} activo${mockCount > 1 ? "s" : ""} con fallback` : activeProvider.label,
      activeProvider
    };
  });

  onMounted(load);

  watch([selectedSymbols, primarySymbol, range], reloadDataset, { deep: true });
  watch([selectedSymbols, primarySymbol, range, chartType, provider], persistPreferences, { deep: true });

  async function load() {
    loading.value = true;
    error.value = "";

    try {
      hydratePreferences();
      profiles.value = await getAssetProfiles();
      await reloadDataset();
    } catch (loadError) {
      error.value = loadError instanceof Error ? loadError.message : "No se pudo cargar el módulo histórico.";
    } finally {
      loading.value = false;
    }
  }

  async function reloadDataset() {
    if (!selectedSymbols.value.length) {
      dataset.value = {};
      providerStatuses.value = {};
      return;
    }

    const isInitialLoad = loading.value;
    refreshing.value = !isInitialLoad;
    error.value = "";

    try {
      const uniqueSymbols = [...new Set([primarySymbol.value, ...selectedSymbols.value])].slice(0, 3);
      selectedSymbols.value = uniqueSymbols;
      if (!selectedSymbols.value.includes(primarySymbol.value)) {
        primarySymbol.value = selectedSymbols.value[0];
      }

      const response = await getAssetsDataWithProvider(selectedSymbols.value, range.value, {
        provider: provider.value,
        apiKey: apiKey.value
      });

      dataset.value = response.dataset;
      providerStatuses.value = response.statuses;
    } catch (loadError) {
      error.value = loadError instanceof Error ? loadError.message : "No se pudo actualizar el conjunto de datos.";
    } finally {
      refreshing.value = false;
    }
  }

  function setPrimary(symbol) {
    primarySymbol.value = symbol;
    if (!selectedSymbols.value.includes(symbol)) {
      selectedSymbols.value = [symbol, ...selectedSymbols.value].slice(0, 3);
    }
  }

  function toggleSymbol(symbol) {
    const exists = selectedSymbols.value.includes(symbol);

    if (exists && selectedSymbols.value.length === 1) {
      return;
    }

    if (exists) {
      selectedSymbols.value = selectedSymbols.value.filter((current) => current !== symbol);
      if (primarySymbol.value === symbol) {
        primarySymbol.value = selectedSymbols.value[0] || "";
      }
      return;
    }

    if (selectedSymbols.value.length >= 3) {
      selectedSymbols.value = [...selectedSymbols.value.slice(1), symbol];
      primarySymbol.value = selectedSymbols.value[0];
      return;
    }

    selectedSymbols.value = [...selectedSymbols.value, symbol];
  }

  function hydratePreferences() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const saved = JSON.parse(raw);
      selectedSymbols.value = Array.isArray(saved.selectedSymbols) ? saved.selectedSymbols.slice(0, 3) : selectedSymbols.value;
      primarySymbol.value = saved.primarySymbol || primarySymbol.value;
      range.value = RANGE_OPTIONS.includes(saved.range) ? saved.range : range.value;
      chartType.value = CHART_TYPES.includes(saved.chartType) ? saved.chartType : chartType.value;
      provider.value = saved.provider === "alphaVantage" ? "alphaVantage" : "mock";
      draftProvider.value = provider.value;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function persistPreferences() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedSymbols: selectedSymbols.value,
        primarySymbol: primarySymbol.value,
        range: range.value,
        chartType: chartType.value,
        provider: provider.value
      })
    );
  }

  async function applyProviderSettings() {
    provider.value = draftProvider.value;
    apiKey.value = draftProvider.value === "alphaVantage" ? draftApiKey.value.trim() : "";
    await reloadDataset();
  }

  return {
    activeProfiles,
    applyProviderSettings,
    chartType,
    chartTypes: CHART_TYPES,
    comparisonSeries,
    draftApiKey,
    draftProvider,
    error,
    filteredProfiles,
    indicators,
    loading,
    monthlyReturns,
    narrative,
    primarySeries,
    primaryStatus,
    primarySymbol,
    profiles,
    provider,
    providerMeta,
    providerOptions: DATA_PROVIDERS,
    providerStatusList,
    range,
    rangeOptions: RANGE_OPTIONS,
    refreshing,
    search,
    selectedSymbols,
    setPrimary,
    tableRows,
    toggleSymbol
  };
}
