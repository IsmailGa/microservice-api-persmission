# Микросервис управления правами

Микросервис для управления правами доступа через NATS.io RPC с кэшированием в NATS KV и хранением в PostgreSQL.

## Технологии

- Node.js + TypeScript
- PostgreSQL (raw SQL)
- NATS.io (request/reply + Key-Value)
- Winston для логирования

## Установка и запуск

### 1. Установка зависимостей
```bash
npm install
```

### 2. Запуск инфраструктуры
```bash
docker-compose up -d postgres nats
```

### 3. Создание .env файла
Создайте файл `.env` в корне проекта:
```env
NATS_URL=nats://localhost:4222
POSTGRES_URL=postgresql://postgres:123456789@localhost:5432/permissions
```

### 4. Сборка и запуск
```bash
npm run build
npm start
```

## API

### Темы NATS

#### permissions.grant
Назначить право API-ключу
```json
{
  "apiKey": "abcd-1234",
  "module": "trades",
  "action": "create"
}
```
Ответ:
```json
{ "status": "ok" }
```

#### permissions.revoke
Отозвать право у API-ключа
```json
{
  "apiKey": "abcd-1234",
  "module": "trades",
  "action": "create"
}
```
Ответ:
```json
{ "status": "ok" }
```

#### permissions.check
Проверить наличие права
```json
{
  "apiKey": "abcd-1234",
  "module": "trades",
  "action": "create"
}
```
Ответ:
```json
{ "allowed": true }
```

#### permissions.list
Получить все права API-ключа
```json
{
  "apiKey": "abcd-1234"
}
```
Ответ:
```json
{
  "permissions": [
    { "module": "trades", "action": "create" },
    { "module": "trades", "action": "read" }
  ]
}
```

## Тестирование

### Использование скрипта
```bash
npm run dev
# В другом терминале:
npx ts-node scripts/test.ts
```

### Использование NATS CLI
```bash
# Установка NATS CLI
# https://docs.nats.io/using-nats/nats-tools/natscli

# Grant permission
nats req permissions.grant '{"apiKey":"test-123","module":"trades","action":"create"}'

# Check permission
nats req permissions.check '{"apiKey":"test-123","module":"trades","action":"create"}'

# List permissions
nats req permissions.list '{"apiKey":"test-123"}'

# Revoke permission
nats req permissions.revoke '{"apiKey":"test-123","module":"trades","action":"create"}'
```

## Структура проекта

```
src/
├── db/
│   └── postgres.ts          # PostgreSQL клиент
├── libs/
│   └── nats.ts             # NATS клиент для внешнего использования
├── services/
│   └── permissions.ts      # Основной сервис
├── types/
│   └── index.ts           # TypeScript типы
├── logger.ts              # Конфигурация логирования
└── index.ts               # Точка входа
```

## Особенности реализации

- **Кэширование**: Все права кэшируются в NATS KV bucket `permissions_cache`
- **Graceful shutdown**: Корректное завершение работы при получении SIGINT/SIGTERM
- **Обработка ошибок**: Структурированные ошибки с кодами
- **Логирование**: JSON логи через Winston
- **Индексы**: Оптимизированные индексы в PostgreSQL для производительности
- **Типизация**: Полная типизация TypeScript для всех операций

## Коды ошибок

- `apiKey_not_found` - API ключ не найден
- `db_error` - Ошибка базы данных
- `cache_error` - Ошибка кэша
- `invalid_payload` - Неверный формат запроса 
