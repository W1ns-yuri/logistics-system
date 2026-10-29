import { t } from '@/i18n'

// Пример номера для подсказки в поле «Телефон» по стране (английское название, как храним).
// Нет страны в списке — показываем общий международный формат.
const EXAMPLES: Record<string, string> = {
  Turkmenistan: '+993 65 123456',
  Uzbekistan: '+998 90 123 45 67',
  Kazakhstan: '+7 701 123 4567',
  Kyrgyzstan: '+996 555 123 456',
  Tajikistan: '+992 93 123 4567',
  Afghanistan: '+93 70 123 4567',
  Iran: '+98 912 123 4567',
  Türkiye: '+90 532 123 45 67',
  Turkey: '+90 532 123 45 67',
  Azerbaijan: '+994 50 123 45 67',
  Georgia: '+995 555 12 34 56',
  Russia: '+7 912 345 67 89',
  China: '+86 138 0013 8000',
  'South Korea': '+82 10 1234 5678',
  Japan: '+81 90 1234 5678',
  India: '+91 98765 43210',
  'United Arab Emirates': '+971 50 123 4567',
  Germany: '+49 151 23456789',
  Netherlands: '+31 6 12345678',
  Italy: '+39 312 345 6789',
  Spain: '+34 612 34 56 78',
  Poland: '+48 512 345 678',
  Ukraine: '+380 50 123 4567',
  Belarus: '+375 29 123 45 67',
  'United States': '+1 202 555 0123',
  'United Kingdom': '+44 7700 900123',
  France: '+33 6 12 34 56 78',
}

export const phoneExample = (country?: string) =>
  (country && EXAMPLES[country]) || t('With country code, e.g. +1 202 555 0123')
