# Запуск на сервере

Всё приложение работает на одном Linux-сервере в Docker: база Postgres, API, сайт с HTTPS (Caddy сам получает сертификат Let's Encrypt) и ежедневные бэкапы.

## Что нужно

- VPS вне Туркменистана: 2 vCPU, 4 ГБ RAM, 40 ГБ диска, Ubuntu 24.04. Для 10–30 сотрудников этого хватает с запасом.
- Домен. В DNS домена A-запись (например `app.example.com`) на IP сервера.
- В файрволе сервера открыты только 22 (SSH), 80 и 443.

Перед покупкой проверьте из Туркменистана без VPN, что сервер этого хостинга открывается.

## Первый запуск

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sh

# 2. Код (репозиторий закрытый — нужен доступ: deploy key или токен GitHub)
git clone https://github.com/W1ns-yuri/logistics-system.git
cd logistics-system/deploy

# 3. Настройки
cp .env.example .env
nano .env        # DOMAIN, ACME_EMAIL и POSTGRES_PASSWORD (openssl rand -base64 32)

# 4. Запуск (первая сборка — несколько минут)
docker compose up -d --build

# 5. Владелец платформы (админка /platform: компании, лицензии)
docker compose exec api node --import tsx src/scripts/owner.ts owner@example.com "Имя" "длинный-пароль-от-12-символов"
```

Сайт открывается на `https://ваш-домен`. Компании регистрируются сами на `/signup` (14 дней пробного периода), владелец платформы продлевает лицензии в `/platform`.

## Обновление

```bash
cd logistics-system && git pull
cd deploy && docker compose up -d --build
```

Миграции базы применяются сами при запуске API.

## Бэкапы

- Раз в сутки полный дамп базы (данные, файлы, пользователи) кладётся в `deploy/backups/`, хранятся 14 последних дней.
- Сервер может сломаться целиком, поэтому копируйте `deploy/backups/` ещё куда-то (Storage Box хостинга, S3, свой компьютер), например так: `rsync -a deploy/backups/ user@backup-host:omniroute/`.

Восстановление из бэкапа:

```bash
docker compose exec -T db pg_restore -U omni -d omniroute --clean --if-exists < backups/omniroute-2026-11-11_0200.dump
docker compose restart api
```

## Полезные команды

| Команда | Что делает |
| --- | --- |
| `docker compose ps` | Что запущено и здорово ли |
| `docker compose logs -f api` | Логи API |
| `docker compose logs backup` | Как прошли бэкапы |
| `docker compose exec db psql -U omni omniroute` | Консоль базы |

## Как сотрудники попадают в систему

Админ компании: Настройки → Команда и роли → «Добавить человека» → получает ссылку и сам отправляет её (почта, WhatsApp, Telegram). Человек открывает ссылку и задаёт пароль. Если пароль забыт, админ нажимает «Ссылка для входа» и отправляет новую ссылку. Писем система пока не отправляет.

## Демо и рабочая сборка

- Демо на Vercel (`npm run build`) хранит данные в браузере, сервер ему не нужен.
- Рабочая сборка (`VITE_BACKEND=server npm run build`, её делает `web.Dockerfile`) хранит всё на сервере и требует входа по паролю.
