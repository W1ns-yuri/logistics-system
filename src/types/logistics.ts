// Общие справочники логистики. Значения взяты из презентации и скриншотов Scope.

export const TRANSPORT_MODES = ['air', 'sea', 'road', 'rail'] as const
export type TransportMode = (typeof TRANSPORT_MODES)[number]

export const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CIF', 'DAP', 'DDP', 'DDU'] as const
export type Incoterm = (typeof INCOTERMS)[number]

export const MOVEMENTS = ['door_to_door', 'door_to_port', 'port_to_door', 'port_to_port'] as const
export type Movement = (typeof MOVEMENTS)[number]

export const EQUIPMENT_TYPES = [
  'Air',
  'FTL',
  'LTL',
  'LCL',
  'FCL',
  '20 GP',
  '40 DV',
  '40 HQ',
  '40 OT',
  '40 RF',
  'Lowbed',
  'Flatbed',
] as const
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number]

export type Currency = 'USD' | 'EUR' | 'AED' | 'TMT'

export const transportModeLabels: Record<TransportMode, string> = {
  air: 'Air',
  sea: 'Sea',
  road: 'Road',
  rail: 'Rail',
}

export const movementLabels: Record<Movement, string> = {
  door_to_door: 'Door to door',
  door_to_port: 'Door to port',
  port_to_door: 'Port to door',
  port_to_port: 'Port to port',
}
