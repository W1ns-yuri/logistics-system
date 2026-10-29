import { getSettings } from '@/data/settings'

// Коды стран ISO 3166. Названия берём из браузера (Intl.DisplayNames), поэтому список сразу на двух языках.
const CODES =
  'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW'.split(
    ' ',
  )

// Старые названия из демо-данных → код
const ALIASES: Record<string, string> = { UAE: 'AE', Korea: 'KR', Türkiye: 'TR', Turkey: 'TR' }

const names = (lang: string) => new Intl.DisplayNames([lang], { type: 'region' })
const en = names('en')

// Храним английское название (как было), показываем на языке интерфейса
const byName = new Map<string, string>(CODES.map((code) => [en.of(code) ?? code, code]))
for (const [alias, code] of Object.entries(ALIASES)) byName.set(alias, code)

const ru = names('ru')
const aliasesOf = (code: string) => Object.keys(ALIASES).filter((alias) => ALIASES[alias] === code)

export function countryOptions() {
  const local = names(getSettings().language)
  // Ищем и по-русски, и по-английски, и по старым названиям (Turkey → Türkiye)
  return CODES.map((code) => ({
    value: en.of(code) ?? code,
    label: local.of(code) ?? code,
    keywords: [ru.of(code), code, ...aliasesOf(code)].join(' '),
  })).sort((a, b) => a.label.localeCompare(b.label))
}

export function countryLabel(name: string) {
  const code = byName.get(name)
  return code ? (names(getSettings().language).of(code) ?? name) : name
}

// Основные города региона заказчика — подсказки; любой другой город можно вписать вручную
const CITIES: Record<string, string[]> = {
  TM: ['Ashgabat', 'Mary', 'Turkmenabat', 'Balkanabat', 'Dashoguz', 'Turkmenbashi', 'Tejen', 'Serdar'],
  UZ: ['Tashkent', 'Samarkand', 'Bukhara', 'Andijan', 'Namangan', 'Fergana', 'Navoi', 'Nukus', 'Karshi'],
  KZ: ['Almaty', 'Astana', 'Shymkent', 'Aktau', 'Atyrau', 'Khorgos'],
  KG: ['Bishkek', 'Osh'],
  TJ: ['Dushanbe', 'Khujand'],
  AF: ['Kabul', 'Herat', 'Mazar-i-Sharif'],
  IR: ['Tehran', 'Bandar Abbas', 'Mashhad', 'Sarakhs', 'Tabriz'],
  TR: ['Istanbul', 'Izmir', 'Mersin', 'Ankara', 'Kocaeli', 'Bursa', 'Manisa', 'Gaziantep', 'Kayseri', 'Konya'],
  AZ: ['Baku', 'Alat'],
  GE: ['Tbilisi', 'Poti', 'Batumi'],
  RU: ['Moscow', 'Saint Petersburg', 'Novorossiysk', 'Kazan', 'Yekaterinburg', 'Astrakhan'],
  CN: ['Shanghai', 'Shenzhen', 'Guangzhou', 'Ningbo', 'Qingdao', 'Tianjin', 'Yiwu', 'Urumqi', 'Beijing', 'Xian'],
  KR: ['Seoul', 'Busan', 'Incheon'],
  JP: ['Tokyo', 'Yokohama', 'Osaka'],
  IN: ['Mumbai', 'Nhava Sheva', 'Mundra', 'Chennai', 'Delhi'],
  AE: ['Dubai', 'Jebel Ali', 'Abu Dhabi', 'Sharjah'],
  TW: ['Taipei', 'Kaohsiung'],
  DE: ['Hamburg', 'Frankfurt', 'Munich', 'Berlin', 'Bremen'],
  NL: ['Rotterdam', 'Amsterdam'],
  BE: ['Antwerp'],
  IT: ['Milan', 'Genoa'],
  ES: ['Madrid', 'Barcelona', 'Valencia', 'Arteixo'],
  PL: ['Warsaw', 'Lodz'],
  UA: ['Kyiv', 'Odesa'],
  BY: ['Minsk'],
  US: ['New York', 'Los Angeles', 'Houston', 'Chicago'],
  GB: ['London', 'Felixstowe'],
  CH: ['Zurich', 'Geneva', 'Basel'],
  TN: ['Tunis'],
}

