const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatKg(value: number): string {
  return `${formatNumber(value)} kg`
}

/** Signed weight delta, e.g. "+0.8 kg" / "-1.2 kg". */
export function formatWeightChange(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatNumber(Math.abs(value))} kg`
}

export function formatCalories(value: number): string {
  return `${formatNumber(Math.round(value))}`
}

export function formatGrams(value: number): string {
  return `${formatNumber(Math.round(value))}g`
}

export function formatMinutes(value: number): string {
  return `${formatNumber(Math.round(value))} min`
}

/** "1 set" / "3 sets". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
