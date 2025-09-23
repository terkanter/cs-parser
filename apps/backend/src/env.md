# Environment Configuration

Этот файл `env.ts` является центральным местом для всех переменных окружения в backend приложении.

## Использование

```typescript
import { env, IS_PROD, IS_DEV, IS_TEST } from "@/env";

// Использование переменных
console.log("Database URL:", env.DATABASE_URL);
console.log("Is production:", IS_PROD);
console.log("Auth secret:", env.BETTER_AUTH_SECRET);
```

## Доступные переменные

- `NODE_ENV` - окружение (development/production/test)
- `SERVER_PORT` - порт сервера (по умолчанию 3080)
- `BACKEND_LOG_LEVEL` - уровень логирования (по умолчанию debug)
- `DATABASE_URL` - URL подключения к базе данных (опционально для генерации клиента)
- `BETTER_AUTH_SECRET` - секретный ключ для Better Auth
- `BETTER_AUTH_URL` - базовый URL для Better Auth
- `FRONTEND_URL` - URL фронтенда (опционально)
- `IS_GENERATING_CLIENT` - флаг генерации клиента

## Константы для удобства

- `IS_PROD` - true если NODE_ENV === "production"
- `IS_TEST` - true если NODE_ENV === "test"
- `IS_DEV` - true если NODE_ENV === "development"

## Валидация

Все переменные валидируются с помощью zod схем при запуске приложения.
