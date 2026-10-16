// Роли со встречи с заказчиком.
// admin — он же менеджер: всё видит, всё меняет, добавляет людей и раздаёт роли.
// accountant — бухгалтер: видит заказы и все оплаты.
// employee — сотрудник: работает с заказами, но оплаты не видит.
export const ROLES = ['admin', 'accountant', 'employee'] as const
export type Role = (typeof ROLES)[number]

export const roleLabels: Record<Role, string> = {
  admin: 'Admin (manager)',
  accountant: 'Accountant',
  employee: 'Employee',
}

export const roleDescriptions: Record<Role, string> = {
  admin: 'Full access. Manages the team and roles.',
  accountant: 'Views orders and invoices. Records payments and attaches receipts.',
  employee: 'Works with orders. Does not see payments.',
}

export type TeamMember = {
  id: string
  name: string
  email: string
  role: Role
}
