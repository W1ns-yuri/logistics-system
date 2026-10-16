import type { EquipmentType, TransportMode } from './logistics'

// Только основные этапы: заказчик сказал, что подробно не нужно — за грузом следит человек.
// «В ожидании» — заказ есть, но груз ещё не забрали (попросил заказчик).
export const SHIPMENT_STATUSES = ['pending', 'loaded', 'in_transit', 'at_border', 'delivered', 'completed'] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number] | 'cancelled'

export type ShipmentEvent = {
  status: ShipmentStatus
  at: string // ISO-дата
  note?: string
}

// Документы прикладывать не обязательно
export const DOCUMENT_TYPES = ['invoice', 'packing_list', 'cmr', 'awb', 'bl', 'certificate', 'other'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const documentTypeLabels: Record<DocumentType, string> = {
  invoice: 'Invoice',
  packing_list: 'Packing list',
  cmr: 'CMR',
  awb: 'AWB',
  bl: 'B/L',
  certificate: 'Certificate',
  other: 'Other',
}

export type ShipmentDocument = {
  id: string
  type: DocumentType
  name: string // имя файла
  size: number // байты
  uploadedAt: string
  dataUrl?: string // сам файл (только небольшие, пока нет сервера)
}

export type Shipment = {
  id: string
  number: string // тот же номер, что у котировки, из которой создан (как на слайде 5)
  quotationId?: string
  mode: TransportMode
  customer: string
  vendorId?: string // кто реально везёт
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
  documents: ShipmentDocument[]
  notes?: string
}
