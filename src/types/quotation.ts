import type { Currency, EquipmentType, Incoterm, Movement, TransportMode } from './logistics'

export const QUOTATION_STATUSES = ['in_progress', 'shipment_created', 'completed', 'failed', 'cancelled'] as const
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number]

export type CargoLine = {
  pieces: number
  packageType: string
  natureOfGoods: string
  dimensions: string // "12 x 19 x 40 cm"
  weightKg: number
  volumeM3: number
}

// Строка калькуляции (вкладка Calculation): сколько берём с клиента и сколько платим вендору
export type Charge = {
  id: string
  orderType: string // Main carriage, Pre-carriage, Local charges...
  chargeType: string // AF – Airfreight, EXW local charges...
  quantity: number
  rateIncome: number
  rateCost: number
}

export type Quotation = {
  id: string
  reference: string // AT000001
  mode: TransportMode
  status: QuotationStatus
  createdAt: string // ISO-дата
  validTo?: string

  customer: string
  customerAddress: string
  contactPerson: string

  collectionAddress: string // Pick up location
  deliveryAddress: string
  portOfDeparture: string
  portOfDelivery: string
  incoterm: Incoterm
  movement: Movement

  equipment: EquipmentType
  transportQuantity: number
  weightKg: number
  volumeM3: number
  chargeableWeightKg?: number
  natureOfGoods: string
  cargo: CargoLine[]

  // Calculation
  carrier: string
  currency: Currency
  transitTime: string
  paymentTerms: string
  charges: Charge[]
  termsAndConditions?: string
  notes?: string
}
