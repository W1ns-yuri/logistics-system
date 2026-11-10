import type { Settings } from '@/data/settings'

/*
 * Левая часть шапки PDF: логотип компании, а если его не загрузили — название крупным шрифтом.
 * Размер ограничен, чтобы и квадратный, и вытянутый логотип помещались в шапку одинаково аккуратно.
 */
export function CompanyMark({ company }: { company: Pick<Settings, 'companyLogo' | 'companyName'> }) {
  if (company.companyLogo)
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
