export type Role = 'platform_admin' | 'park_admin' | 'data_steward' | 'observer';

export const ROLE_LABEL: Record<Role, string> = {
  platform_admin: '平台管理员',
  park_admin: '园区管理员',
  data_steward: '数据员',
  observer: '观察员'
};

export const ROLE_RANK: Record<Role, number> = {
  platform_admin: 100,
  park_admin: 70,
  data_steward: 40,
  observer: 10
};

export type AccountStatus = 'active' | 'disabled' | 'locked';
export type OrgKind = 'park' | 'enterprise' | 'workshop';

export interface AccountPrincipal {
  id: number;
  username: string;
  role: Role;
  orgId: number | null;
  displayName: string;
}
