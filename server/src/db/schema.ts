// Таблицы базы. Каждая строка с данными компании хранит company_id —
// так сервер никогда не отдаст чужие данные (фильтр по компании в каждом запросе).
import { date, index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['admin', 'accountant', 'employee'])
export const planEnum = pgEnum('plan', ['trial', 'lite', 'lite_plus', 'standard'])

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  plan: planEnum('plan').notNull().default('trial'),
  // Конец оплаченного (или пробного) периода, включительно
  paidUntil: date('paid_until').notNull(),
  createdAt: createdAt(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Храним в нижнем регистре, чтобы Ivan@Mail.com и ivan@mail.com были одним человеком
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
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
