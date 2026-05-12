import pino from 'pino';
import { env } from '../../config/env.js';

const transport = env.NODE_ENV === 'production'
  ? undefined
  : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } };

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { app: 'carbon-server' },
  transport
});
