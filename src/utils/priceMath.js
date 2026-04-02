const normalizeFractionDigits = (value, fallback = 2) => {
  const digits = Number(value)
  if (!Number.isInteger(digits) || digits < 0 || digits > 10) return fallback
  return digits
}

export const roundPriceNumber = (value, fractionDigits = 2) => {
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) return Number.NaN
  return Number(normalized.toFixed(normalizeFractionDigits(fractionDigits)))
}

export const formatRoundedPriceNumber = (value, fractionDigits = 2) => {
  const digits = normalizeFractionDigits(fractionDigits)
  const normalized = roundPriceNumber(value, digits)
  if (!Number.isFinite(normalized)) return ""
  return normalized.toFixed(digits)
}

export const calculateRoundedPriceResult = (base, multiplier, fractionDigits = 2) => {
  const normalizedBase = Number(base)
  const normalizedMultiplier = Number(multiplier)
  if (!Number.isFinite(normalizedBase) || !Number.isFinite(normalizedMultiplier)) {
    return Number.NaN
  }
  return roundPriceNumber(normalizedBase * normalizedMultiplier, fractionDigits)
}

export const normalizePricePayloadValues = (value = {}, fractionDigits = 2) => ({
  base: roundPriceNumber(value?.base, fractionDigits),
  percent: roundPriceNumber(value?.percent, fractionDigits),
  result: roundPriceNumber(value?.result, fractionDigits),
})
