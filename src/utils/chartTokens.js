/**
 * Chart colours as literal values.
 *
 * Recharts paints SVG through props, not class names, so it cannot consume the
 * Tailwind tokens. These mirror tailwind.config.js exactly and exist so no
 * component hardcodes a hex inline — if the ramp changes, it changes here and
 * in the config, and nowhere else.
 */
export const CHART = {
  series: '#0A0A0A', // ink.950 — the single series
  grid: '#E5E5E5', // ink.200 — hairline, solid, recessive
  axisText: '#A3A3A3', // ink.400
  cursor: '#F5F5F5', // ink.100 — hover band behind the mark
  surface: '#FFFFFF',
}

export const AXIS_TICK = {
  fill: CHART.axisText,
  fontSize: 11,
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
}
