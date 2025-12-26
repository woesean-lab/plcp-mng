import { STOCK_STATUS } from "../constants/appConstants"

export const getStockStatus = (stock) =>
  stock?.status === STOCK_STATUS.used ? STOCK_STATUS.used : STOCK_STATUS.available

export const splitStocks = (stocks) => {
  const list = Array.isArray(stocks) ? stocks : []
  const available = []
  const used = []
  list.forEach((stock) => {
    if (getStockStatus(stock) === STOCK_STATUS.used) {
      used.push(stock)
    } else {
      available.push(stock)
    }
  })
  return { available, used }
}
