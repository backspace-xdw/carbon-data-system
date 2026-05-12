import { prisma } from '../../infrastructure/persistence/prisma.js';
import { DEFAULT_UNIT, type EnergyType } from '../../domain/energy/types.js';

export const meterService = {
  async list(filter: { orgId?: number; energyType?: string; status?: string } = {}) {
    return prisma.meterPoint.findMany({
      where: {
        orgId: filter.orgId,
        energyType: filter.energyType,
        status: filter.status
      },
      include: { org: { select: { id: true, code: true, name: true } } },
      orderBy: [{ orgId: 'asc' }, { code: 'asc' }]
    });
  },

  async get(id: number) {
    return prisma.meterPoint.findUnique({
      where: { id },
      include: { org: true }
    });
  },

  async create(data: {
    code: string; name: string; energyType: EnergyType; orgId: number;
    unit?: string; location?: string; scaleFactor?: number; mqttTopic?: string;
  }) {
    return prisma.meterPoint.create({
      data: {
        code: data.code,
        name: data.name,
        energyType: data.energyType,
        unit: data.unit || DEFAULT_UNIT[data.energyType],
        orgId: data.orgId,
        location: data.location,
        scaleFactor: data.scaleFactor ?? 1,
        mqttTopic: data.mqttTopic
      }
    });
  },

  async update(id: number, patch: Partial<{ name: string; location: string; status: string; scaleFactor: number; mqttTopic: string }>) {
    return prisma.meterPoint.update({ where: { id }, data: patch });
  },

  async remove(id: number) {
    return prisma.meterPoint.delete({ where: { id } });
  },

  async findByCode(code: string) {
    return prisma.meterPoint.findUnique({ where: { code } });
  },

  async findByMqttTopic(topic: string) {
    return prisma.meterPoint.findUnique({ where: { mqttTopic: topic } });
  }
};
