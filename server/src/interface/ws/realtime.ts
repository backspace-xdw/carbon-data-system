import type { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { riskService } from '../../application/risk/risk-service.js';

type Client = { send: (data: string) => void; alive: boolean };

const clients = new Set<Client>();

riskService.onEvent((ev) => {
  const payload = JSON.stringify({ type: 'risk', payload: ev });
  for (const c of clients) { if (c.alive) c.send(payload); }
});

export function broadcastMeterTick(meter: string, value: number) {
  const payload = JSON.stringify({ type: 'meter', payload: { meter, value, ts: Date.now() } });
  for (const c of clients) { if (c.alive) c.send(payload); }
}

export async function registerRealtime(app: FastifyInstance) {
  await app.register(websocket);
  app.get('/ws', { websocket: true }, (socket) => {
    const c: Client = { send: (s) => socket.send(s), alive: true };
    clients.add(c);
    c.send(JSON.stringify({ type: 'hello', payload: { ts: Date.now() } }));
    const heartbeat = setInterval(() => { if (c.alive) c.send(JSON.stringify({ type: 'ping', payload: Date.now() })); }, 30_000);
    socket.on('close', () => { c.alive = false; clearInterval(heartbeat); clients.delete(c); });
    socket.on('error', () => { c.alive = false; clearInterval(heartbeat); clients.delete(c); });
  });
}
