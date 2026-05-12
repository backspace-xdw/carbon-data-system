import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. 园区与企业
  const park = await prisma.organization.upsert({
    where: { code: 'PARK-001' },
    update: {},
    create: { code: 'PARK-001', name: '示范工业园区', kind: 'park', remark: '初始化数据' }
  });
  const ent1 = await prisma.organization.upsert({
    where: { code: 'ENT-001' },
    update: {},
    create: { code: 'ENT-001', name: '新材料制造一厂', parentId: park.id, kind: 'enterprise' }
  });
  const ent2 = await prisma.organization.upsert({
    where: { code: 'ENT-002' },
    update: {},
    create: { code: 'ENT-002', name: '精密机械二厂', parentId: park.id, kind: 'enterprise' }
  });

  // 2. 默认账号
  const adminHash = await bcrypt.hash('Sjcj@2026', 10);
  await prisma.account.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      displayName: '系统管理员',
      role: 'platform_admin',
      orgId: park.id,
      mustChangePwd: false
    }
  });
  const stewardHash = await bcrypt.hash('Steward@2026', 10);
  await prisma.account.upsert({
    where: { username: 'steward' },
    update: {},
    create: {
      username: 'steward',
      passwordHash: stewardHash,
      displayName: '示例数据员',
      role: 'data_steward',
      orgId: ent1.id
    }
  });
  // 单位管理员示例
  const parkAdminHash = await bcrypt.hash('Parkadmin@2026', 10);
  await prisma.account.upsert({
    where: { username: 'parkadmin' },
    update: {},
    create: {
      username: 'parkadmin',
      passwordHash: parkAdminHash,
      displayName: '园区管理员',
      role: 'park_admin',
      orgId: park.id
    }
  });
  const observerHash = await bcrypt.hash('Observer@2026', 10);
  await prisma.account.upsert({
    where: { username: 'observer' },
    update: {},
    create: {
      username: 'observer',
      passwordHash: observerHash,
      displayName: '查看账号',
      role: 'observer',
      orgId: park.id
    }
  });

  // 3. 计量点
  const meterDefs = [
    { code: 'M-E-001', name: '一厂总进线电表', energyType: 'electricity', unit: 'kWh', orgId: ent1.id },
    { code: 'M-E-002', name: '二厂总进线电表', energyType: 'electricity', unit: 'kWh', orgId: ent2.id },
    { code: 'M-G-001', name: '一厂天然气计量', energyType: 'gas', unit: 'm³', orgId: ent1.id },
    { code: 'M-W-001', name: '园区自来水总表', energyType: 'water', unit: 't', orgId: park.id },
    { code: 'M-S-001', name: '一厂蒸汽计量', energyType: 'steam', unit: 't', orgId: ent1.id },
    { code: 'M-H-001', name: '二厂热力计量', energyType: 'heat', unit: 'GJ', orgId: ent2.id }
  ];
  for (const m of meterDefs) {
    await prisma.meterPoint.upsert({
      where: { code: m.code },
      update: {},
      create: { ...m, mqttTopic: `iecsp/meter/${m.code}/reading` }
    });
  }

  // 4. 报警规则
  await prisma.riskRule.upsert({
    where: { code: 'R-ELEC-PEAK' },
    update: {},
    create: {
      code: 'R-ELEC-PEAK', name: '电力读数超上限', scope: 'meter', metric: 'value',
      operator: 'gt', threshold: '5000', severity: 'warning', cooldownSec: 600,
      remark: '电力计量点 5000 kWh 上限'
    }
  });
  await prisma.riskRule.upsert({
    where: { code: 'R-QUOTA-OVER' },
    update: {},
    create: {
      code: 'R-QUOTA-OVER', name: '排放配额使用率超过 80%', scope: 'org', metric: 'quota_ratio',
      operator: 'gt', threshold: '0.8', severity: 'critical', cooldownSec: 3600
    }
  });

  // 5. 年度配额示例
  const year = String(new Date().getUTCFullYear());
  await prisma.complianceQuota.upsert({
    where: { period_orgId_source: { period: year, orgId: ent1.id, source: 'government' } },
    update: {},
    create: { period: year, orgId: ent1.id, allocated: 1200, source: 'government', remark: '示例配额' }
  });
  await prisma.complianceQuota.upsert({
    where: { period_orgId_source: { period: year, orgId: ent2.id, source: 'government' } },
    update: {},
    create: { period: year, orgId: ent2.id, allocated: 800, source: 'government' }
  });

  console.log('seed done.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
