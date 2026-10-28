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

// Какой тип подходит к виду транспорта: самолёт не возит FTL, а фура не возит LCL
export const equipmentByMode: Record<TransportMode, EquipmentType[]> = {
  air: ['Air'],
  sea: ['FCL', 'LCL', '20 GP', '40 DV', '40 HQ', '40 OT', '40 RF'],
  road: ['FTL', 'LTL', 'Lowbed', 'Flatbed', '20 GP', '40 DV', '40 HQ'],
  rail: ['FCL', '20 GP', '40 DV', '40 HQ', '40 OT', '40 RF'],
}

// Порты нужны морю, авиа и ж/д, а авто — только если перевозка идёт до порта или из порта
export const needsPorts = (mode: TransportMode, movement: Movement) => mode !== 'road' || movement.includes('port')

// Валюты по словам заказчика: доллары, туркменские манаты и евро
export const CURRENCIES = ['USD', 'TMT', 'EUR'] as const
export type Currency = (typeof CURRENCIES)[number]

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
