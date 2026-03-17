import { defineComponent } from "../../vendor/vue.esm-browser.prod.js";

export const RangeSelector = defineComponent({
  name: "RangeSelector",
  props: {
    modelValue: {
      type: String,
      required: true
    },
    options: {
      type: Array,
      required: true
    }
  },
  emits: ["update:modelValue"],
  template: `
    <div class="hd-range-selector" role="tablist" aria-label="Selector de rango temporal">
      <button
        v-for="option in options"
        :key="option"
        type="button"
        class="hd-pill"
        :class="{ 'is-active': option === modelValue }"
        @click="$emit('update:modelValue', option)"
      >
        {{ option }}
      </button>
    </div>
  `
});
