import type { TransportMode } from '@/types/logistics'

// Подсказки для портов, аэропортов и станций. Нужного нет — его можно вписать, и он запомнится в котировках
const SEA_PORTS = [
  'Turkmenbashi',
  'Aktau',
  'Kuryk',
  'Baku (Alat)',
  'Poti',
  'Batumi',
  'Novorossiysk',
  'Astrakhan',
  'Bandar Abbas',
  'Mersin',
  'Istanbul (Ambarli)',
  'Izmir',
  'Jebel Ali',
  'Nhava Sheva',
  'Mundra',
  'Shanghai',
  'Ningbo',
  'Qingdao',
  'Tianjin',
  'Shenzhen',
  'Busan',
  'Rotterdam',
  'Antwerp',
  'Hamburg',
  'Felixstowe',
  'Genoa',
  'Valencia',
]

const AIRPORTS = [
  'Ashgabat (ASB)',
  'Turkmenabat (CRZ)',
  'Tashkent (TAS)',
  'Almaty (ALA)',
  'Astana (NQZ)',
  'Baku (GYD)',
  'Istanbul (IST)',
  'Istanbul Sabiha (SAW)',
  'Dubai (DXB)',
  'Dubai World Central (DWC)',
  'Doha (DOH)',
  'Moscow Sheremetyevo (SVO)',
  'Frankfurt (FRA)',
  'Paris CDG (CDG)',
  'London Heathrow (LHR)',
  'Amsterdam (AMS)',
  'Milan Malpensa (MXP)',
  'Shanghai Pudong (PVG)',
  'Beijing (PEK)',
  'Guangzhou (CAN)',
  'Hong Kong (HKG)',
  'Seoul Incheon (ICN)',
  'Delhi (DEL)',
  'Mumbai (BOM)',
  'Kuala Lumpur (KUL)',
]

const RAIL_STATIONS = [
  'Ashgabat',
  'Serhetabat',
  'Farap',
  'Sarahs',
  'Turkmenabat',
  'Bereket',
  'Akyayla',
  'Bolashak',
  'Dostyk',
  'Altynkol (Khorgos)',
  'Tashkent',
  'Chengdu',
  'Xian',
  'Urumqi',
  'Moscow',
  'Ilyichevsk',
]

export function terminalSuggestions(mode: TransportMode) {
  if (mode === 'air') return AIRPORTS
  if (mode === 'rail') return RAIL_STATIONS
  return SEA_PORTS
}

// Подписи полей под вид транспорта: в авиа — аэропорт, в ж/д — станция
export function terminalLabels(mode: TransportMode) {
  if (mode === 'air') return { from: 'Airport of departure', to: 'Airport of arrival' }
  if (mode === 'rail') return { from: 'Station of departure', to: 'Station of arrival' }
  return { from: 'Port of loading', to: 'Port of discharge' }
}
