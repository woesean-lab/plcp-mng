import { FORMULA_ERRORS } from "../constants/appConstants"

const LIST_NUMBER_FORMATTER = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 })
const LIST_PERCENT_FORMATTER = new Intl.NumberFormat("tr-TR", {
  style: "percent",
  maximumFractionDigits: 2,
})
const LIST_CURRENCY_FORMATTER = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
})
const LIST_DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR")

export const toColumnLabel = (index) => {
  let label = ""
  let current = index
  while (current >= 0) {
    label = String.fromCharCode(65 + (current % 26)) + label
    current = Math.floor(current / 26) - 1
  }
  return label
}

export const createEmptySheet = (rows, cols) => {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""))
}

export const errorValue = (code) => ({ error: code })

export const isErrorValue = (value) => Boolean(value && typeof value === "object" && "error" in value)

export const tokenizeFormula = (input) => {
  const tokens = []
  let index = 0
  while (index < input.length) {
    const char = input[index]
    if (/\s/.test(char)) {
      index += 1
      continue
    }
    if (/[0-9.]/.test(char)) {
      let start = index
      let hasDot = false
      while (index < input.length) {
        const current = input[index]
        if (current === ".") {
          if (hasDot) break
          hasDot = true
          index += 1
          continue
        }
        if (/[0-9]/.test(current)) {
          index += 1
          continue
        }
        break
      }
      const raw = input.slice(start, index)
      const numberValue = Number(raw)
      if (!Number.isFinite(numberValue)) {
        return { error: "number" }
      }
      tokens.push({ type: "number", value: numberValue })
      continue
    }
    if (/[A-Za-z]/.test(char)) {
      let start = index
      while (index < input.length && /[A-Za-z]/.test(input[index])) {
        index += 1
      }
      const letters = input.slice(start, index)
      let digitStart = index
      while (index < input.length && /[0-9]/.test(input[index])) {
        index += 1
      }
      const digits = input.slice(digitStart, index)
      if (digits) {
        tokens.push({ type: "cell", value: `${letters}${digits}` })
      } else {
        tokens.push({ type: "identifier", value: letters })
      }
      continue
    }
    if ("+-*/".includes(char)) {
      tokens.push({ type: "operator", value: char })
      index += 1
      continue
    }
    if ("(),:".includes(char)) {
      tokens.push({ type: "punct", value: char })
      index += 1
      continue
    }
    return { error: "invalid" }
  }
  return { tokens }
}

export const parseFormula = (input) => {
  const tokenResult = tokenizeFormula(input)
  if (tokenResult.error) return { error: tokenResult.error }
  const tokens = tokenResult.tokens
  let position = 0

  const peek = () => tokens[position]
  const consume = () => tokens[position++]
  const matchPunct = (value) => {
    const token = peek()
    if (token?.type === "punct" && token.value === value) {
      position += 1
      return true
    }
    return false
  }
  const expectPunct = (value) => {
    if (!matchPunct(value)) throw new Error("expected")
  }

  const parseExpression = () => {
    let node = parseTerm()
    while (true) {
      const token = peek()
      if (token?.type === "operator" && (token.value === "+" || token.value === "-")) {
        consume()
        node = { type: "binary", op: token.value, left: node, right: parseTerm() }
        continue
      }
      break
    }
    return node
  }

  const parseTerm = () => {
    let node = parseFactor()
    while (true) {
      const token = peek()
      if (token?.type === "operator" && (token.value === "*" || token.value === "/")) {
        consume()
        node = { type: "binary", op: token.value, left: node, right: parseFactor() }
        continue
      }
      break
    }
    return node
  }

  const parseFactor = () => {
    const token = peek()
    if (!token) throw new Error("unexpected")
    if (token.type === "operator" && token.value === "-") {
      consume()
      return { type: "unary", op: "-", value: parseFactor() }
    }
    if (token.type === "number") {
      consume()
      return { type: "number", value: token.value }
    }
    if (token.type === "cell") {
      consume()
      if (matchPunct(":")) {
        const endToken = peek()
        if (!endToken || endToken.type !== "cell") throw new Error("range")
        consume()
        return { type: "range", start: token.value, end: endToken.value }
      }
      return { type: "cell", value: token.value }
    }
    if (token.type === "identifier") {
      consume()
      if (matchPunct("(")) {
        const args = []
        if (!matchPunct(")")) {
          while (true) {
            args.push(parseExpression())
            if (matchPunct(",")) continue
            expectPunct(")")
            break
          }
        }
        return { type: "function", name: token.value, args }
      }
      throw new Error("identifier")
    }
    if (matchPunct("(")) {
      const node = parseExpression()
      expectPunct(")")
      return node
    }
    throw new Error("token")
  }

  try {
    const node = parseExpression()
    if (position !== tokens.length) throw new Error("trailing")
    return { node }
  } catch {
    return { error: "parse" }
  }
}

export const parseCellRef = (ref) => {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref)
  if (!match) return null
  const letters = match[1].toUpperCase()
  const row = Number.parseInt(match[2], 10) - 1
  if (!Number.isFinite(row) || row < 0) return null
  let col = 0
  for (let i = 0; i < letters.length; i += 1) {
    col = col * 26 + (letters.charCodeAt(i) - 64)
  }
  col -= 1
  if (col < 0) return null
  return { row, col }
}

export const formatCellValue = (value) => {
  if (isErrorValue(value)) return value.error
  if (Array.isArray(value)) return FORMULA_ERRORS.VALUE
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : FORMULA_ERRORS.VALUE
  return String(value)
}

export const formatListCellValue = (value, format = {}) => {
  if (!format || !format.type || format.type === "auto") return formatCellValue(value)
  if (isErrorValue(value) || Array.isArray(value)) return formatCellValue(value)
  if (value === null || value === undefined) return ""
  if (format.type === "date") {
    const dateValue = typeof value === "number" ? new Date(value) : new Date(String(value).trim())
    if (!Number.isNaN(dateValue.getTime())) {
      return LIST_DATE_FORMATTER.format(dateValue)
    }
    return formatCellValue(value)
  }
  const numericValue = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."))
  if (!Number.isFinite(numericValue)) return formatCellValue(value)
  if (format.type === "percent") return LIST_PERCENT_FORMATTER.format(numericValue)
  if (format.type === "currency") return LIST_CURRENCY_FORMATTER.format(numericValue)
  if (format.type === "number") return LIST_NUMBER_FORMATTER.format(numericValue)
  return formatCellValue(value)
}
