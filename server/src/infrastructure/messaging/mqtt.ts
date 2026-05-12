import mqtt, { MqttClient } from 'mqtt';
import { env } from '../../config/env.js';
import { logger } from '../logging/logger.js';

export type MeterMessage = {
  meter: string;
  energyType?: string;
  value: number;
  ts?: number;
};

type Handler = (msg: MeterMessage, raw: string) => void | Promise<void>;

class MqttBus {
  private client: MqttClient | null = null;
  private handlers: Set<Handler> = new Set();

  start() {
    const topic = `${env.MQTT_TOPIC_PREFIX}/+/reading`;
    this.client = mqtt.connect(env.MQTT_URL, { reconnectPeriod: 5000, connectTimeout: 8000 });
    this.client.on('connect', () => {
      logger.info({ url: env.MQTT_URL, topic }, 'mqtt connected');
      this.client!.subscribe(topic, { qos: 0 });
    });
    this.client.on('error', (err) => logger.warn({ err: err.message }, 'mqtt error'));
    this.client.on('close', () => logger.warn('mqtt closed, will retry'));
    this.client.on('message', (rawTopic, payload) => {
      const raw = payload.toString();
      try {
        const obj = JSON.parse(raw) as Partial<MeterMessage>;
        const meterFromTopic = rawTopic.split('/').slice(-2, -1)[0];
        const msg: MeterMessage = {
          meter: obj.meter || meterFromTopic,
          energyType: obj.energyType,
          value: Number(obj.value),
          ts: obj.ts
        };
        if (!Number.isFinite(msg.value)) return;
        for (const h of this.handlers) Promise.resolve(h(msg, raw)).catch(() => undefined);
      } catch (e) {
        logger.debug({ raw }, 'mqtt non-json message');
      }
    });
  }

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async stop() {
    if (this.client) {
      await new Promise<void>((resolve) => this.client!.end(false, () => resolve()));
      this.client = null;
    }
  }
}

export const mqttBus = new MqttBus();
