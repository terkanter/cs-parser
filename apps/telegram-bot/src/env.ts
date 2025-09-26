import { z } from 'zod'
import { config } from 'dotenv'

config()

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  RABBITMQ_URL: z.string().url().default('amqp://localhost:5672'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WEBHOOK_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),
})

export const env = envSchema.parse(process.env)
