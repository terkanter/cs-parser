# Backend API with Better Auth

Этот backend API использует Better Auth для аутентификации с Fastify и Prisma.

## Настройка Better Auth

### 1. Переменные окружения

Создайте `.env` файл на основе `.env.example`:

```bash
cp .env.example .env
```

Основные переменные для Better Auth:

```env
# Better Auth Configuration
BETTER_AUTH_SECRET="your-secret-key-at-least-32-characters-long"
BETTER_AUTH_URL="http://localhost:3080"
FRONTEND_URL="http://localhost:3000"
DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres?schema=public"
```

### 2. Настройка базы данных

```bash
# Генерация Prisma клиента
pnpm db:generate

# Запуск миграций
pnpm db:migrate

# (Опционально) Наполнение данными
pnpm db:seed
```

### 3. Запуск сервера

```bash
pnpm dev
```

## API Endpoints

### Аутентификация

Better Auth автоматически создает следующие endpoints:

- `POST /api/auth/sign-up/email` - Регистрация пользователя
- `POST /api/auth/sign-in/email` - Вход пользователя
- `POST /api/auth/sign-out` - Выход пользователя
- `GET /api/auth/session` - Получение текущей сессии

### Пользователи

- `GET /api/users/me` - Получение профиля текущего пользователя (требует аутентификации)

## Использование аутентификации

### В маршрутах API

```typescript
async function handler(request: FastifyRequest, reply: FastifyReply) {
  // Проверка аутентификации
  if (!request.ctx.isAuthenticated) {
    return reply.status(401).send({ error: "Authentication required" });
  }

  // Получение пользователя
  const { user, session } = request.ctx.requireAuth();

  // Использование данных пользователя
  console.log("User ID:", user.id);
  console.log("User email:", user.email);
}
```

### ApiContext методы

- `ctx.isAuthenticated` - проверка аутентификации
- `ctx.user` - данные пользователя (может быть null)
- `ctx.session` - данные сессии (может быть null)
- `ctx.requireUserId` - получение ID пользователя или исключение
- `ctx.requireAuth()` - получение пользователя и сессии или исключение

## Пример использования

### Регистрация пользователя

```bash
curl -X POST http://localhost:3080/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

### Вход пользователя

```bash
curl -X POST http://localhost:3080/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### Получение профиля (требует cookie сессии)

```bash
curl -X GET http://localhost:3080/api/users/me \
  -H "Cookie: better-auth.session_token=your_session_token"
```

## Структура проекта

```
src/
├── auth/           # Конфигурация Better Auth
│   ├── index.ts    # Основная конфигурация auth
│   └── types.ts    # TypeScript типы для auth
├── api/
│   ├── auth/       # Маршруты аутентификации
│   └── users/      # Пользовательские API
├── api-lib/
│   └── context.ts  # ApiContext с интеграцией auth
└── plugins/
    └── context.plugin.ts  # Fastify плагин для контекста
```

## Настройка Prisma схемы

Better Auth требует следующие модели в базе данных:

- `User` - пользователи
- `Session` - сессии
- `Account` - аккаунты (для OAuth и паролей)
- `Verification` - верификация email

Схема уже настроена в `packages/prisma/prisma/schema.prisma`.

## Безопасность

- Используйте сильный `BETTER_AUTH_SECRET` (минимум 32 символа)
- Настройте CORS для production окружения
- Включите HTTPS в production
- Настройте `trustedOrigins` для ваших доменов
