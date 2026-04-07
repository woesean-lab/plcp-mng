export const normalizeFlexibleNumberInput = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : ""
  }

  const raw = String(value ?? "").trim()
  if (!raw) return ""

  const compact = raw.replace(/\s+/g, "")
  const sign = compact.startsWith("-") ? "-" : ""
  const unsigned = /^[+-]/.test(compact) ? compact.slice(1) : compact

  if (!unsigned || !/^[\d.,]+$/.test(unsigned)) return ""

  const lastCommaIndex = unsigned.lastIndexOf(",")
  const lastDotIndex = unsigned.lastIndexOf(".")

  if (lastCommaIndex !== -1 && lastDotIndex !== -1) {
    const decimalSeparator = lastCommaIndex > lastDotIndex ? "," : "."
    const thousandsPattern = decimalSeparator === "," ? /\./g : /,/g
    return sign + unsigned.replace(thousandsPattern, "").replace(decimalSeparator, ".")
  }

  const separator = lastCommaIndex !== -1 ? "," : lastDotIndex !== -1 ? "." : ""
  if (!separator) return sign + unsigned

  const parts = unsigned.split(separator)
  if (parts.length === 2 && parts[0] === "" && parts[1]) {
    return sign + `0.${parts[1]}`
  }
  if (parts.length === 2 && parts[0] && parts[1] === "") {
    return sign + parts[0]
  }
  if (parts.some((part) => part === "")) return ""

  if (parts.length === 2) {
    if (parts[1].length <= 2) {
      return sign + `${parts[0]}.${parts[1]}`
    }
    return sign + parts.join("")
  }

  const integerParts = parts.slice(0, -1)
  const fractionalPart = parts[parts.length - 1]
  const looksLikeThousands =
    integerParts.every((part) => part.length > 0 && part.length <= 3) &&
    fractionalPart.length === 3

  if (looksLikeThousands) {
    return sign + parts.join("")
  }

  if (fractionalPart.length <= 2) {
    return sign + `${integerParts.join("")}.${fractionalPart}`
  }

  return sign + parts.join("")
}

export const parseFlexibleNumberInput = (value) => {
  const normalized = normalizeFlexibleNumberInput(value)
  if (!normalized) return Number.NaN
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}
