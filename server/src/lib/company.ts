// Компания в том виде, в каком её ждёт интерфейс (тип Company во фронте)
import { and, asc, count, eq, gte, inArray, sql } from 'drizzle-orm'

import type { CompanyRow } from '../auth/session.ts'
import type { Db } from '../db/client.ts'
import { companies, memberships, records, users } from '../db/schema.ts'

export async function companyForClient(db: Db, company: CompanyRow, { withNote = false } = {}) {
  const [{ value: members } = { value: 0 }] = await db
    .select({ value: count() })
    .from(memberships)
    .where(eq(memberships.companyId, company.id))
  // Первый админ компании — тот, кто её зарегистрировал
  const [admin] = await db
    .select({ name: users.name, email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.companyId, company.id), eq(memberships.role, 'admin')))
    .orderBy(asc(memberships.createdAt))
    .limit(1)
  return {
    id: company.id,
    name: company.name,
    country: company.country,
    adminName: admin?.name ?? '',
    adminEmail: admin?.email ?? '',
    plan: company.plan,
    paidUntil: company.paidUntil,
    blocked: company.blocked,
    users: members,
    createdAt: company.createdAt.toISOString(),
    lastActiveAt: (company.lastActiveAt ?? company.createdAt).toISOString(),
    // Заметку владельца платформы сама компания не видит
    note: withNote ? company.note : '',
    events: company.events,
    payments: company.licensePayments,
    profile: company.profile ?? undefined,
    extraSeats: company.extraSeats,
    planRequest: company.planRequest ?? undefined,
    promoUntil: company.promoUntil ?? undefined,
    usage: await monthlyUsage(db, company.id),
  }
}

// Сколько перевозок и котировок создано с начала месяца (удалённые тоже: удаление не возвращает лимит)
export async function monthlyUsage(db: Db, companyId: string) {
  const rows = await db
    .select({ collection: records.collection, value: count() })
    .from(records)
    .where(
      and(
        eq(records.companyId, companyId),
        inArray(records.collection, ['shipments', 'quotations']),
        gte(records.createdAt, sql`date_trunc('month', now())`),
      ),
    )
    .groupBy(records.collection)
  const of = (name: string) => rows.find((r) => r.collection === name)?.value ?? 0
  return { shipments: of('shipments'), quotations: of('quotations') }
}

export async function findCompany(db: Db, id: string) {
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1)
  return company
}
