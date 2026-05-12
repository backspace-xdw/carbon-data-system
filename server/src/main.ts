import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { env } from './config/env.js';
import { logger } from './infrastructure/logging/logger.js';
import { prisma } from './infrastructure/persistence/prisma.js';
import { tsdb } from './infrastructure/timeseries/influx.js';
import { mqttBus } from './infrastructure/messaging/mqtt.js';
import { registerAuth } from './interface/plugins/auth-plugin.js';
import { authRoutes } from './interface/http/auth-routes.js';
import { cockpitRoutes } from './interface/http/cockpit-routes.js';
import { meterRoutes } from './interface/http/meter-routes.js';
import { energyRoutes } from './interface/http/energy-routes.js';
import { carbonRoutes } from './interface/http/carbon-routes.js';
import { quotaRoutes } from './interface/http/quota-routes.js';
import { riskRoutes } from './interface/http/risk-routes.js';
import { reportRoutes } from './interface/http/report-routes.js';
import { accountRoutes } from './interface/http/account-routes.js';
import { registerRealtime, broadcastMeterTick } from './interface/ws/realtime.js';
import { energyService } from './application/energy/energy-service.js';
import { riskService } from './application/risk/risk-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
  const app = Fastify({ logger: false, trustProxy: true, bodyLimit: 1 << 20 });

  app.setErrorHandler((err, req, reply) => {
    logger.error({ err: err.message, url: req.url, stack: err.stack }, 'unhandled');
    reply.code(err.statusCode || 500).send({ ok: false, message: err.message || '服务异常' });
  });

  await app.register(cors, { origin: true });
  await registerAuth(app);

  // 业务路由
  await app.register(authRoutes,    { prefix: '/api/v1/auth' });
  await app.register(cockpitRoutes, { prefix: '/api/v1/cockpit' });
  await app.register(meterRoutes,   { prefix: '/api/v1/meters' });
  await app.register(energyRoutes,  { prefix: '/api/v1/energy' });
  await app.register(carbonRoutes,  { prefix: '/api/v1/carbon' });
  await app.register(quotaRoutes,   { prefix: '/api/v1/quota' });
  await app.register(riskRoutes,    { prefix: '/api/v1/risk' });
  await app.register(reportRoutes,  { prefix: '/api/v1/report' });
  await app.register(accountRoutes, { prefix: '/api/v1/account' });

  // 健康检查
  app.get('/api/v1/health', async () => ({ ok: true, ts: Date.now(), version: '2.0.0' }));

  // WebSocket
  await registerRealtime(app);

  // 静态前端
  const webRoot = path.resolve(__dirname, '..', '..', 'web');
  if (fs.existsSync(webRoot)) {
    await app.register(staticPlugin, { root: webRoot, prefix: '/', decorateReply: false });
    // SPA 兜底:非 /api 与非已知静态资源,fallback 到 index.html
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/ws')) {
        return reply.code(404).send({ ok: false, message: 'not found' });
      }
      reply.type('text/html').sendFile('index.html', webRoot);
    });
  } else {
    logger.warn({ webRoot }, 'web root not found, static disabled');
  }

  // MQTT -> 时序写入 + 风险评估 + WS 推送
  mqttBus.on(async (msg) => {
    const r = await energyService.ingest({ meterCode: msg.meter, value: msg.value, ts: msg.ts });
    if (r) {
      broadcastMeterTick(r.meter, r.value);
      riskService.evaluate(r.meter, r.value).catch(() => undefined);
    }
  });
  mqttBus.start();

  await app.listen({ host: env.HOST, port: env.PORT });
  logger.info({ host: env.HOST, port: env.PORT }, 'iecsp-server listening');

  const shutdown = async (sig: string) => {
    logger.info({ sig }, 'shutting down');
    try { await app.close(); } catch {}
    try { await tsdb.flush(); await tsdb.close(); } catch {}
    try { await mqttBus.stop(); } catch {}
    try { await prisma.$disconnect(); } catch {}
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((e) => {
  logger.error({ err: e instanceof Error ? e.message : String(e) }, 'bootstrap failed');
  process.exit(1);
});
