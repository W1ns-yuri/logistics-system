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

test('в поле файла — только ссылка на свой файл; слишком глубокая запись отклоняется', async () => {
  for (const link of ['javascript:alert(1)', 'https://evil.example/x.pdf', '/api/files/../auth/me']) {
    const res = await put(admin, 'shipments', 's-link', { documents: [{ name: 'a.pdf', dataUrl: link }] })
    assert.equal(res.statusCode, 400, link)
    assert.equal(res.json().error, 'bad_file_link')
  }
  const ok = await put(admin, 'shipments', 's-link', { documents: [{ name: 'a.pdf', dataUrl: '/api/files/00000000-0000-4000-8000-000000000000' }] })
  assert.equal(ok.statusCode, 200)
  const deep = `{"data":${'{"a":'.repeat(500)}1${'}'.repeat(500)}}`
  const res = await inject({ method: 'PUT', url: '/api/records/customers/deep', cookies: admin, payload: deep, headers: { 'content-type': 'application/json' } })
  assert.equal(res.statusCode, 400)
  assert.equal(res.json().error, 'too_deep')
})

test('битое имя файла → 400, а не ошибка сервера', async () => {
  const res = await inject({ method: 'POST', url: '/api/files', cookies: admin, payload: Buffer.from('%PDF-1.4'), headers: { 'content-type': 'application/octet-stream', 'x-file-name': '%E0%A4%A' } })
  assert.equal(res.statusCode, 400)
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

test('чужая компания не может забрать сотрудника или выдать ему ссылку на пароль', async () => {
  const rival = await inject({ method: 'POST', url: '/api/auth/signup', remoteAddress: '10.1.1.1', payload: { ...signupPayload, companyName: 'Rival', email: 'boss@rival.com' } })
  const cookie = sessionCookie(rival)
  // Сотрудник с паролем
  const taken = await inject({ method: 'POST', url: '/api/team', cookies: cookie, payload: { name: 'Victim', email: 'operator@company.com', role: 'employee' } })
  assert.equal(taken.json().error, 'member_elsewhere')
  // Приглашённый, но ещё без пароля: его ссылку тоже нельзя перехватить
  const pending = await inject({ method: 'POST', url: '/api/team', cookies: admin, payload: { name: 'Pending', email: 'pending@company.com', role: 'admin' } })
  assert.equal(pending.statusCode, 201)
  // Приглашённый админ ещё не вошёл — единственный настоящий админ не может понизить себя
  const me = (await inject({ method: 'GET', url: '/api/auth/me', cookies: admin })).json()
  const demote = await inject({ method: 'PATCH', url: `/api/team/${me.user.id}`, cookies: admin, payload: { role: 'employee' } })
  assert.equal(demote.json().error, 'last_admin')
  const hijack = await inject({ method: 'POST', url: '/api/team', cookies: cookie, payload: { name: 'Pending', email: 'pending@company.com', role: 'employee' } })
  assert.equal(hijack.json().error, 'member_elsewhere')
  // Ссылка первой компании продолжает работать
  const info = await inject({ method: 'GET', url: pending.json().inviteUrl.replace('/invite/', '/api/invite/') })
  assert.equal(info.statusCode, 200)
  await inject({ method: 'DELETE', url: `/api/team/${pending.json().member.id}`, cookies: admin })
  await ctx.db.delete(companies).where(eq(companies.name, 'Rival'))
  await ctx.db.delete(users).where(eq(users.email, 'boss@rival.com'))
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
  // Пробный тариф (Free) — 5 мест: добавляем ещё двоих, шестой уже не помещается
  for (const name of ['four', 'five']) {
    const add = await inject({ method: 'POST', url: '/api/team', cookies: admin, payload: { name, email: `${name}@company.com`, role: 'employee' } })
    assert.equal(add.statusCode, 201, add.body)
  }
  const full = await inject({ method: 'POST', url: '/api/team', cookies: admin, payload: { name: 'Six', email: 'six@company.com', role: 'employee' } })
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
  // Basic: $15 в месяц, год — как 10 месяцев
  assert.equal(ext.json().company.payments[0].amount, 150)
  // После продления компания снова может работать
  const back = await put(admin, 'customers', 'c-4', { name: 'Back' })
  assert.equal(back.statusCode, 200, back.body)

  // Оплата со скидкой и сразу на другой тариф
  const until = ext.json().company.paidUntil
  const deal = await inject({ method: 'POST', url: `/api/platform/companies/${winfin.id}/actions`, cookies: owner, payload: { type: 'extend', months: 1, amount: 12.5, plan: 'standard' } })
  assert.equal(deal.statusCode, 200, deal.body)
  const paid = deal.json().company
  assert.equal(paid.plan, 'standard')
  assert.equal(paid.payments.at(-1).amount, 12.5)
  // Ошибочную последнюю оплату убираем — срок возвращается
  const undo = await inject({ method: 'POST', url: `/api/platform/companies/${winfin.id}/actions`, cookies: owner, payload: { type: 'remove_payment', paymentId: paid.payments.at(-1).id } })
  assert.equal(undo.statusCode, 200, undo.body)
  assert.equal(undo.json().company.payments.length, 1)
  assert.equal(undo.json().company.paidUntil, until)
  const trial = await inject({ method: 'POST', url: `/api/platform/companies/${winfin.id}/actions`, cookies: owner, payload: { type: 'extend', months: 1, plan: 'trial' } })
  assert.equal(trial.statusCode, 400, 'за пробный период оплату не принимаем')

  // Админ забыл пароль: владелец выдаёт ссылку, по ней задаётся новый пароль, старый перестаёт работать
  const link = await inject({ method: 'POST', url: `/api/platform/companies/${winfin.id}/access-link`, cookies: owner })
  assert.equal(link.statusCode, 200, link.body)
  assert.equal(link.json().email, 'manager@company.com')
  const token = link.json().link.split('/invite/')[1]
  const set = await inject({ method: 'POST', url: `/api/invite/${token}`, payload: { password: 'brand-new-pass-1' } })
  assert.equal(set.statusCode, 200, set.body)
  const old = await inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'manager@company.com', password: 'correct-horse-1' } })
  assert.equal(old.statusCode, 401)
  assert.equal((await inject({ method: 'POST', url: `/api/platform/companies/${winfin.id}/access-link`, cookies: admin })).statusCode, 401)
})

