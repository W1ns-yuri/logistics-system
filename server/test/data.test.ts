import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { eq } from 'drizzle-orm'
import type { InjectOptions } from 'fastify'

import { companies, users } from '../src/db/schema.ts'
import { sessionCookie, setup, signupPayload } from './helpers.ts'

let ctx: Awaited<ReturnType<typeof setup>>
let admin: Record<string, string>
const inject = (opts: InjectOptions) => ctx.app.inject(opts)

// Пригласить человека и войти по ссылке — вернёт его cookie
async function invite(role: string, email: string) {
  const res = await inject({ method: 'POST', url: '/api/team', cookies: admin, payload: { name: role + ' user', email, role } })
  assert.equal(res.statusCode, 201, res.body)
  const token = res.json().inviteUrl.split('/').pop()
  const accept = await inject({ method: 'POST', url: `/api/invite/${token}`, payload: { password: 'new-password-1' } })
  assert.equal(accept.statusCode, 200, accept.body)
  return { cookie: sessionCookie(accept), id: res.json().member.id as string }
}

const put = (cookies: Record<string, string>, collection: string, id: string, data: object) =>
  inject({ method: 'PUT', url: `/api/records/${collection}/${id}`, cookies, payload: { data } })

let employee: { cookie: Record<string, string>; id: string }
let accountant: { cookie: Record<string, string>; id: string }

before(async () => {
  ctx = await setup()
  const res = await inject({ method: 'POST', url: '/api/auth/signup', payload: { ...signupPayload, documentPrefix: 'WF' } })
  admin = sessionCookie(res)
  employee = await invite('employee', 'operator@company.com')
  accountant = await invite('accountant', 'accountant@company.com')
})
after(async () => {
  await ctx.close()
})

test('без входа данные не отдаются', async () => {
  assert.equal((await inject({ method: 'GET', url: '/api/sync' })).statusCode, 401)
  assert.equal((await put({}, 'customers', 'c1', { name: 'X' })).statusCode, 401)
})

test('регистрация заполняет реквизиты компании для PDF', async () => {
  const sync = (await inject({ method: 'GET', url: '/api/sync', cookies: admin })).json()
  assert.equal(sync.settings.companyName, 'Win Fin Logistics')
  assert.equal(sync.settings.documentPrefix, 'WF')
  assert.equal(sync.team.length, 3)
  assert.equal(sync.company.users, 3)
})

test('запись сохраняется, автора ставит сервер, другие видят её через sync', async () => {
  const res = await put(employee.cookie, 'quotations', 'q-1', { reference: 'WF000001', createdBy: 'hacker@x.com', customer: 'Huawei' })
  assert.equal(res.statusCode, 200, res.body)
  assert.equal(res.json().data.createdBy, 'operator@company.com')
  const sync = (await inject({ method: 'GET', url: '/api/sync', cookies: admin })).json()
  const q = sync.records.find((r: { id: string }) => r.id === 'q-1')
  assert.equal(q.data.customer, 'Huawei')
})

test('одинаковый номер у второй котировки → сервер даёт следующий', async () => {
  const res = await put(admin, 'quotations', 'q-2', { reference: 'WF000001', customer: 'ZTE' })
  assert.equal(res.json().data.reference, 'WF000002')
  // Та же запись сохраняется повторно со своим номером — номер не меняется
  const again = await put(employee.cookie, 'quotations', 'q-1', { reference: 'WF000001', customer: 'Huawei 2' })
  assert.equal(again.json().data.reference, 'WF000001')
})

test('сотрудник не может менять чужую котировку, админ может', async () => {
  assert.equal((await put(employee.cookie, 'quotations', 'q-2', { reference: 'WF000002' })).statusCode, 403)
  const res = await put(admin, 'quotations', 'q-1', { reference: 'WF000001', customer: 'By admin' })
  assert.equal(res.statusCode, 200)
  assert.equal(res.json().data.createdBy, 'operator@company.com', 'автор остаётся прежним')
})

test('бухгалтер не создаёт котировки и клиентов', async () => {
  assert.equal((await put(accountant.cookie, 'quotations', 'q-3', { reference: 'WF000003' })).statusCode, 403)
  assert.equal((await put(accountant.cookie, 'customers', 'c-1', { name: 'X' })).statusCode, 403)
})

