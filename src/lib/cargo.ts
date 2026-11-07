import type { CargoLine, Quotation } from '@/types/quotation'

/*
 * Груз и вес котировки.
 * В строке груза человек вводит размеры и вес ОДНОГО места, а итог строки считается сам:
 * объём = места × Д × Ш × В (см) / 1 000 000, вес = места × вес места.
 */

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits

// Объём одного места в м³ по размерам в сантиметрах (0, если какого-то размера нет)
export function pieceVolumeM3(line: Pick<CargoLine, 'lengthCm' | 'widthCm' | 'heightCm'>) {
  const { lengthCm = 0, widthCm = 0, heightCm = 0 } = line
  return (lengthCm * widthCm * heightCm) / 1_000_000
}

export const hasDimensions = (line: CargoLine) => !!(line.lengthCm && line.widthCm && line.heightCm)

// Пересчитываем итоги строки после любого изменения
export function withLineTotals(line: CargoLine): CargoLine {
  const pieces = Math.max(1, Math.floor(line.pieces) || 1)
  const next = { ...line, pieces }
  if (hasDimensions(next)) {
    next.volumeM3 = round(pieces * pieceVolumeM3(next), 3)
    next.dimensions = `${next.lengthCm} x ${next.widthCm} x ${next.heightCm} cm`
  }
  if (next.weightPerPieceKg != null) next.weightKg = round(pieces * next.weightPerPieceKg, 2)
  return next
}

// Старые строки хранили размеры текстом «120 x 80 x 100 cm» и общий вес строки — раскладываем по полям
export function upgradeCargoLine(line: CargoLine): CargoLine {
  if (line.lengthCm != null || line.weightPerPieceKg != null) return line
  const pieces = Math.max(1, Math.floor(line.pieces) || 1)
  const match = /(\d+(?:[.,]\d+)?)\s*[x×*х]\s*(\d+(?:[.,]\d+)?)\s*[x×*х]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?/i.exec(
    line.dimensions ?? '',
  )
  const factor = { mm: 0.1, cm: 1, m: 100 }[(match?.[4] ?? 'cm').toLowerCase() as 'mm' | 'cm' | 'm']
  const size = (i: number) => (match ? round(Number(match[i]!.replace(',', '.')) * factor, 1) : undefined)
  return {
    ...line,
    pieces,
    lengthCm: size(1),
    widthCm: size(2),
    heightCm: size(3),
    weightPerPieceKg: line.weightKg ? round(line.weightKg / pieces, 2) : undefined,
  }
}

// Старые котировки хранили только общий вес — вес на единицу транспорта получаем делением
export function upgradeQuotationCargo<
  Q extends Pick<Quotation, 'cargo' | 'weightKg' | 'transportQuantity'> & {
    weightPerUnitKg?: number
  },
>(q: Q): Q {
  const cargo = (q.cargo ?? []).map(upgradeCargoLine)
  const quantity = Math.max(1, q.transportQuantity || 1)
  return {
    ...q,
    cargo,
    weightPerUnitKg: q.weightPerUnitKg ?? round((q.weightKg || 0) / quantity, 2),
  }
}

// Итоги по всем строкам груза
export function cargoTotals(cargo: CargoLine[]) {
  return cargo.reduce(
    (acc, line) => ({
      pieces: acc.pieces + (line.pieces || 0),
      weightKg: round(acc.weightKg + (line.weightKg || 0), 2),
      volumeM3: round(acc.volumeM3 + (line.volumeM3 || 0), 3),
    }),
    { pieces: 0, weightKg: 0, volumeM3: 0 },
  )
}

// Вес груза и вес по транспорту расходятся больше чем на полкило — подсвечиваем
export const weightsDiffer = (cargoKg: number, transportKg: number) =>
  cargoKg > 0 && Math.abs(cargoKg - transportKg) > 0.5
