import { ref, watch } from "../../vendor/vue.esm-browser.prod.js";

const STORAGE_KEY = "blas-historical-theme";

export function useTheme() {
  const theme = ref(localStorage.getItem(STORAGE_KEY) || "light");

  watch(
    theme,
    (value) => {
      localStorage.setItem(STORAGE_KEY, value);
      const root = document.getElementById("historicalDataModule");
      if (root) {
        root.dataset.theme = value;
      }
    },
    { immediate: true }
  );

  function toggleTheme() {
    theme.value = theme.value === "light" ? "dark" : "light";
  }

  return {
    theme,
    toggleTheme
  };
}