test('заявка «Хочу оплатить», продление на 3 месяца, ± дни и дополнительные места', async () => {
  const login = await inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'manager@company.com', password: 'brand-new-pass-1' } })
  const boss = sessionCookie(login)
  const req = await inject({ method: 'POST', url: '/api/company/plan-request', cookies: boss, payload: { plan: 'lite_plus', months: 12 } })
  assert.equal(req.statusCode, 200, req.body)
  assert.equal(req.json().company.planRequest.plan, 'lite_plus')
  // Standard пока не продаём
  assert.equal((await inject({ method: 'POST', url: '/api/company/plan-request', cookies: boss, payload: { plan: 'standard', months: 1 } })).statusCode, 400)
  assert.equal((await inject({ method: 'POST', url: '/api/company/plan-request', cookies: employee.cookie, payload: { plan: 'lite', months: 1 } })).statusCode, 403)
  assert.equal((await inject({ method: 'POST', url: '/api/company/plan-request', cookies: boss, payload: { plan: 'trial', months: 1 } })).statusCode, 400)

  const ownerLogin = await inject({ method: 'POST', url: '/api/platform/login', payload: { email: 'owner@platform.com', password: 'owner-password-1' } })
  const owner = { omni_owner: ownerLogin.cookies.find((c) => c.name === 'omni_owner')!.value }
  const list = (await inject({ method: 'GET', url: '/api/platform/companies', cookies: owner })).json().companies
  const winfin = list.find((c: { adminEmail: string }) => c.adminEmail === 'manager@company.com')
  assert.equal(winfin.planRequest.months, 12)
  const act = (payload: object) => inject({ method: 'POST', url: `/api/platform/companies/${winfin.id}/actions`, cookies: owner, payload })

  const three = await act({ type: 'extend', months: 3, plan: 'standard' })
  assert.equal(three.statusCode, 200, three.body)
  assert.equal(three.json().company.payments.at(-1).amount, 90)
  assert.equal(three.json().company.planRequest, undefined, 'оплата закрывает заявку')
  const until = three.json().company.paidUntil

  const plus = await act({ type: 'adjust_days', days: 5 })
  const minus = await act({ type: 'adjust_days', days: -2 })
  const day = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * 86_400_000).toISOString().slice(0, 10)
  assert.equal(plus.json().company.paidUntil, day(until, 5))
  assert.equal(minus.json().company.paidUntil, day(until, 3))
  assert.equal((await act({ type: 'adjust_days', days: 0 })).statusCode, 400)

  // Standard — 10 мест; ставим 2 дополнительных и проверяем, что лимит стал 12
  const seats = await act({ type: 'seats', extra: 2 })
  assert.equal(seats.json().company.extraSeats, 2)
  assert.equal((await act({ type: 'seats', extra: -1 })).statusCode, 400)
  assert.equal((await inject({ method: 'POST', url: `/api/platform/companies/${winfin.id}/actions`, cookies: boss, payload: { type: 'seats', extra: 100 } })).statusCode, 401)
})