test('сотрудник не видит инвойсы и деньги перевозки и не может их стереть', async () => {
  await put(admin, 'shipments', 's-1', { number: 'SHP-WF-000001', createdBy: 'x', vendorPayments: [{ id: 'vp1', amount: 100 }] })
  assert.equal((await put(admin, 'invoices', 'i-1', { number: 'INV-WF-000001', payments: [], paid: 0 })).statusCode, 200)
  const sync = (await inject({ method: 'GET', url: '/api/sync', cookies: employee.cookie })).json()
  assert.ok(!sync.records.some((r: { collection: string }) => r.collection === 'invoices'))
  const shipment = sync.records.find((r: { id: string }) => r.id === 's-1')
  assert.equal(shipment.data.vendorPayments, undefined)
  // Перевозку создал админ — сотрудник её не меняет
  assert.equal((await put(employee.cookie, 'shipments', 's-1', { number: 'SHP-WF-000001' })).statusCode, 403)
  // Свою перевозку сотрудник меняет, но деньги в ней не трогает
  await put(employee.cookie, 'shipments', 's-2', { number: 'SHP-WF-000002' })
  await put(accountant.cookie, 'shipments', 's-2', { number: 'IGNORED', vendorPayments: [{ id: 'vp2', amount: 50 }] })
  await put(employee.cookie, 'shipments', 's-2', { number: 'SHP-WF-000002', status: 'loaded', vendorPayments: [] })
  const admins = (await inject({ method: 'GET', url: '/api/sync', cookies: admin })).json()
  const s2 = admins.records.find((r: { id: string }) => r.id === 's-2').data
  assert.equal(s2.status, 'loaded')
  assert.equal(s2.vendorPayments.length, 1, 'оплата бухгалтера осталась')
  assert.equal(s2.number, 'SHP-WF-000002', 'бухгалтер не меняет номер')
  assert.equal((await put(employee.cookie, 'invoices', 'i-1', { number: 'INV-WF-000001' })).statusCode, 403)
})

test('бухгалтер вносит оплату в инвойс, но не меняет его строки', async () => {
  await put(admin, 'invoices', 'i-1', { number: 'INV-WF-000001', lines: [{ rate: 100 }], payments: [], paid: 0 })
  const res = await put(accountant.cookie, 'invoices', 'i-1', { number: 'INV-WF-000001', lines: [{ rate: 1 }], payments: [{ amount: 100 }], paid: 100, status: 'paid' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json().data.lines, [{ rate: 100 }])
  assert.equal(res.json().data.paid, 100)
  assert.equal((await inject({ method: 'DELETE', url: '/api/records/invoices/i-1', cookies: accountant.cookie })).statusCode, 403)
})

test('удаление видно другим через sync?since', async () => {
  const first = (await inject({ method: 'GET', url: '/api/sync', cookies: admin })).json()
  await put(employee.cookie, 'customers', 'c-9', { name: 'Temp' })
  assert.equal((await inject({ method: 'DELETE', url: '/api/records/customers/c-9', cookies: employee.cookie })).statusCode, 204)
  const changes = (await inject({ method: 'GET', url: `/api/sync?since=${encodeURIComponent(first.serverTime)}`, cookies: admin })).json()
  const c = changes.records.find((r: { id: string }) => r.id === 'c-9')
  assert.equal(c.data, null)
  assert.equal(changes.full, false)
})

test('файл нельзя вложить в запись, только ссылкой', async () => {
  const res = await put(admin, 'customers', 'c-2', { name: 'X', logo: 'data:image/png;base64,AAAA' })
  assert.equal(res.statusCode, 400)
  assert.equal(res.json().error, 'inline_file')
})

test('другая компания не видит чужие записи и файлы', async () => {
  const other = await inject({ method: 'POST', url: '/api/auth/signup', payload: { ...signupPayload, email: 'boss@other.com' } })
  const cookie = sessionCookie(other)
  const sync = (await inject({ method: 'GET', url: '/api/sync', cookies: cookie })).json()
  assert.equal(sync.records.length, 0)
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
  const up = await inject({ method: 'POST', url: '/api/files', cookies: admin, headers: { 'content-type': 'application/octet-stream', 'x-file-name': 'logo.png' }, payload: png })
  assert.equal(up.statusCode, 201, up.body)
  const url = up.json().url
  assert.equal((await inject({ method: 'GET', url, cookies: cookie })).statusCode, 404)
  const mine = await inject({ method: 'GET', url, cookies: admin })
  assert.equal(mine.statusCode, 200)
  assert.equal(mine.headers['content-type'], 'image/png')
  // Его же можно поставить логотипом
  const set = await inject({ method: 'PUT', url: '/api/settings', cookies: admin, payload: { companyLogo: url } })
  assert.equal(set.statusCode, 200)
})

test('файл проверяется по содержимому и типу', async () => {
  const fake = await inject({ method: 'POST', url: '/api/files', cookies: admin, headers: { 'content-type': 'application/octet-stream', 'x-file-name': 'invoice.pdf' }, payload: Buffer.from('MZ not a pdf') })
  assert.equal(fake.json().error, 'file_content')
  const svg = await inject({ method: 'POST', url: '/api/files', cookies: admin, headers: { 'content-type': 'application/octet-stream', 'x-file-name': 'x.svg' }, payload: Buffer.from('<svg/>') })
  assert.equal(svg.json().error, 'file_type')
})

test('реквизиты меняет только админ', async () => {
  assert.equal((await inject({ method: 'PUT', url: '/api/settings', cookies: employee.cookie, payload: { companyName: 'Hacked' } })).statusCode, 403)
  assert.equal((await inject({ method: 'PUT', url: '/api/settings', cookies: admin, payload: { documentPrefix: 'bad!' } })).statusCode, 400)
})

test('команда: лимит мест, последний админ, смена email переносит авторство', async () => {
  // Пробный тариф — 3 места, все заняты
  const full = await inject({ method: 'POST', url: '/api/team', cookies: admin, payload: { name: 'Four', email: 'four@company.com', role: 'employee' } })
  assert.equal(full.json().error, 'seat_limit')
  const me = (await inject({ method: 'GET', url: '/api/auth/me', cookies: admin })).json()
  const demote = await inject({ method: 'PATCH', url: `/api/team/${me.user.id}`, cookies: admin, payload: { role: 'employee' } })
  assert.equal(demote.json().error, 'last_admin')
  const moved = await inject({ method: 'PATCH', url: `/api/team/${employee.id}`, cookies: admin, payload: { email: 'merdan@company.com' } })
  assert.equal(moved.statusCode, 200, moved.body)
  const sync = (await inject({ method: 'GET', url: '/api/sync', cookies: admin })).json()
  assert.equal(sync.records.find((r: { id: string }) => r.id === 'q-1').data.createdBy, 'merdan@company.com')
})

test('убранный из команды сразу теряет доступ', async () => {
  const res = await inject({ method: 'DELETE', url: `/api/team/${accountant.id}`, cookies: admin })
  assert.equal(res.statusCode, 204)
  assert.equal((await inject({ method: 'GET', url: '/api/sync', cookies: accountant.cookie })).statusCode, 401)
})

test('приглашённый без пароля не входит, пока не откроет ссылку', async () => {
  const add = await inject({ method: 'POST', url: '/api/team', cookies: admin, payload: { name: 'New', email: 'new@company.com', role: 'employee' } })
  assert.equal(add.statusCode, 201)
  assert.equal(add.json().member.pending, true)
  const login = await inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'new@company.com', password: '' + 'x'.repeat(8) } })
  assert.equal(login.statusCode, 401)
  const info = await inject({ method: 'GET', url: add.json().inviteUrl.replace('/invite/', '/api/invite/') })
  assert.equal(info.json().company, 'Win Fin Logistics')
  assert.equal((await inject({ method: 'GET', url: '/api/invite/' + 'x'.repeat(43) })).statusCode, 404)
})

