import type { EquipmentType, TransportMode } from './logistics'

// Статусы со слайда 5 презентации, по порядку движения груза
export const SHIPMENT_STATUSES = [
  'loaded',
  'on_the_way_to_port',
  'loaded_at_port',
  'queue_at_border',
  'transit',
  'on_turkmenistan_border',
  'delivered',
  'completed',
] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number] | 'cancelled'

export type ShipmentEvent = {
  status: ShipmentStatus
  at: string // ISO-дата
  note?: string
}

export type Shipment = {
  id: string
  number: string
  quotationId?: string
  mode: TransportMode
  customer: string
  collectionAddress: string
  deliveryAddress: string
  orderDate: string
  etd?: string
  eta?: string
  equipment: EquipmentType
  transportQuantity: number
  cargoDescription: string
  weightKg: number
  status: ShipmentStatus
  history: ShipmentEvent[]
}
