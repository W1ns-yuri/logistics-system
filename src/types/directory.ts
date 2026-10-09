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
export type VendorType = (typeof VENDOR_TYPES)[number]

export const vendorTypeLabels: Record<VendorType, string> = {
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
