# Módulo Datos Históricos

## Estructura recomendada

```text
historical-data/
  components/
    AssetSelector.js
    DataTable.js
    HistoricalChart.js
    MetricsCards.js
    RangeSelector.js
  composables/
    useHistoricalData.js
    useTheme.js
  data/
    assetProfiles.js
    historical-asset-profiles.json
    historical-sample-cspx.json
  services/
    historicalDataService.js
  utils/
    exportCsv.js
    marketMath.js
  historical-data.css
  main.js
```

## Resumen técnico

- `main.js`: monta la miniaplicación Vue 3 dentro de la sección `Datos Históricos`.
- `services/historicalDataService.js`: actúa como mock API local y también resuelve un proveedor real opcional con fallback por activo cuando falla la carga remota.
- `data/assetProfiles.js`: fuente de perfiles consumida en tiempo de ejecución para que el módulo funcione también al abrirse como archivo local.
- `composables/useHistoricalData.js`: centraliza el estado del módulo, filtros, comparador, persistencia, fuente de datos e indicadores técnicos.
- `components/*`: separan selector de activos, controles, gráfico, métricas y tabla descargable.
- `utils/*`: reúnen cálculos financieros, formateo, medias móviles, RSI, ATR y exportación CSV.
- `data/*`: contiene los perfiles base y un ejemplo explícito del formato histórico esperado.

## Fuente real opcional

- `Mock local` sigue siendo el modo por defecto y no requiere red ni servidor.
- `Alpha Vantage` puede activarse desde la UI con una API key del usuario.
- Si una serie real no está disponible, el módulo conserva la interfaz y usa fallback local para ese activo.
- Algunos ETFs e índices usan proxies líquidos en modo API para mantener cobertura razonable dentro de una arquitectura estática.
