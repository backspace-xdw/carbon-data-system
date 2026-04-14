-- 双碳数据采集系统 SQLite Schema

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    type TEXT NOT NULL DEFAULT 'production',
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES areas(id)
);

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    energy_type TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'meter',
    protocol TEXT NOT NULL,
    area_id TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    install_date TEXT,
    connection_config TEXT,
    data_mapping TEXT,
    rated_capacity REAL,
    ct_ratio TEXT,
    multiplier REAL DEFAULT 1.0,
    scope TEXT DEFAULT 'scope2',
    status TEXT NOT NULL DEFAULT 'offline',
    last_seen_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (area_id) REFERENCES areas(id)
);

CREATE TABLE IF NOT EXISTS emission_factors (
    id TEXT PRIMARY KEY,
    energy_type TEXT NOT NULL,
    name TEXT NOT NULL,
    factor_value REAL NOT NULL,
    factor_unit TEXT NOT NULL,
    source_unit TEXT NOT NULL,
    scope TEXT NOT NULL,
    region TEXT,
    source TEXT,
    valid_year INTEGER,
    is_default INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS carbon_quotas (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    area_id TEXT,
    quota_total REAL NOT NULL,
    quota_monthly TEXT,
    source TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (area_id) REFERENCES areas(id)
);

CREATE TABLE IF NOT EXISTS alarm_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    condition_type TEXT NOT NULL,
    condition_params TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning',
    notification_channels TEXT DEFAULT '["in_app"]',
    cooldown_minutes INTEGER DEFAULT 60,
    enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alarm_records (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    device_id TEXT,
    area_id TEXT,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    current_value REAL,
    threshold_value REAL,
    status TEXT NOT NULL DEFAULT 'active',
    acknowledged_at TEXT,
    acknowledged_by TEXT,
    resolved_at TEXT,
    resolved_by TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (rule_id) REFERENCES alarm_rules(id)
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    scope TEXT,
    area_id TEXT,
    status TEXT DEFAULT 'generating',
    file_path TEXT,
    file_format TEXT,
    file_size INTEGER,
    generated_by TEXT,
    generated_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS energy_prices (
    id TEXT PRIMARY KEY,
    energy_type TEXT NOT NULL,
    price_type TEXT NOT NULL,
    price_value REAL,
    tou_config TEXT,
    unit TEXT NOT NULL,
    valid_from TEXT NOT NULL,
    valid_until TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_devices_area ON devices(area_id);
CREATE INDEX IF NOT EXISTS idx_devices_energy_type ON devices(energy_type);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_emission_factors_type ON emission_factors(energy_type, is_default);
CREATE INDEX IF NOT EXISTS idx_alarm_records_status ON alarm_records(status);
CREATE INDEX IF NOT EXISTS idx_alarm_records_created ON alarm_records(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type, created_at);
