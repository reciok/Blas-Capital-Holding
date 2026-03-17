import {
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from "../../vendor/vue.esm-browser.prod.js";
import { formatCompactNumber, formatPercent, formatPrice } from "../utils/marketMath.js";

const CHART_COLORS = ["#0c6b58", "#ff8a3d", "#245dff"];

export const HistoricalChart = defineComponent({
  name: "HistoricalChart",
  props: {
    chartType: {
      type: String,
      required: true
    },
    comparisonSeries: {
      type: Array,
      required: true
    },
    monthlyReturns: {
      type: Array,
      required: true
    },
    primaryProfile: {
      type: Object,
      default: null
    },
    primarySeries: {
      type: Array,
      required: true
    },
    indicators: {
      type: Object,
      required: true
    },
    theme: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const chartEl = ref(null);
    const chartError = ref("");
    let chart = null;

    onMounted(async () => {
      await nextTick();
      if (!window.echarts) {
        chartError.value = "ECharts no está disponible en esta carga.";
        return;
      }
      chart = window.echarts.init(chartEl.value);
      renderChart();
      window.addEventListener("resize", handleResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", handleResize);
      if (chart) {
        chart.dispose();
      }
    });

    watch(
      () => [props.chartType, props.comparisonSeries, props.primarySeries, props.monthlyReturns, props.indicators, props.theme],
      () => renderChart(),
      { deep: true }
    );

    function handleResize() {
      chart?.resize();
    }

    function renderChart() {
      if (!chart) {
        return;
      }
      chart.setOption(buildOption(props), true);
    }

    return {
      chartEl,
      chartError
    };
  },
  template: `
    <div class="hd-chart-card hd-panel">
      <div class="hd-panel-head hd-chart-head">
        <div>
          <p class="hd-kicker">Visualización interactiva</p>
          <h4>{{ chartType === 'line' ? 'Comparativa normalizada' : chartType === 'candlestick' ? 'Velas OHLC' : 'Barras de retorno mensual' }}</h4>
        </div>
        <span>{{ primaryProfile ? primaryProfile.symbol : 'Sin activo' }}</span>
      </div>
      <div v-if="chartError" class="hd-empty-copy">{{ chartError }}</div>
      <div ref="chartEl" class="hd-chart-canvas"></div>
    </div>
  `
});

function buildOption(props) {
  const isDark = props.theme === "dark";
  const palette = {
    background: isDark ? "#07111b" : "#fbfdff",
    text: isDark ? "#dceaf9" : "#173454",
    muted: isDark ? "#8fa7bf" : "#60758d",
    border: isDark ? "rgba(144, 170, 194, 0.18)" : "rgba(98, 122, 147, 0.16)",
    tooltip: isDark ? "rgba(10, 18, 28, 0.96)" : "rgba(255, 255, 255, 0.96)"
  };

  const baseOption = {
    backgroundColor: "transparent",
    animationDuration: 650,
    animationEasing: "cubicOut",
    color: CHART_COLORS,
    grid: { left: 52, right: 24, top: 38, bottom: 58 },
    legend: {
      top: 4,
      textStyle: { color: palette.text }
    },
    tooltip: {
      trigger: props.chartType === "line" ? "axis" : "item",
      backgroundColor: palette.tooltip,
      borderColor: palette.border,
      borderWidth: 1,
      textStyle: { color: palette.text },
      extraCssText: "backdrop-filter: blur(10px); border-radius: 14px;",
      formatter: (params) => formatTooltip(params, props)
    },
    xAxis: {
      type: "category",
      boundaryGap: props.chartType !== "line",
      axisLine: { lineStyle: { color: palette.border } },
      axisLabel: { color: palette.muted, hideOverlap: true }
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: palette.border } },
      axisLabel: { color: palette.muted }
    }
  };

  if (props.chartType === "candlestick") {
    return {
      ...baseOption,
      xAxis: {
        ...baseOption.xAxis,
        data: props.primarySeries.map((item) => item.date)
      },
      yAxis: {
        ...baseOption.yAxis,
        scale: true,
        axisLabel: {
          color: palette.muted,
          formatter: (value) => formatPrice(value, props.primaryProfile?.currency || "EUR")
        }
      },
      series: [
        {
          name: props.primaryProfile?.symbol || "Activo",
          type: "candlestick",
          itemStyle: {
            color: "#0c6b58",
            color0: "#d85b45",
            borderColor: "#0c6b58",
            borderColor0: "#d85b45"
          },
          data: props.primarySeries.map((item) => [item.open, item.close, item.low, item.high])
        },
        {
          name: "SMA 20",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 1.8,
            color: "#ffb16a"
          },
          data: props.indicators.sma20Series.map((item) => item.value === null ? null : Number(item.value.toFixed(2)))
        },
        {
          name: "SMA 50",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 1.8,
            color: "#82a8ff"
          },
          data: props.indicators.sma50Series.map((item) => item.value === null ? null : Number(item.value.toFixed(2)))
        }
      ]
    };
  }

  if (props.chartType === "bar") {
    return {
      ...baseOption,
      xAxis: {
        ...baseOption.xAxis,
        data: props.monthlyReturns.map((item) => item.month)
      },
      yAxis: {
        ...baseOption.yAxis,
        axisLabel: {
          color: palette.muted,
          formatter: (value) => `${value.toFixed(1)}%`
        }
      },
      series: [
        {
          name: `Retorno mensual ${props.primaryProfile?.symbol || ''}`.trim(),
          type: "bar",
          data: props.monthlyReturns.map((item) => ({
            value: Number(item.returnPct.toFixed(2)),
            itemStyle: {
              color: item.returnPct >= 0 ? "#0c6b58" : "#d85b45",
              borderRadius: [10, 10, 0, 0]
            }
          })),
          emphasis: {
            focus: "series"
          }
        }
      ]
    };
  }

  const dates = props.comparisonSeries[0]?.normalized.map((item) => item.date) ?? [];
  return {
    ...baseOption,
    xAxis: {
      ...baseOption.xAxis,
      data: dates
    },
    yAxis: {
      ...baseOption.yAxis,
      axisLabel: {
        color: palette.muted,
        formatter: (value) => `${value.toFixed(0)}`
      }
    },
    series: props.comparisonSeries.map((entry, index) => ({
      name: entry.profile.symbol,
      type: "line",
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 2.6
      },
      areaStyle: index === 0
        ? {
            opacity: isDark ? 0.15 : 0.08
          }
        : undefined,
      data: entry.normalized.map((item) => Number(item.value.toFixed(2)))
    }))
  };
}

