import { defineComponent } from "../../vendor/vue.esm-browser.prod.js";
import { formatPercent, formatPrice } from "../utils/marketMath.js";

export const MetricsCards = defineComponent({
  name: "MetricsCards",
  props: {
    comparisonSeries: {
      type: Array,
      required: true
    }
  },
  methods: {
    formatPercent,
    formatPrice
  },
  template: `
    <section class="hd-metrics-grid">
      <article v-for="entry in comparisonSeries" :key="entry.profile.symbol" class="hd-metric-card">
        <div class="hd-metric-header">
          <div>
            <p class="hd-kicker">{{ entry.profile.type }}</p>
            <h4>{{ entry.profile.symbol }}</h4>
          </div>
          <span>{{ entry.profile.currency }}</span>
        </div>
        <dl class="hd-metric-list">
          <div>
            <dt>Rentabilidad</dt>
            <dd :class="{ 'is-positive': entry.metrics.accumulatedReturn >= 0, 'is-negative': entry.metrics.accumulatedReturn < 0 }">
              {{ formatPercent(entry.metrics.accumulatedReturn) }}
            </dd>
          </div>
          <div>
            <dt>Volatilidad</dt>
            <dd>{{ formatPercent(entry.metrics.annualizedVolatility) }}</dd>
          </div>
          <div>
            <dt>Drawdown máx.</dt>
            <dd class="is-negative">{{ formatPercent(entry.metrics.drawdown) }}</dd>
          </div>
          <div>
            <dt>Máximo</dt>
            <dd>{{ formatPrice(entry.metrics.maxClose, entry.profile.currency) }}</dd>
          </div>
          <div>
            <dt>Mínimo</dt>
            <dd>{{ formatPrice(entry.metrics.minClose, entry.profile.currency) }}</dd>
          </div>
          <div>
            <dt>Último cierre</dt>
            <dd>{{ formatPrice(entry.metrics.lastClose, entry.profile.currency) }}</dd>
          </div>
        </dl>
      </article>
    </section>
  `
});
