import { prisma } from '../../infrastructure/persistence/prisma.js';
import { logger } from '../../infrastructure/logging/logger.js';

type Severity = 'info' | 'warning' | 'critical';

const lastFireAt = new Map<number, number>(); // ruleId -> ts

function parseThreshold(raw: string): number | [number, number] {
  try { const v = JSON.parse(raw); if (Array.isArray(v) && v.length === 2) return v as [number, number]; return Number(v); }
  catch { return Number(raw); }
}

function check(operator: string, value: number, threshold: number | [number, number]): boolean {
  if (Array.isArray(threshold)) {
    const [lo, hi] = threshold;
    if (operator === 'between') return value >= lo && value <= hi;
    if (operator === 'outside') return value < lo || value > hi;
    return false;
  }
  switch (operator) {
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    default: return false;
  }
}

type Listener = (event: { id: number; severity: Severity; message: string; meterCode?: string }) => void;
const listeners = new Set<Listener>();

export const riskService = {
  async listRules() {
    return prisma.riskRule.findMany({ orderBy: { id: 'asc' } });
  },

  async upsertRule(data: { code: string; name: string; scope: string; metric: string; operator: string; threshold: string; severity?: Severity; cooldownSec?: number; enabled?: boolean; remark?: string }) {
    return prisma.riskRule.upsert({
      where: { code: data.code },
      create: { ...data, severity: data.severity || 'warning', cooldownSec: data.cooldownSec ?? 300, enabled: data.enabled ?? true },
      update: data
    });
  },

  async listEvents(filter: { status?: string; severity?: string; limit?: number } = {}) {
    return prisma.riskEvent.findMany({
      where: { status: filter.status, severity: filter.severity },
      include: { rule: true, meter: { select: { id: true, code: true, name: true } } },
      orderBy: { occurredAt: 'desc' },
      take: filter.limit || 100
    });
  },

  async ack(id: number, accountId: number) {
    return prisma.riskEvent.update({ where: { id }, data: { status: 'acknowledged', handledBy: accountId, handledAt: new Date() } });
  },

  async close(id: number, accountId: number, note?: string) {
    return prisma.riskEvent.update({ where: { id }, data: { status: 'closed', handledBy: accountId, handledAt: new Date(), closingNote: note } });
  },

  onEvent(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); },

  async evaluate(meterCode: string, value: number) {
    const meter = await prisma.meterPoint.findUnique({ where: { code: meterCode } });
    if (!meter) return;
    const rules = await prisma.riskRule.findMany({ where: { enabled: true } });
    const now = Date.now();
    for (const rule of rules) {
      if (rule.scope !== 'meter' && rule.scope !== 'global') continue;
      if (rule.metric !== 'value') continue;
      const last = lastFireAt.get(rule.id) || 0;
      if (now - last < rule.cooldownSec * 1000) continue;
      const t = parseThreshold(rule.threshold);
      if (!check(rule.operator, value, t)) continue;
      lastFireAt.set(rule.id, now);
      try {
        const ev = await prisma.riskEvent.create({
          data: {
            ruleId: rule.id,
            meterId: meter.id,
            severity: rule.severity,
            value,
            message: `${meter.name} 触发规则【${rule.name}】当前值 ${value}`
          }
        });
        for (const l of listeners) l({ id: ev.id, severity: ev.severity as Severity, message: ev.message, meterCode });
      } catch (e) {
        logger.warn({ err: (e as Error).message }, 'risk event persist failed');
      }
    }
  }
};
