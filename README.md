# Logistics System

Система для экспедитора: котировки, шипменты, клиенты, вендоры, оплаты.

## Стек

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- shadcn/ui (компоненты лежат в `src/components/ui`, их можно править как свой код)
- React Router, lucide-react (иконки)

## Запуск

```bash
npm install     # нужен VPN
npm run dev     # http://localhost:5173
npm run build   # проверка типов + сборка
npm run lint
```

## Структура

```
src/
  components/
    ui/          # базовые компоненты shadcn: Button, Input, Badge, Card...
    layout/      # каркас: сайдбар, шапка, AppLayout
  config/
    navigation.ts  # пункты меню (один источник для сайдбара и крошек)
  data/          # временные мок-данные, потом заменим на API
  hooks/         # свои хуки (use-theme)
  pages/         # страницы разделов
  router.tsx     # роуты
  index.css      # цвета темы (CSS-переменные)
```

Импорты через `@/` = папка `src/`, например `import { Button } from '@/components/ui/button'`.

## Добавить компонент shadcn

```bash
npx shadcn@latest add table   # нужен VPN
```
