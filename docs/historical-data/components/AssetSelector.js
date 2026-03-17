import { defineComponent } from "../../vendor/vue.esm-browser.prod.js";

export const AssetSelector = defineComponent({
  name: "AssetSelector",
  props: {
    filteredProfiles: {
      type: Array,
      required: true
    },
    search: {
      type: String,
      required: true
    },
    selectedSymbols: {
      type: Array,
      required: true
    },
    primarySymbol: {
      type: String,
      required: true
    }
  },
  emits: ["update:search", "toggle-symbol", "set-primary"],
  template: `
    <section class="hd-panel hd-panel-selector">
      <div class="hd-panel-head">
        <div>
          <p class="hd-kicker">Selección de activos</p>
          <h4>Compara hasta 3 activos</h4>
        </div>
        <span class="hd-badge">{{ selectedSymbols.length }}/3</span>
      </div>

      <label class="hd-search-wrap">
        <span>Buscador</span>
        <input
          class="hd-search"
          type="search"
          :value="search"
          placeholder="ETF, índice, acción o región"
          @input="$emit('update:search', $event.target.value)"
        />
      </label>

      <div class="hd-selected-list" aria-live="polite">
        <button
          v-for="symbol in selectedSymbols"
          :key="symbol"
          type="button"
          class="hd-selected-chip"
          :class="{ 'is-primary': symbol === primarySymbol }"
          @click="$emit('set-primary', symbol)"
        >
          {{ symbol }}
          <small>{{ symbol === primarySymbol ? 'Principal' : 'Comparar' }}</small>
        </button>
      </div>

      <div class="hd-asset-list">
        <article
          v-for="profile in filteredProfiles"
          :key="profile.symbol"
          class="hd-asset-card"
          :class="{
            'is-selected': selectedSymbols.includes(profile.symbol),
            'is-primary': primarySymbol === profile.symbol
          }"
        >
          <div class="hd-asset-card-top">
            <div>
              <strong>{{ profile.symbol }}</strong>
              <span>{{ profile.type }} · {{ profile.region }}</span>
            </div>
            <button
              type="button"
              class="hd-asset-toggle"
              @click="$emit('toggle-symbol', profile.symbol)"
            >
              {{ selectedSymbols.includes(profile.symbol) ? 'Quitar' : 'Añadir' }}
            </button>
          </div>
          <h5>{{ profile.name }}</h5>
          <p>{{ profile.description }}</p>
          <div class="hd-asset-actions">
            <button
              type="button"
              class="hd-secondary-btn"
              @click="$emit('set-primary', profile.symbol)"
            >
              Usar como principal
            </button>
            <span>{{ profile.currency }} · {{ profile.exchange }}</span>
          </div>
        </article>
      </div>
    </section>
  `
});
