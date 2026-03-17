import { computed, defineComponent, ref, watch } from "../../vendor/vue.esm-browser.prod.js";
import { downloadCsv } from "../utils/exportCsv.js";
import { formatCompactNumber, formatPrice } from "../utils/marketMath.js";

export const DataTable = defineComponent({
  name: "DataTable",
  props: {
    rows: {
      type: Array,
      required: true
    },
    symbol: {
      type: String,
      required: true
    },
    currency: {
      type: String,
      default: "EUR"
    }
  },
  setup(props) {
    const page = ref(1);
    const pageSize = 18;

    watch(
      () => props.rows.length,
      () => {
        page.value = 1;
      }
    );

    const pagedRows = computed(() => {
      const start = (page.value - 1) * pageSize;
      return props.rows.slice(start, start + pageSize);
    });

    const totalPages = computed(() => Math.max(1, Math.ceil(props.rows.length / pageSize)));

    function exportTable() {
      downloadCsv(`${props.symbol.toLowerCase()}-historico.csv`, props.rows);
    }

    function nextPage() {
      page.value = Math.min(totalPages.value, page.value + 1);
    }

    function previousPage() {
      page.value = Math.max(1, page.value - 1);
    }

    return {
      exportTable,
      formatCompactNumber,
      formatPrice,
      nextPage,
      pagedRows,
      page,
      previousPage,
      totalPages
    };
  },
  template: `
    <section class="hd-panel hd-table-card">
      <div class="hd-panel-head">
        <div>
          <p class="hd-kicker">Tabla descargable</p>
          <h4>Serie OHLCV de {{ symbol }}</h4>
        </div>
        <button type="button" class="hd-download-btn" @click="exportTable">Descargar CSV</button>
      </div>

      <div class="hd-table-wrap">
        <table class="hd-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Apertura</th>
              <th>Máximo</th>
              <th>Mínimo</th>
              <th>Cierre</th>
              <th>Adj. cierre</th>
              <th>Volumen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pagedRows" :key="row.date">
              <td>{{ row.date }}</td>
              <td>{{ formatPrice(row.open, currency) }}</td>
              <td>{{ formatPrice(row.high, currency) }}</td>
              <td>{{ formatPrice(row.low, currency) }}</td>
              <td>{{ formatPrice(row.close, currency) }}</td>
              <td>{{ formatPrice(row.adjustedClose, currency) }}</td>
              <td>{{ formatCompactNumber(row.volume) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="hd-table-footer">
        <button type="button" class="hd-secondary-btn" @click="previousPage">Anterior</button>
        <span>Página {{ page }} de {{ totalPages }}</span>
        <button type="button" class="hd-secondary-btn" @click="nextPage">Siguiente</button>
      </div>
    </section>
  `
});
