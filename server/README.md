# Omniroute API

Сервер для Omniroute: Node.js 22, Fastify, Postgres, Drizzle, Zod.
Рабочая сборка сайта (`VITE_BACKEND=server`) хранит все данные здесь. Как запустить на сервере — в [deploy/README.md](../deploy/README.md).

## Запуск у себя

1. Postgres 16 и две базы: `omniroute` (для работы) и `omniroute_test` (для тестов, они её чистят).
2. `cp .env.example .env` и поправь адреса баз, если нужно.
3. `npm install`
4. `npm run db:migrate` — создаёт таблицы.
5. `npm run dev` — сервер на http://localhost:3000, перезапускается при сохранении файла.

## Команды

| Команда | Что делает |
| --- | --- |
| `npm test` | Автотесты API на тестовой базе |
| `npm run typecheck` | Проверка типов TypeScript |
| `npm run db:generate` | После правки `src/db/schema.ts`: пишет новую SQL-миграцию в `drizzle/` |
| `npm run db:migrate` | Применяет миграции к базе |
| `npm run owner -- <email> <имя> <пароль>` | Создаёт владельца платформы (админка `/platform`) |

Фронт с этим сервером на своём компьютере: `npm run dev` здесь и `VITE_BACKEND=server npm run dev` в папке выше (запросы `/api` уходят сюда).

## Как устроено

- `src/app.ts` — собирает приложение: подключает cookie, обработку ошибок и маршруты.
- `src/routes/` — маршруты API. Один файл на раздел.
- `src/db/schema.ts` — таблицы. Каждая таблица с данными компании хранит `company_id`.
- `src/auth/` — сессии (в cookie случайный токен, в базе только его хэш) и защита от подбора пароля.
- `test/` — тесты: шлют запросы в приложение без настоящего порта (`app.inject`).

## API

| Метод | Адрес | Что делает |
| --- | --- | --- |
| GET | `/api/health` | Сервер жив, база отвечает |
| POST | `/api/auth/signup` | Новая компания на пробном периоде + её админ, сразу вход |
| POST | `/api/auth/login` · `/logout` | Вход по email и паролю, выход |
| GET | `/api/auth/me` | Кто вошёл: человек, роль, компания с лицензией |
| GET | `/api/sync?since=` | Все данные компании или изменения после `since` |
| PUT · DELETE | `/api/records/:collection/:id` | Сохранить или удалить котировку, перевозку, клиента, подрядчика, инвойс, город |
| PUT | `/api/settings` | Реквизиты компании для PDF (только админ) |
| POST · GET | `/api/files` · `/api/files/:id` | Загрузить и скачать файл (документы, чеки, логотип) |
| POST · PATCH · DELETE | `/api/team`, `/api/team/:userId` | Команда: добавить (ссылка-приглашение), изменить, убрать |
| POST | `/api/team/:userId/invite` | Новая ссылка для входа (сброс пароля) |
| GET · POST | `/api/invite/:token` | Страница приглашения: кто и куда, задать пароль |
| POST · GET | `/api/platform/login` · `/companies` · `/companies/:id/actions` | Владелец платформы: компании, продление, блокировка |

## Права (проверяются на сервере)

- **Админ** — всё.
- **Сотрудник** — котировки, перевозки, клиенты, подрядчики. Менять может только свои котировки и перевозки. Инвойсы и деньги перевозок не получает вообще.
- **Бухгалтер** — видит всё, меняет только оплаты: оплаты в инвойсах, оплаты подрядчикам и доплаты в перевозках.
- Лицензия истекла — только чтение (403 `read_only`). Компания заблокирована — 403 `blocked`.
- Номер документа уникален в компании: если двое одновременно взяли один номер, второй получит следующий.

## Как хранятся данные

Котировка, перевозка, инвойс и т. д. лежат в таблице `records` целиком (JSON), в том же виде, что в интерфейсе: новое поле в форме не требует миграции. Удалённые записи помечаются `deleted_at`, чтобы удаление дошло до коллег. Файлы лежат в таблице `files` (bytea), поэтому один `pg_dump` сохраняет всё.

## Безопасность

- Пароли: argon2. Cookie сессии `httpOnly` + `SameSite=Lax`, в базе только sha256 от токена.
- Лимиты: 10 неверных паролей на «email + IP» и 50 на IP за 15 минут, 5 регистраций с IP в час.
- Время ответа на вход одинаковое для «нет такого email» и «неверный пароль».
- POST/PUT/PATCH/DELETE с чужим `Origin` → 403 (защита от CSRF).
- Node.js слушает `127.0.0.1` (в Docker — внутреннюю сеть), доверяет `X-Forwarded-For` только своему прокси.
- Файлы: белый список форматов и проверка первых байтов; картинки отдаются с `CSP: sandbox`.

## Nginx вместо Docker (если ставить вручную)

```nginx
server {
  listen 443 ssl http2;
  server_name omniroute.tm;               # ваш домен
  ssl_certificate     /etc/ssl/omniroute/fullchain.pem;
  ssl_certificate_key /etc/ssl/omniroute/privkey.pem;

  root /srv/omniroute/dist;               # собранный фронт
  client_max_body_size 12m;               # файлы до 10 МБ
  server_tokens off;

  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
  add_header X-Frame-Options DENY always;
  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
  add_header Strict-Transport-Security "max-age=31536000" always;

  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;          # нужен для проверки Origin
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location / { try_files $uri /index.html; }
}
server { listen 80; server_name omniroute.tm; return 301 https://$host$request_uri; }
```

Порт PostgreSQL (5432) и порт Node.js (3000) наружу не открываем, в файрволе только 80 и 443.
