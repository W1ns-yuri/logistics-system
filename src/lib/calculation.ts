import type { Charge, Quotation } from '@/types/quotation'

// Деньги по одной строке калькуляции
export function chargeTotals(charge: Charge) {
  const income = charge.rateIncome * charge.quantity
  const cost = charge.rateCost * charge.quantity
  const profit = income - cost
  return { income, cost, profit, margin: marginPercent(income, profit) }
}

// Итог по всей котировке: сумма всех строк
export function quotationTotals(quotation: Quotation) {
  const totals = quotation.charges.reduce(
    (acc, charge) => {
      const line = chargeTotals(charge)
      acc.income += line.income
      acc.cost += line.cost
      return acc
    },
    { income: 0, cost: 0 },
  )
  const profit = totals.income - totals.cost
  return { ...totals, profit, margin: marginPercent(totals.income, profit) }
}

// Маржа = прибыль / доход. Защита от деления на ноль, если строк ещё нет.
function marginPercent(income: number, profit: number) {
  return income === 0 ? 0 : (profit / income) * 100
}