test('истекшая лицензия — только просмотр', async () => {
  const me = (await inject({ method: 'GET', url: '/api/auth/me', cookies: admin })).json()
  await ctx.db.update(companies).set({ paidUntil: '2020-01-01' }).where(eq(companies.id, me.company.id))
  assert.equal((await inject({ method: 'GET', url: '/api/sync', cookies: admin })).statusCode, 200)
  const res = await put(admin, 'customers', 'c-3', { name: 'X' })
  assert.equal(res.json().error, 'read_only')
  await ctx.db.update(companies).set({ blocked: true }).where(eq(companies.id, me.company.id))
  assert.equal((await inject({ method: 'GET', url: '/api/sync', cookies: admin })).json().error, 'blocked')
  assert.equal((await inject({ method: 'GET', url: '/api/auth/me', cookies: admin })).json().company.blocked, true)
})

test('владелец платформы видит компании и продлевает лицензию', async () => {
  const { hash } = await import('@node-rs/argon2')
  await ctx.db.insert(users).values({ email: 'owner@platform.com', name: 'Owner', passwordHash: await hash('owner-password-1'), isPlatformOwner: true })
  const bad = await inject({ method: 'POST', url: '/api/platform/login', payload: { email: 'manager@company.com', password: 'correct-horse-1' } })
  assert.equal(bad.statusCode, 401, 'админ компании — не владелец платформы')
  assert.equal((await inject({ method: 'GET', url: '/api/platform/companies', cookies: admin })).statusCode, 401)
  const login = await inject({ method: 'POST', url: '/api/platform/login', payload: { email: 'owner@platform.com', password: 'owner-password-1' } })
  assert.equal(login.statusCode, 200)
  const owner = { omni_owner: login.cookies.find((c) => c.name === 'omni_owner')!.value }
  const list = (await inject({ method: 'GET', url: '/api/platform/companies', cookies: owner })).json().companies
  assert.equal(list.length, 2)
  const winfin = list.find((c: { adminEmail: string }) => c.adminEmail === 'manager@company.com')
  const unblock = await inject({ method: 'POST', url: `/api/platform/companies/${winfin.id}/actions`, cookies: owner, payload: { type: 'block', blocked: false } })
  assert.equal(unblock.statusCode, 200, unblock.body)
  const ext = await inject({ method: 'POST', url: `/api/platform/companies/${winfin.id}/actions`, cookies: owner, payload: { type: 'extend', months: 12 } })
  assert.equal(ext.statusCode, 200, ext.body)
  assert.equal(ext.json().company.plan, 'lite')
  assert.equal(ext.json().company.payments.length, 1)
  assert.equal(ext.json().company.payments[0].amount, 100)
  // После продления компания снова может работать
  const back = await put(admin, 'customers', 'c-4', { name: 'Back' })
  assert.equal(back.statusCode, 200, back.body)
})
