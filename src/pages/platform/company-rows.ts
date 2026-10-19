import { useMemo } from 'react'

import {
  daysLeft,
  licenseStatus,
  seatLimit,
  useCompanies,
  useCurrentCompany,
  type Company,
  type LicenseStatus,
} from '@/data/platform'
import { useTeam } from '@/data/store'

export type CompanyRow = Company & { status: LicenseStatus; left: number; seatsUsed: number; seats: number | null }

// Строки таблицы: статус и «дней осталось» считаем на сегодня
export function useCompanyRows(): CompanyRow[] {
  const companies = useCompanies()
  const current = useCurrentCompany()
  const team = useTeam()
  return useMemo(
    () =>
      companies.map((c) => ({
        ...c,
        status: licenseStatus(c),
        left: daysLeft(c),
        // У компании, открытой в этом браузере, — настоящая команда, у остальных — число из демо
        seatsUsed: c.id === current?.id ? team.length : c.users,
        seats: seatLimit(c),
      })),
    [companies, current, team],
  )
}
