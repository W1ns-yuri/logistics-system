import type { Settings } from '@/data/settings'

/*
 * Левая часть шапки PDF: логотип компании, а если его не загрузили — название крупным шрифтом.
 * Размер ограничен, чтобы и квадратный, и вытянутый логотип помещались в шапку одинаково аккуратно.
 */
export function CompanyMark({
  company,
  withLogo = true,
}: {
  company: Pick<Settings, 'companyLogo' | 'companyName'>
  // Логотип в PDF входит в тарифы Lite+ и Standard
  withLogo?: boolean
}) {
  if (company.companyLogo && withLogo)
    return (
      <img
        src={company.companyLogo}
        alt={company.companyName}
        className="max-h-16 max-w-[220px] object-contain object-left"
        data-testid="company-logo"
      />
    )
  return <div className="text-2xl font-bold tracking-tight text-neutral-800">{company.companyName}</div>
}
