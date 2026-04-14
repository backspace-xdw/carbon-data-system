-- 默认管理员用户 (密码: admin123)
INSERT INTO users (id, username, password_hash, full_name, role) VALUES
('u-001', 'admin', '$2a$10$8KxX7AiCQpH9YW5G5E5cZOQe5Zz5W5W5W5W5W5W5W5W5W5W5W5', '系统管理员', 'super_admin');

-- 默认区域
INSERT INTO areas (id, name, type, sort_order) VALUES
('area-workshop-a', '生产车间A', 'production', 1),
('area-workshop-b', '生产车间B', 'production', 2),
('area-office', '办公楼', 'office', 3),
('area-warehouse', '仓库', 'warehouse', 4),
('area-power', '动力中心', 'utility', 5);

-- 默认排放因子 (2023年度)
INSERT INTO emission_factors (id, energy_type, name, factor_value, factor_unit, source_unit, scope, region, source, valid_year, is_default, status) VALUES
('ef-elec-east', 'electricity', '华东电网排放因子', 0.0005810, 'tCO2e/kWh', 'kWh', 'scope2', '华东电网', '生态环境部2023年度', 2023, 1, 'active'),
('ef-elec-national', 'electricity', '全国电网平均排放因子', 0.0005703, 'tCO2e/kWh', 'kWh', 'scope2', '全国', '生态环境部2023年度', 2023, 0, 'active'),
('ef-gas-default', 'gas', '天然气排放因子', 0.002162, 'tCO2e/m3', 'm3', 'scope1', '全国', 'IPCC 2006', 2023, 1, 'active'),
('ef-steam-default', 'steam', '蒸汽排放因子', 0.110, 'tCO2e/t', 't', 'scope2', '全国', '行业标准', 2023, 1, 'active'),
('ef-water-default', 'water', '自来水排放因子', 0.000091, 'tCO2e/m3', 'm3', 'scope3', '全国', '行业标准', 2023, 1, 'active');

-- 默认设备 (模拟仪表)
INSERT INTO devices (id, name, energy_type, protocol, area_id, scope, status) VALUES
('EM-001', '1#车间总电表', 'electricity', 'mqtt', 'area-workshop-a', 'scope2', 'online'),
('EM-002', '2#车间总电表', 'electricity', 'mqtt', 'area-workshop-b', 'scope2', 'online'),
('EM-003', '办公楼电表', 'electricity', 'mqtt', 'area-office', 'scope2', 'online'),
('GM-001', '1#车间燃气表', 'gas', 'mqtt', 'area-workshop-a', 'scope1', 'online'),
('GM-002', '动力中心燃气表', 'gas', 'mqtt', 'area-power', 'scope1', 'online'),
('WM-001', '总水表', 'water', 'mqtt', 'area-workshop-a', 'scope3', 'online'),
('SM-001', '动力中心蒸汽表', 'steam', 'mqtt', 'area-power', 'scope2', 'online');

-- 默认碳配额 (2024年度)
INSERT INTO carbon_quotas (id, year, quota_total, source) VALUES
('quota-2024', 2024, 5000.0, '2024年度碳配额分配方案'),
('quota-2025', 2025, 4800.0, '2025年度碳配额分配方案'),
('quota-2026', 2026, 4500.0, '2026年度碳配额分配方案');

-- 默认告警规则
INSERT INTO alarm_rules (id, name, category, target_type, condition_type, condition_params, severity) VALUES
('rule-quota-80', '碳配额使用80%预警', 'carbon_quota', 'site', 'threshold', '{"field":"quota_usage_pct","operator":">=","value":80}', 'warning'),
('rule-quota-95', '碳配额使用95%严重预警', 'carbon_quota', 'site', 'threshold', '{"field":"quota_usage_pct","operator":">=","value":95}', 'critical'),
('rule-device-offline', '设备离线告警', 'device_offline', 'device', 'absence', '{"timeout_minutes":10}', 'warning'),
('rule-energy-spike', '能耗异常突增告警', 'energy_anomaly', 'area', 'rate_of_change', '{"field":"consumption","period":"1h","change_pct":50}', 'warning');

-- 默认电价配置 (峰谷平)
INSERT INTO energy_prices (id, energy_type, price_type, tou_config, unit, valid_from) VALUES
('price-elec-tou', 'electricity', 'tou', '{"peak":{"price":1.05,"periods":["08:00-11:00","18:00-21:00"]},"normal":{"price":0.65,"periods":["07:00-08:00","11:00-18:00","21:00-23:00"]},"valley":{"price":0.35,"periods":["23:00-07:00"]}}', 'CNY/kWh', '2024-01-01');

INSERT INTO energy_prices (id, energy_type, price_type, price_value, unit, valid_from) VALUES
('price-gas', 'gas', 'flat', 3.50, 'CNY/m3', '2024-01-01'),
('price-water', 'water', 'flat', 4.80, 'CNY/m3', '2024-01-01'),
('price-steam', 'steam', 'flat', 280.0, 'CNY/t', '2024-01-01');

-- 系统配置
INSERT INTO system_config (key, value, description) VALUES
('company_name', '智能制造有限公司', '企业名称'),
('carbon_calc_interval', '3600', '碳排放计算间隔(秒)'),
('data_simulator_enabled', 'true', '是否启用数据模拟器');