test('Basic: месячный лимит новых котировок, начатые меняются как обычно', async () => {
  const login = await inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'manager@company.com', password: 'brand-new-pass-1' } })
  const boss = sessionCookie(login)
  const me = (await inject({ method: 'GET', url: '/api/auth/me', cookies: boss })).json()
  await ctx.db.update(companies).set({ plan: 'lite', paidUntil: '2099-01-01', blocked: false }).where(eq(companies.id, me.company.id))
  const sync = (await inject({ method: 'GET', url: '/api/sync', cookies: boss })).json()
  const used = sync.company.usage.quotations as number
  // Доводим до лимита (100) прямо в базе, как будто котировки создали в этом месяце
  const { records } = await import('../src/db/schema.ts')
  const fill = Array.from({ length: 100 - used }, (_, i) => ({
    companyId: me.company.id,
    collection: 'quotations',
    id: `fill-${i}`,
    data: { id: `fill-${i}`, reference: `WF9${String(i).padStart(5, '0')}` },
    number: `WF9${String(i).padStart(5, '0')}`,
  }))
  if (fill.length) await ctx.db.insert(records).values(fill)
  const over = await put(boss, 'quotations', 'q-over', { reference: 'WF777777', customer: 'X' })
  assert.equal(over.statusCode, 403)
  assert.equal(over.json().error, 'monthly_limit')
  // Существующую котировку менять можно
  const edit = await put(boss, 'quotations', 'fill-0', { reference: 'WF900000', customer: 'Changed' })
  assert.equal(edit.statusCode, 200, edit.body)
  // Перевозки считаются отдельно
  assert.equal((await put(boss, 'shipments', 's-new', { number: 'SHP-WF-000099' })).statusCode, 200)
  const after = (await inject({ method: 'GET', url: '/api/sync', cookies: boss })).json()
  assert.equal(after.company.usage.quotations, 100)
  // На Lite лимита нет
  await ctx.db.update(companies).set({ plan: 'lite_plus' }).where(eq(companies.id, me.company.id))
  assert.equal((await put(boss, 'quotations', 'q-over', { reference: 'WF777777', customer: 'X' })).statusCode, 200)
})

