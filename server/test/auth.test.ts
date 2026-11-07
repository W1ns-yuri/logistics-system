import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import { sessionCookie, setup, signupPayload } from './helpers.ts'

let ctx: Awaited<ReturnType<typeof setup>>
before(async () => {
  ctx = await setup()
})
after(async () => {
  await ctx.close()
})

test('health отвечает и видит базу', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/health' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), { ok: true })
})

test('регистрация создаёт компанию на пробном периоде и админа, ставит httpOnly cookie', async () => {
  const res = await ctx.app.inject({ method: 'POST', url: '/api/auth/signup', payload: signupPayload })
  assert.equal(res.statusCode, 201)
  const body = res.json()
  assert.equal(body.user.email, 'manager@company.com', 'email в нижнем регистре')
  assert.equal(body.role, 'admin')
  assert.equal(body.company.plan, 'trial')
  const cookie = res.cookies.find((c) => c.name === 'omni_session')
  assert.ok(cookie?.httpOnly)
  assert.equal(cookie?.sameSite, 'Lax')
})

test('повторная регистрация на тот же email → 409', async () => {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/signup',
    payload: { ...signupPayload, email: 'manager@company.com' },
  })
  assert.equal(res.statusCode, 409)
})

test('плохие данные → 400 со списком полей', async () => {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/signup',
    payload: { ...signupPayload, email: 'not-an-email', password: '123' },
  })
  assert.equal(res.statusCode, 400)
  const paths = res.json().issues.map((i: { path: string }) => i.path)
  assert.ok(paths.includes('email') && paths.includes('password'))
})

test('пароль не хранится открытым текстом', async () => {
  const { rows } = await ctx.db.$client.query('select password_hash from users')
  assert.ok(rows[0].password_hash.startsWith('$argon2'))
})

test('вход, «кто я», выход', async () => {
  const login = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: ' MANAGER@company.com ', password: signupPayload.password },
  })
  assert.equal(login.statusCode, 200)
  const cookies = sessionCookie(login)

  const me = await ctx.app.inject({ method: 'GET', url: '/api/auth/me', cookies })
  assert.equal(me.statusCode, 200)
  assert.equal(me.json().company.name, 'Win Fin Logistics')

  const out = await ctx.app.inject({ method: 'POST', url: '/api/auth/logout', cookies })
  assert.equal(out.statusCode, 204)
  const meAfter = await ctx.app.inject({ method: 'GET', url: '/api/auth/me', cookies })
  assert.equal(meAfter.statusCode, 401, 'после выхода старая cookie не работает')
})

test('без cookie и с поддельной cookie → 401', async () => {
  assert.equal((await ctx.app.inject({ method: 'GET', url: '/api/auth/me' })).statusCode, 401)
  const fake = await ctx.app.inject({ method: 'GET', url: '/api/auth/me', cookies: { omni_session: 'forged' } })
  assert.equal(fake.statusCode, 401)
})

test('неверный пароль и чужой email дают одинаковую ошибку', async () => {
  const wrong = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'manager@company.com', password: 'nope-nope' },
  })
  const unknown = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'ghost@company.com', password: 'nope-nope' },
  })
  assert.equal(wrong.statusCode, 401)
  assert.deepEqual(wrong.json(), unknown.json())
})

test('после 10 неудачных попыток вход блокируется даже с верным паролем', async () => {
  const payload = { email: 'manager@company.com', password: 'bad-password' }
  for (let i = 0; i < 10; i++) await ctx.app.inject({ method: 'POST', url: '/api/auth/login', payload })
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'manager@company.com', password: signupPayload.password },
  })
  assert.equal(res.statusCode, 429)
})
