// Таблицы базы. Каждая строка с данными компании хранит company_id —
// так сервер никогда не отдаст чужие данные (фильтр по компании в каждом запросе).
import { sql } from 'drizzle-orm'
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['admin', 'accountant', 'employee'])
export const planEnum = pgEnum('plan', ['trial', 'lite', 'lite_plus', 'standard'])

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

export type PlanRequest = { plan: string; months: number; at: string }

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  plan: planEnum('plan').notNull().default('trial'),
  // Конец оплаченного (или пробного) периода, включительно
  paidUntil: date('paid_until').notNull(),
  // Заблокировал владелец платформы: в рабочее пространство не пускаем
  blocked: boolean('blocked').notNull().default(false),
  // Заметка владельца платформы о клиенте (компания её не видит)
  note: text('note').notNull().default(''),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  // Что компания рассказала о себе при регистрации: город, телефон, размер команды…
  profile: jsonb('profile').$type<Record<string, unknown>>(),
  // История лицензии и оплаты лицензии — как в админке владельца платформы
  events: jsonb('events').$type<LicenseEvent[]>().notNull().default([]),
  licensePayments: jsonb('license_payments').$type<LicensePayment[]>().notNull().default([]),
  // Реквизиты и настройки компании: печатаются в PDF, одни на всю команду
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  // Дополнительные места сверх тарифа (команда больше 10 человек): ставит владелец платформы
  extraSeats: integer('extra_seats').notNull().default(0),
  // Компания нажала «Хочу оплатить»: какой тариф и на сколько. Владелец видит заявку в админке
  planRequest: jsonb('plan_request').$type<PlanRequest | null>(),
  createdAt: createdAt(),
})

export type LicenseEvent = { id: string; at: string; text: string; params?: Record<string, string | number> }
export type LicensePayment = { id: string; date: string; from: string; amount: number; months: number; plan: string }

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Храним в нижнем регистре, чтобы Ivan@Mail.com и ivan@mail.com были одним человеком
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  // Пустая строка — пароль ещё не задан (человека пригласили, но он не открыл ссылку)
  passwordHash: text('password_hash').notNull(),
  // Владелец платформы: видит все компании и продлевает лицензии. Создаётся командой npm run owner
  isPlatformOwner: boolean('is_platform_owner').notNull().default(false),
  createdAt: createdAt(),
})

// Кто в какой компании и с какой ролью. Один человек может быть в нескольких компаниях
export const memberships = pgTable(
  'memberships',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.userId] }), index('memberships_user_idx').on(t.userId)],
)

// Сессия входа. В cookie лежит случайный токен, в базе — только его хэш:
// если базу украдут, по хэшу войти не получится
export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
)

// Сессия владельца платформы — отдельно от сессий компаний (своя cookie, без company_id)
export const ownerSessions = pgTable('owner_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
})

/*
 * Данные компании: котировки, перевозки, клиенты, подрядчики, инвойсы, города.
 * Каждая запись хранится целиком в JSON (data) — в том же виде, в каком с ней работает интерфейс.
 * Так сервер не ломается от каждого нового поля в форме, а правила (кто что может менять,
 * уникальные номера, чужая компания) всё равно проверяются на сервере.
 * Удалённые записи не стираем сразу, а помечаем deleted_at: так другие сотрудники узнают об удалении.
 */
export const records = pgTable(
  'records',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    collection: text('collection').notNull(),
    id: text('id').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    // Номер документа (AT000001, SHP-AT-000001, INV-AT-000001): уникален внутри компании
    number: text('number'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.collection, t.id] }),
    index('records_changes_idx').on(t.companyId, t.updatedAt),
    uniqueIndex('records_number_idx')
      .on(t.companyId, t.collection, t.number)
      .where(sql`${t.number} is not null and ${t.deletedAt} is null`),
  ],
)

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' })

// Файлы: документы перевозок, чеки, логотип. Лежат в той же базе, поэтому попадают в один бэкап
export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    data: bytea('data').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('files_company_idx').on(t.companyId)],
)

// Ссылка-приглашение в команду. Она же — сброс пароля, если человек его забыл
export const invites = pgTable(
  'invites',
  {
    tokenHash: text('token_hash').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('invites_user_idx').on(t.userId)],
)