// Русские названия городов из подсказок. Храним английское (как в документах), показываем на языке интерфейса
const CITY_RU: Record<string, string> = {
  Ashgabat: 'Ашхабад',
  Mary: 'Мары',
  Turkmenabat: 'Туркменабат',
  Balkanabat: 'Балканабат',
  Dashoguz: 'Дашогуз',
  Turkmenbashi: 'Туркменбаши',
  Tejen: 'Теджен',
  Serdar: 'Сердар',
  Tashkent: 'Ташкент',
  Samarkand: 'Самарканд',
  Bukhara: 'Бухара',
  Andijan: 'Андижан',
  Namangan: 'Наманган',
  Fergana: 'Фергана',
  Navoi: 'Навои',
  Nukus: 'Нукус',
  Karshi: 'Карши',
  Almaty: 'Алматы',
  Astana: 'Астана',
  Shymkent: 'Шымкент',
  Aktau: 'Актау',
  Atyrau: 'Атырау',
  Khorgos: 'Хоргос',
  Bishkek: 'Бишкек',
  Osh: 'Ош',
  Dushanbe: 'Душанбе',
  Khujand: 'Худжанд',
  Kabul: 'Кабул',
  Herat: 'Герат',
  'Mazar-i-Sharif': 'Мазари-Шариф',
  Tehran: 'Тегеран',
  'Bandar Abbas': 'Бендер-Аббас',
  Mashhad: 'Мешхед',
  Sarakhs: 'Серахс',
  Tabriz: 'Тебриз',
  Istanbul: 'Стамбул',
  Izmir: 'Измир',
  Mersin: 'Мерсин',
  Ankara: 'Анкара',
  Kocaeli: 'Коджаэли',
  Bursa: 'Бурса',
  Manisa: 'Маниса',
  Gaziantep: 'Газиантеп',
  Kayseri: 'Кайсери',
  Konya: 'Конья',
  Baku: 'Баку',
  Alat: 'Алят',
  Tbilisi: 'Тбилиси',
  Poti: 'Поти',
  Batumi: 'Батуми',
  Moscow: 'Москва',
  'Saint Petersburg': 'Санкт-Петербург',
  Novorossiysk: 'Новороссийск',
  Kazan: 'Казань',
  Yekaterinburg: 'Екатеринбург',
  Astrakhan: 'Астрахань',
  Shanghai: 'Шанхай',
  Shenzhen: 'Шэньчжэнь',
  Guangzhou: 'Гуанчжоу',
  Ningbo: 'Нинбо',
  Qingdao: 'Циндао',
  Tianjin: 'Тяньцзинь',
  Yiwu: 'Иу',
  Urumqi: 'Урумчи',
  Beijing: 'Пекин',
  Xian: 'Сиань',
  Seoul: 'Сеул',
  Busan: 'Пусан',
  Incheon: 'Инчхон',
  Tokyo: 'Токио',
  Yokohama: 'Иокогама',
  Osaka: 'Осака',
  Mumbai: 'Мумбаи',
  'Nhava Sheva': 'Нава-Шева',
  Mundra: 'Мундра',
  Chennai: 'Ченнаи',
  Delhi: 'Дели',
  Dubai: 'Дубай',
  'Jebel Ali': 'Джебель-Али',
  'Abu Dhabi': 'Абу-Даби',
  Sharjah: 'Шарджа',
  Taipei: 'Тайбэй',
  Kaohsiung: 'Гаосюн',
  Hamburg: 'Гамбург',
  Frankfurt: 'Франкфурт',
  Munich: 'Мюнхен',
  Berlin: 'Берлин',
  Bremen: 'Бремен',
  Rotterdam: 'Роттердам',
  Amsterdam: 'Амстердам',
  Antwerp: 'Антверпен',
  Milan: 'Милан',
  Genoa: 'Генуя',
  Madrid: 'Мадрид',
  Barcelona: 'Барселона',
  Valencia: 'Валенсия',
  Arteixo: 'Артейшу',
  Warsaw: 'Варшава',
  Lodz: 'Лодзь',
  Kyiv: 'Киев',
  Odesa: 'Одесса',
  Minsk: 'Минск',
  'New York': 'Нью-Йорк',
  'Los Angeles': 'Лос-Анджелес',
  Houston: 'Хьюстон',
  Chicago: 'Чикаго',
  London: 'Лондон',
  Felixstowe: 'Феликстоу',
  Zurich: 'Цюрих',
  Geneva: 'Женева',
  Basel: 'Базель',
  Tunis: 'Тунис',
}

export function cityLabel(city: string) {
  return getSettings().language === 'ru' ? (CITY_RU[city] ?? city) : city
}

// Слова для поиска города: и по-русски, и по-английски
export const cityKeywords = (city: string) => [city, CITY_RU[city]].filter(Boolean).join(' ')

export function citySuggestions(country: string, extra: string[] = []) {
  const code = byName.get(country)
  const base = code ? (CITIES[code] ?? []) : []
  return [...new Set([...base, ...extra])].filter(Boolean)
}

// Все города из подсказок с их страной (английское название, как храним): для выбора города в маршруте
export function allCities() {
  return Object.entries(CITIES).flatMap(([code, cities]) =>
    cities.map((city) => ({ city, country: en.of(code) ?? code })),
  )
}