function formatTooltip(params, props) {
  if (props.chartType === "candlestick") {
    const point = props.primarySeries[params.dataIndex];
    if (!point) {
      return "";
    }

    return [
      `<strong>${props.primaryProfile?.symbol || 'Activo'}</strong> · ${point.date}`,
      `Apertura: ${formatPrice(point.open, props.primaryProfile?.currency || 'EUR')}`,
      `Máximo: ${formatPrice(point.high, props.primaryProfile?.currency || 'EUR')}`,
      `Mínimo: ${formatPrice(point.low, props.primaryProfile?.currency || 'EUR')}`,
      `Cierre ajustado: ${formatPrice(point.adjustedClose, props.primaryProfile?.currency || 'EUR')}`,
      `Volumen: ${formatCompactNumber(point.volume)}`
    ].join("<br>");
  }

  if (props.chartType === "bar") {
    const item = props.monthlyReturns[params.dataIndex];
    if (!item) {
      return "";
    }
    return [
      `<strong>${props.primaryProfile?.symbol || 'Activo'}</strong> · ${item.month}`,
      `Retorno mensual: ${formatPercent(item.returnPct / 100)}`
    ].join("<br>");
  }

  const rows = Array.isArray(params) ? params : [params];
  const date = rows[0]?.axisValueLabel || rows[0]?.name || "";
  const content = rows.map((row) => `${row.marker}${row.seriesName}: <strong>${row.value.toFixed(2)}</strong>`).join("<br>");
  return `<strong>${date}</strong><br>Base 100 normalizada<br>${content}`;
}
