# Omniroute API

Сервер для Omniroute: Node.js 22, Fastify, Postgres, Drizzle, Zod.
Сайт (папка выше) пока работает на данных в браузере; разделы будут переезжать на этот сервер по шагам из плана.

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

## Как устроено

- `src/app.ts` — собирает приложение: подключает cookie, обработку ошибок и маршруты.
- `src/routes/` — маршруты API. Один файл на раздел.
- `src/db/schema.ts` — таблицы. Каждая таблица с данными компании хранит `company_id`.
- `src/auth/` — сессии (в cookie случайный токен, в базе только его хэш) и защита от подбора пароля.
- `test/` — тесты: шлют запросы в приложение без настоящего порта (`app.inject`).

## API (шаг 1–2)

| Метод | Адрес | Что делает |
| --- | --- | --- |
| GET | `/api/health` | Сервер жив, база отвечает |
| POST | `/api/auth/signup` | Новая компания на пробном периоде + её админ, сразу вход |
| POST | `/api/auth/login` | Вход по email и паролю |
| POST | `/api/auth/logout` | Выход |
| GET | `/api/auth/me` | Кто вошёл: человек, компания, роль |

## Безопасность

- Пароли: argon2. Cookie сессии `httpOnly` + `SameSite=Lax`, в базе только sha256 от токена.
- Лимиты: 10 неверных паролей на «email + IP» и 50 на IP за 15 минут, 5 регистраций с IP в час.
- Время ответа на вход одинаковое для «нет такого email» и «неверный пароль».
- POST/PUT/PATCH/DELETE с чужим `Origin` → 403 (защита от CSRF).
- Node.js слушает `127.0.0.1`, доверяет `X-Forwarded-For` только от Nginx на этой же машине.

## Nginx на сервере в офисе

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
