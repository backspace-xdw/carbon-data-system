import { InfluxDB, Point, WriteApi, QueryApi } from '@influxdata/influxdb-client';
import { env } from '../../config/env.js';
import { logger } from '../logging/logger.js';

class TimeseriesGateway {
  private client: InfluxDB;
  private writeApi: WriteApi;
  private queryApi: QueryApi;
  private degraded = false;

  constructor() {
    this.client = new InfluxDB({ url: env.INFLUX_URL, token: env.INFLUX_TOKEN, timeout: 5000 });
    this.writeApi = this.client.getWriteApi(env.INFLUX_ORG, env.INFLUX_BUCKET_REALTIME, 'ms', {
      flushInterval: 2000,
      batchSize: 200,
      writeFailed: (err) => {
        if (!this.degraded) {
          this.degraded = true;
          logger.warn({ err: err.message }, 'influx write degraded, will keep retrying');
        }
      },
      writeSuccess: () => {
        if (this.degraded) {
          this.degraded = false;
          logger.info('influx write recovered');
        }
      }
    });
    this.queryApi = this.client.getQueryApi(env.INFLUX_ORG);
  }

  writeReading(meterCode: string, energyType: string, value: number, tsMs?: number) {
    const point = new Point('energy_reading')
      .tag('meter', meterCode)
      .tag('type', energyType)
      .floatField('value', value);
    if (tsMs) point.timestamp(tsMs);
    this.writeApi.writePoint(point);
  }

  async flush() {
    try { await this.writeApi.flush(); } catch (e) { /* swallow, gateway is best-effort */ }
  }

  async close() {
    try { await this.writeApi.close(); } catch { /* noop */ }
  }

  async rangeByMeter(meterCode: string, start: string, stop: string, every: string) {
    const flux = `from(bucket: "${env.INFLUX_BUCKET_REALTIME}")
      |> range(start: ${start}, stop: ${stop})
      |> filter(fn: (r) => r._measurement == "energy_reading" and r.meter == "${meterCode}")
      |> aggregateWindow(every: ${every}, fn: mean, createEmpty: false)
      |> yield(name: "mean")`;
    const rows: Array<{ time: string; value: number }> = [];
    try {
      for await (const { values, tableMeta } of this.queryApi.iterateRows(flux)) {
        const o = tableMeta.toObject(values) as any;
        rows.push({ time: o._time, value: o._value });
      }
    } catch (e) {
      logger.warn({ err: (e as Error).message }, 'influx query failed, returning empty');
    }
    return rows;
  }

  async sumByType(start: string, stop: string) {
    const flux = `from(bucket: "${env.INFLUX_BUCKET_REALTIME}")
      |> range(start: ${start}, stop: ${stop})
      |> filter(fn: (r) => r._measurement == "energy_reading")
      |> group(columns: ["type"])
      |> sum(column: "_value")
      |> yield(name: "sum")`;
    const out: Record<string, number> = {};
    try {
      for await (const { values, tableMeta } of this.queryApi.iterateRows(flux)) {
        const o = tableMeta.toObject(values) as any;
        out[o.type] = o._value || 0;
      }
    } catch (e) {
      logger.warn({ err: (e as Error).message }, 'influx sum failed');
    }
    return out;
  }
}

export const tsdb = new TimeseriesGateway();
