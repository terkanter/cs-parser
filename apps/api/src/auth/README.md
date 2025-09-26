# Better Auth Integration Files

Этот каталог содержит модульную интеграцию Better Auth с Fastify, следуя [официальной документации](https://www.better-auth.com/docs/integrations/fastify).

## Структура файлов

### `index.ts`

Основная конфигурация Better Auth с Prisma адаптером.

### `fastify-handler.ts`

Отдельный обработчик для интеграции Better Auth с Fastify.

- Создает catch-all route `/auth/*`
- Конвертирует Fastify запросы в Web API формат
- Обрабатывает все Better Auth endpoints

### `session-extractor.ts`

Утилита для извлечения сессии из Fastify запроса.

- Конвертирует headers в Web API формат
- Использует Better Auth API для получения сессии
- Безопасно обрабатывает ошибки

### `cors-config.ts`

Конфигурация CORS для Better Auth.

- Настроена согласно документации Better Auth
- Поддержка credentials для session cookies
- Настраиваемые origins через env переменные

### `types.ts`

TypeScript типы для аутентификации.

## Использование

```typescript
// В main server файле
import { registerBetterAuthHandler } from "@/auth/fastify-handler";
import { registerCorsConfig } from "@/auth/cors-config";

// Настройка CORS
await registerCorsConfig(fastify);

// Регистрация Better Auth handler
await registerBetterAuthHandler(fastify);
```

## Endpoints

После регистрации доступны стандартные Better Auth endpoints:

- `POST /auth/sign-up/email` - Регистрация
- `POST /auth/sign-in/email` - Вход
- `POST /auth/sign-out` - Выход
- `GET /auth/session` - Получение сессии
- И другие согласно конфигурации

## Интеграция с контекстом

`session-extractor.ts` используется в `context.plugin.ts` для автоматического извлечения пользователя в каждом запросе.
