import type { Invoice } from '@/types/invoice'
import type { Currency, EquipmentType, TransportMode } from '@/types/logistics'
import type { Quotation } from '@/types/quotation'
import type { Shipment, ShipmentEvent } from '@/types/shipment'

/*
 * Архив завершённых перевозок за прошлые полгода (апрель–сентябрь 2026).
 * Нужен, чтобы в аналитике были тренды, а в таблицах — история как в живой системе.
 * Генерируется детерминированно: при каждой загрузке одни и те же данные.
 */

// Простой генератор псевдослучайных чисел с зерном (mulberry32)
function random(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

type Lane = {
  customer: string
  from: string
  to: string
  mode: TransportMode
  equipment: EquipmentType
  vendorId: string
  goods: string
  currency: Currency
  // Базовая ставка за единицу транспорта (контейнер, машину или рейс)
  base: number
}

const lanes: Lane[] = [
  {
    customer: 'Huawei',
    from: 'Shanghai',
    to: 'Ashgabat',
    mode: 'air',
    equipment: 'Air',
    vendorId: 'v1',
    goods: 'Telecom equipment',
    currency: 'USD',
    base: 6200,
  },
  {
    customer: 'Huawei',
    from: 'Xian',
    to: 'Ashgabat',
    mode: 'rail',
    equipment: '40 HQ',
    vendorId: 'v7',
    goods: 'Network cabinets',
    currency: 'USD',
    base: 5400,
  },
  {
    customer: 'Hyundai',
    from: 'Busan',
    to: 'Mary',
    mode: 'sea',
    equipment: '40 HQ',
    vendorId: 'v3',
    goods: 'Auto parts',
    currency: 'USD',
    base: 4800,
  },
  {
    customer: 'DHL',
    from: 'Ashgabat',
    to: 'Abu Dhabi',
    mode: 'air',
    equipment: 'Air',
    vendorId: 'v2',
    goods: 'Express parcels',
    currency: 'USD',
    base: 3900,
  },
  {
    customer: 'TBM',
    from: 'Samarkand',
    to: 'Manisa',
    mode: 'road',
    equipment: 'FTL',
    vendorId: 'v5',
    goods: 'Cotton yarn',
    currency: 'USD',
    base: 3600,
  },
  {
    customer: 'Hazar logistik ES',
    from: 'Turkmenbashi',
    to: 'Ashgabat',
    mode: 'road',
    equipment: 'FTL',
    vendorId: 'v4',
    goods: 'Building materials',
    currency: 'TMT',
    base: 9800,
  },
  {
    customer: 'Oguzabat',
    from: 'Ashgabat',
    to: 'Dashoguz',
    mode: 'road',
    equipment: 'FTL',
    vendorId: 'v4',
    goods: 'Food products',
    currency: 'TMT',
    base: 6500,
  },
  {
    customer: 'Oguzabat',
    from: 'Mersin',
    to: 'Ashgabat',
    mode: 'road',
    equipment: 'FTL',
    vendorId: 'v5',
    goods: 'Household goods',
    currency: 'USD',
    base: 4300,
  },
  {
    customer: 'Inditex Trading',
    from: 'Istanbul',
    to: 'Ashgabat',
    mode: 'road',
    equipment: 'FTL',
    vendorId: 'v5',
    goods: 'Garments',
    currency: 'EUR',
    base: 3900,
  },
  {
    customer: 'Promate Technologies',
    from: 'Jebel Ali',
    to: 'Ashgabat',
    mode: 'sea',
    equipment: '20 GP',
    vendorId: 'v3',
    goods: 'Consumer electronics',
    currency: 'USD',
    base: 3100,
  },
  {
    customer: 'Express Air Cargo',
    from: 'Tunis',
    to: 'Ashgabat',
    mode: 'air',
    equipment: 'Air',
    vendorId: 'v2',
    goods: 'Medical supplies',
    currency: 'EUR',
    base: 4100,
  },
  {
    customer: 'Bright Star Cargo',
    from: 'Taipei',
    to: 'Ashgabat',
    mode: 'sea',
    equipment: '40 HQ',
    vendorId: 'v8',
    goods: 'Machinery parts',
    currency: 'USD',
    base: 5200,
  },
  {
    customer: 'TBM',
    from: 'Ashgabat',
    to: 'Bandar Abbas',
    mode: 'rail',
    equipment: '40 HQ',
    vendorId: 'v6',
    goods: 'Cotton bales',
    currency: 'USD',
    base: 2900,
  },
]

// Сколько перевозок в каждом месяце: бизнес растёт
const months = [
  { month: '2026-04', count: 5 },
  { month: '2026-05', count: 6 },
  { month: '2026-06', count: 7 },
  { month: '2026-07', count: 8 },
  { month: '2026-08', count: 10 },
  { month: '2026-09', count: 12 },
]

const TODAY = '2026-10-15'
const transitDays: Record<TransportMode, number> = { air: 3, road: 12, rail: 18, sea: 32 }

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function build() {
  const rnd = random(2026)
  const pick = <T>(list: T[]) => list[Math.floor(rnd() * list.length)]!
  const quotations: Quotation[] = []
  const shipments: Shipment[] = []
  const invoices: Invoice[] = []
  let n = 101
  let inv = 1

  for (const { month, count } of months) {
    for (let i = 0; i < count; i++) {
      const lane = pick(lanes)
      const number = `AT${String(n).padStart(6, '0')}`
      const day = 1 + Math.floor(rnd() * 27)
      const created = `${month}-${String(day).padStart(2, '0')}`
      const qty = lane.mode === 'air' ? 1 : 1 + Math.floor(rnd() * 3)
      const income = Math.round(lane.base * qty * (0.85 + rnd() * 0.35))
      const marginShare = 0.07 + rnd() * 0.12
      const cost = Math.round(income * (1 - marginShare))
      const local = Math.round(income * 0.12)
      const weightKg = lane.mode === 'air' ? Math.round(400 + rnd() * 1600) : Math.round(qty * (14000 + rnd() * 8000))
      // Часть котировок не выигрываем — для конверсии в аналитике
      const lost = rnd() < 0.22

      quotations.push({
        id: `aq${n}`,
        reference: number,
        mode: lane.mode,
        status: lost ? 'failed' : 'completed',
        createdAt: created,
        validTo: addDays(created, 14),
        customer: lane.customer,
        customerAddress: '',
        contactPerson: '',
        collectionAddress: lane.from,
        deliveryAddress: lane.to,
        incoterm: lane.mode === 'sea' ? 'FOB' : 'EXW',
        movement: 'door_to_door',
        equipment: lane.equipment,
        transportQuantity: qty,
        weightKg,
        natureOfGoods: lane.goods,
        cargo: [],
        carrier: '',
        currency: lane.currency,
        transitTime: `${transitDays[lane.mode]} days`,
        paymentTerms: 'Net 30',
        charges: [
          {
            id: 'm',
            vendorId: lane.vendorId,
            chargeType: 'Freight',
            quantity: 1,
            rateIncome: income - local,
            rateCost: cost - Math.round(local * 0.8),
          },
          {
            id: 'l',
            chargeType: 'Local charges',
            quantity: 1,
            rateIncome: local,
            rateCost: Math.round(local * 0.8),
          },
        ],
      })

      if (!lost) {
        const orderDate = addDays(created, 1 + Math.floor(rnd() * 3))
        const etd = addDays(orderDate, 2)
        const eta = addDays(etd, transitDays[lane.mode])
        const history: ShipmentEvent[] = [
          { status: 'pending', at: `${orderDate}T10:00` },
          { status: 'loaded', at: `${etd}T09:00` },
          { status: 'in_transit', at: `${addDays(etd, 1)}T10:00` },
        ]
        if (lane.mode === 'road' || lane.mode === 'rail')
          history.push({ status: 'at_border', at: `${addDays(eta, -3)}T14:00` })
        history.push(
          { status: 'delivered', at: `${eta}T16:00` },
          { status: 'completed', at: `${addDays(eta, 2)}T11:00` },
        )
        // Что ещё не наступило, обрезаем: длинные морские перевозки сентября ещё в пути
        const past = history.filter((e) => e.at.slice(0, 10) <= TODAY)
        const status = past.at(-1)?.status ?? 'pending'
        const delivered = status === 'delivered' || status === 'completed'

        shipments.push({
          id: `as${n}`,
          number,
          quotationId: `aq${n}`,
          vendorId: lane.vendorId,
          mode: lane.mode,
          customer: lane.customer,
          collectionAddress: lane.from,
          deliveryAddress: lane.to,
          orderDate,
          etd,
          eta,
          equipment: lane.equipment,
          transportQuantity: qty,
          cargoDescription: '',
          weightKg,
          status,
          history: past.length ? past : history.slice(0, 1),
          documents: [],
        })

        // Доставленные выставляем после доставки, остальные — после отправки
        const invoiceDate = delivered ? addDays(eta, 2) : addDays(etd, 1)
        const dueDate = addDays(invoiceDate, 30)
        // Старые инвойсы оплачены, свежие — частично или ещё нет
        const recent = dueDate >= '2026-09-20'
        const paidShare = recent ? pick([0, 0.3, 0.5, 1]) : rnd() < 0.08 ? 0.5 : 1
        const paid = Math.round(income * paidShare)
        invoices.push({
          id: `ai${n}`,
          number: `INV-AT-${String(inv++).padStart(6, '0')}`,
          billTo: lane.customer,
          invoiceDate,
          terms: 'Net 30',
          dueDate,
          poNumber: number,
          projectName: `${orderDate.replaceAll('-', '.')}-${number}`,
          shipmentId: `as${n}`,
          currency: lane.currency,
          lines: [
            {
              item: 'Freight Forwarding Services',
              description: `${lane.mode === 'sea' ? 'FOB' : 'EXW'} ${lane.from} – DAP ${lane.to}`,
              quantity: 1,
              rate: income - local,
            },
            { item: 'Local charges', quantity: 1, rate: local },
          ],
          payments: [],
          discount: 0,
          paid,
          status: paid >= income ? 'paid' : dueDate < TODAY ? 'overdue' : paid > 0 ? 'partially_paid' : 'sent',
        })
      }
      n++
    }
  }
  return { quotations, shipments, invoices }
}

export const archive = build()
