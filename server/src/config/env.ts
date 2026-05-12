import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(7090),
  HOST: z.string().default('0.0.0.0'),

  JWT_SECRET: z.string().min(16).default('iecsp-dev-secret-change-me-please'),
  JWT_TTL: z.string().default('7d'),

  DATABASE_URL: z.string().default('file:./prisma/dev.db'),

  INFLUX_URL: z.string().url().default('http://localhost:8086'),
  INFLUX_TOKEN: z.string().default('iecsp-token-2026'),
  INFLUX_ORG: z.string().default('iecsp'),
  INFLUX_BUCKET_REALTIME: z.string().default('energy_stream'),
  INFLUX_BUCKET_AGG: z.string().default('energy_agg'),

  MQTT_URL: z.string().default('mqtt://localhost:1883'),
  MQTT_TOPIC_PREFIX: z.string().default('iecsp/meter'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  WEB_ROOT: z.string().default('../web')
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
