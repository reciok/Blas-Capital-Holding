import { defineComponent } from "../../vendor/vue.esm-browser.prod.js";
import {
  formatCompactNumber,
  formatPercent,
  formatPrice
} from "../utils/marketMath.js";

export const TechnicalIndicators = defineComponent({
  name: "TechnicalIndicators",
  props: {
    indicators: {
      type: Object,
      required: true
    },
    primaryProfile: {
      type: Object,
      default: null
    },
    primaryStatus: {
      type: Object,
      default: null
    }
  },
  methods: {
    formatCompactNumber,
    formatPercent,
    formatPrice,
    toneForRsi(value) {
      if (value === null) {
        return "";
      }
      if (value >= 70) {
        return "is-negative";
      }
      if (value <= 30) {
        return "is-positive";
      }
      return "";
    },
    toneForTrend(value) {
      if (value === "Alcista") {
        return "is-positive";
      }
      if (value === "Bajista") {
        return "is-negative";
      }
      return "";
    },
    formatRsi(value) {
      return value === null ? "N/D" : value.toFixed(1);
    }
  },
  template: `
    <section class="hd-panel hd-indicators-panel">
      <div class="hd-panel-head">
        <div>
          <p class="hd-kicker">Indicadores técnicos</p>
          <h4>Lectura táctica del activo principal</h4>
        </div>
        <span>{{ primaryStatus && primaryStatus.source === 'live' ? 'Serie real' : 'Serie local' }}</span>
      </div>

      <div v-if="!indicators.latest" class="hd-empty-copy">
        No hay histórico suficiente para calcular indicadores.
      </div>

      <template v-else>
        <div class="hd-indicators-grid">
          <article class="hd-indicator-card">
            <span>Tendencia</span>
            <strong :class="toneForTrend(indicators.latest.trend)">{{ indicators.latest.trend }}</strong>
            <small>SMA20 vs SMA50</small>
          </article>
          <article class="hd-indicator-card">
            <span>RSI 14</span>
            <strong :class="toneForRsi(indicators.latest.rsi14)">{{ formatRsi(indicators.latest.rsi14) }}</strong>
            <small>Momentum de corto plazo</small>
          </article>
          <article class="hd-indicator-card">
            <span>ATR 14</span>
            <strong>{{ formatPrice(indicators.latest.atr14 || 0, primaryProfile ? primaryProfile.currency : 'EUR') }}</strong>
            <small>Rango medio verdadero</small>
          </article>
          <article class="hd-indicator-card">
            <span>Volumen rel. 20d</span>
            <strong :class="{ 'is-positive': indicators.latest.volumeRatio20 >= 1.25, 'is-negative': indicators.latest.volumeRatio20 <= 0.8 }">
              {{ indicators.latest.volumeRatio20.toFixed(2) }}x
            </strong>
            <small>Frente a media reciente</small>
          </article>
          <article class="hd-indicator-card">
            <span>Momentum 20d</span>
            <strong :class="{ 'is-positive': indicators.latest.momentum20 >= 0, 'is-negative': indicators.latest.momentum20 < 0 }">
              {{ formatPercent(indicators.latest.momentum20) }}
            </strong>
            <small>Variación desde hace 20 sesiones</small>
          </article>
          <article class="hd-indicator-card">
            <span>Volatilidad 20d</span>
            <strong>{{ formatPercent(indicators.latest.realizedVolatility20) }}</strong>
            <small>Anualizada</small>
          </article>
        </div>

        <div class="hd-indicator-details">
          <div class="hd-indicator-strip">
            <span>Precio vs SMA20</span>
            <strong :class="{ 'is-positive': indicators.latest.priceVsSma20 >= 0, 'is-negative': indicators.latest.priceVsSma20 < 0 }">
              {{ formatPercent(indicators.latest.priceVsSma20) }}
            </strong>
          </div>
          <div class="hd-indicator-strip">
            <span>Precio vs SMA50</span>
            <strong :class="{ 'is-positive': indicators.latest.priceVsSma50 >= 0, 'is-negative': indicators.latest.priceVsSma50 < 0 }">
              {{ formatPercent(indicators.latest.priceVsSma50) }}
            </strong>
          </div>
          <div class="hd-indicator-strip">
            <span>Media volumen 20d</span>
            <strong>{{ formatCompactNumber(indicators.latest.averageVolume20) }}</strong>
          </div>
          <div class="hd-indicator-strip">
            <span>EMA 20</span>
            <strong>{{ formatPrice(indicators.latest.ema20 || 0, primaryProfile ? primaryProfile.currency : 'EUR') }}</strong>
          </div>
        </div>

        <div class="hd-signal-list">
          <p v-for="signal in indicators.signals" :key="signal">{{ signal }}</p>
        </div>
      </template>
    </section>
  `
});