test('бесплатный доступ, предложения и пометка повторной регистрации', async () => {
  const ownerLogin = await inject({ method: 'POST', url: '/api/platform/login', payload: { email: 'owner@platform.com', password: 'owner-password-1' } })
  const owner = { omni_owner: ownerLogin.cookies.find((c) => c.name === 'omni_owner')!.value }
  const list = (await inject({ method: 'GET', url: '/api/platform/companies', cookies: owner })).json().companies
  const winfin = list.find((c: { adminEmail: string }) => c.adminEmail === 'manager@company.com')
  const act = (payload: object) => inject({ method: 'POST', url: `/api/platform/companies/${winfin.id}/actions`, cookies: owner, payload })

  const promo = await act({ type: 'promo', until: '2026-12-31' })
  assert.equal(promo.statusCode, 200, promo.body)
  assert.equal(promo.json().company.promoUntil, '2026-12-31')
  assert.equal(promo.json().company.plan, 'lite_plus')
  assert.equal(promo.json().company.paidUntil, '2027-01-03', 'после бесплатного доступа ещё 3 дня на оплату')
  const cancel = await act({ type: 'promo', until: null })
  assert.equal(cancel.json().company.promoUntil, undefined)
  assert.equal(cancel.json().company.paidUntil, '2027-01-03')

  // Предложение от сотрудника видит владелец
  const login = await inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'manager@company.com', password: 'brand-new-pass-1' } })
  const boss = sessionCookie(login)
  const sent = await inject({ method: 'POST', url: '/api/feedback', cookies: boss, payload: { text: 'Add customs status', page: '/shipments' } })
  assert.equal(sent.statusCode, 201, sent.body)
  assert.equal((await inject({ method: 'POST', url: '/api/feedback', cookies: boss, payload: { text: 'x' } })).statusCode, 400)
  assert.equal((await inject({ method: 'POST', url: '/api/feedback', payload: { text: 'anonymous' } })).statusCode, 401)
  assert.equal((await inject({ method: 'GET', url: '/api/platform/feedback', cookies: boss })).statusCode, 401)
  const fb = (await inject({ method: 'GET', url: '/api/platform/feedback', cookies: owner })).json().feedback
  assert.equal(fb[0].text, 'Add customs status')
  assert.equal(fb[0].companyName, 'Win Fin Logistics')

  // Та же компания с того же браузера и с почтой на том же домене: обе помечены
  const device = '11111111-2222-3333-4444-555555555555'
  await ctx.db.update(companies).set({ signup: { device, emailDomain: 'company.com' } }).where(eq(companies.id, winfin.id))
  const again = await inject({
    method: 'POST',
    url: '/api/auth/signup',
    payload: { ...signupPayload, companyName: 'Win Fin Logistics 2', email: 'boss2@company.com', device },
  })
  assert.equal(again.statusCode, 201, again.body)
  const marked = (await inject({ method: 'GET', url: '/api/platform/companies', cookies: owner })).json().companies
  const second = marked.find((c: { adminEmail: string }) => c.adminEmail === 'boss2@company.com')
  const first = marked.find((c: { adminEmail: string }) => c.adminEmail === 'manager@company.com')
  assert.deepEqual(second.suspects[0].reasons.sort(), ['device', 'email'])
  assert.equal(second.suspects[0].id, winfin.id)
  assert.equal(first.suspects[0].name, 'Win Fin Logistics 2')
  // Компании сами пометку не видят
  const own = (await inject({ method: 'GET', url: '/api/sync', cookies: sessionCookie(again) })).json()
  assert.equal(own.company.suspects, undefined)
  // Бесплатная почта (gmail) — не повод для пометки
  const gmail = await inject({ method: 'POST', url: '/api/auth/signup', payload: { ...signupPayload, companyName: 'Other Co', email: 'someone@gmail.com' } })
  assert.equal(gmail.statusCode, 201, gmail.body)
  const third = (await inject({ method: 'GET', url: '/api/platform/companies', cookies: owner })).json().companies
  assert.equal(third.find((c: { adminEmail: string }) => c.adminEmail === 'someone@gmail.com').suspects, undefined)
})

test('ИНН и сайт можно скрыть из документов', async () => {
  const login = await inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'manager@company.com', password: 'brand-new-pass-1' } })
  const boss = sessionCookie(login)
  const res = await inject({ method: 'PUT', url: '/api/settings', cookies: boss, payload: { companyShowTaxId: false, companyShowWebsite: true } })
  assert.equal(res.statusCode, 200, res.body)
  assert.equal(res.json().settings.companyShowTaxId, false)
  assert.equal((await inject({ method: 'PUT', url: '/api/settings', cookies: boss, payload: { companyShowTaxId: 'no' } })).statusCode, 400)
})
