import type { TransportMode } from './logistics'

export type Customer = {
  id: string
  code: string // SIGDUB — короткий код, как в Scope
  name: string
  country: string
  city: string
  address: string
  contactPerson: string
  email: string
  phone: string
}

export const VENDOR_TYPES = ['airline', 'shipping_line', 'trucking', 'rail', 'agent'] as const
// Встроенные значения; владелец платформы может добавить свои (src/data/catalog.ts), поэтому ещё и любая строка
export type BuiltInVendorType = (typeof VENDOR_TYPES)[number]
export type VendorType = BuiltInVendorType | (string & {})

export const vendorTypeLabels: Record<BuiltInVendorType, string> = {
  airline: 'Airline',
  shipping_line: 'Shipping line',
  trucking: 'Trucking',
  rail: 'Rail operator',
  agent: 'Agent',
}

export type Vendor = {
  id: string
  code: string
  name: string
  type: VendorType
  modes: TransportMode[]
  country: string
  contactPerson: string
  email: string
  phone: string
}
