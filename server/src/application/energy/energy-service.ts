import { tsdb } from '../../infrastructure/timeseries/influx.js';
import { meterService } from '../meter/meter-service.js';
import { logger } from '../../infrastructure/logging/logger.js';

export const energyService = {
  async ingest(input: { meterCode: string; value: number; ts?: number }) {
    const meter = await meterService.findByCode(input.meterCode);
    if (!meter) {
      logger.debug({ code: input.meterCode }, 'ingest skipped: meter not registered');
      return null;
    }
    if (meter.status !== 'active') return null;
    const scaled = input.value * (meter.scaleFactor || 1);
    tsdb.writeReading(meter.code, meter.energyType, scaled, input.ts);
    return { meter: meter.code, value: scaled, ts: input.ts ?? Date.now() };
  },

  async readingsByMeter(meterCode: string, range: { start: string; stop: string; every?: string }) {
    return tsdb.rangeByMeter(meterCode, range.start, range.stop, range.every || '1h');
  },

  async sumByType(range: { start: string; stop: string }) {
    return tsdb.sumByType(range.start, range.stop);
  }
};
