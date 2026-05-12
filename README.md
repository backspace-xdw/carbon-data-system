# 工业能碳协同管控平台 IECSP

> **Industrial Energy-Carbon Synergy Platform**  ——  面向工业园区与制造企业的能源效率与碳排放协同管控平台

IECSP 围绕 **「计量 — 核算 — 履约 — 预警 — 报送」** 五个环节，将能源消耗与碳排放纳入同一管控视角，帮助园区运营方与排放主体完成数据接入、碳足迹核算、履约配额管理、风险事件预警与监管报送闭环。

## 业务视角

| 视角 | 说明 |
| --- | --- |
| **能碳协同**          | 能源效率与碳排放联动评估,不再割裂看待         |
| **计量点为单位**      | 以"计量点 (Meter Point)"取代设备,贴近表计实务  |
| **履约导向**          | 配额绑定到组织 + 履约年度,可追溯每一吨 CO₂e   |
| **风险事件化**        | 告警 → 风险事件,具备严重度、流转状态、归档     |
| **监管报送闭环**       | 内置政府能耗/碳排放上报通道占位,一键报送      |

## 模块清单

| 编号 | 模块         | 业务说明                                       | 路由 (web)         | 接口前缀 (server)         |
| --- | --- | --- | --- | --- |
| M01 | 统一身份网关   | 登录、JWT 颁发、组织/角色                       | `/login.html`     | `/api/v1/auth`            |
| M02 | 能碳驾驶舱     | 全域 KPI、趋势、能源结构、风险概览              | `/#/cockpit`      | `/api/v1/cockpit`         |
| M03 | 能源数据接入   | 计量点实时读数、历史曲线、补录                  | `/#/energy`       | `/api/v1/energy`          |
| M04 | 计量点台账     | 表计登记、MQTT 主题映射、有效性管理              | `/#/meters`       | `/api/v1/meters`          |
| M05 | 碳足迹核算     | 排放因子库、按月/年核算、归档                   | `/#/carbon`       | `/api/v1/carbon`          |
| M06 | 配额履约       | 年度配额分配、使用进度、缺口预警                 | `/#/quota`        | `/api/v1/quota`           |
| M07 | 风险预警       | 规则引擎、风险事件流转、消息推送                 | `/#/risk`         | `/api/v1/risk`            |
| M08 | 监管报送       | 政府平台通道、报送记录、回执解析                 | `/#/report`       | `/api/v1/report`          |
| M09 | 组织账户       | 组织树、账户管理、审计日志                       | `/#/account`      | `/api/v1/account`         |

## 技术栈

### 服务端 (`server/`)

- **Node.js 20 + TypeScript 5**
- **Fastify 4**:HTTP / WebSocket / 插件化
- **Prisma 5 + SQLite**:关系型数据 (账户、组织、计量点台账等)
- **InfluxDB 2.x**:时序数据 (能源读数、碳排放分钟级)
- **MQTT (Mosquitto)**:计量点上行消息
- **pino**:结构化日志
- **DDD 四层**:`domain / application / infrastructure / interface`

### 前端 (`web/`)

- **原生 HTML5 + CSS3 + ES2022 (vanilla JS)** —— 不依赖任何 UI 框架
- **Web Components**:自定义元素 `iecsp-*` 复用
- **Canvas/SVG 自绘图表**:不依赖 ECharts/D3
- **EventSource (SSE)**:实时推送
- **IndexedDB**:本地缓存与离线视图
- **Service Worker**:静态资源缓存

### 部署

- `docker-compose.yml`:一键编排 InfluxDB + Mosquitto + 服务端
- 前端通过 `@fastify/static` 由服务端同源提供 (避免跨域)
- 反向代理建议 nginx (生产)

## 快速开始

```bash
# 1. 启动外部依赖
docker compose up -d influxdb mosquitto

# 2. 安装与构建
npm install
npm run prisma:migrate -w iecsp-server
npm run seed -w iecsp-server

# 3. 启动服务端
npm run dev -w iecsp-server

# 4. 浏览器访问
open http://localhost:7090
```

默认账号:`admin / Iecsp@2026` (首次登录强制改密)

## 目录结构

```
.
├── server/                 # 服务端
│   ├── prisma/
│   └── src/
│       ├── domain/         # 业务域(类型/契约)
│       ├── application/    # 用例编排
│       ├── infrastructure/ # Prisma / Influx / MQTT / 日志
│       └── interface/      # Fastify 路由与插件
├── web/                    # 前端
│   ├── index.html          # 应用外壳
│   ├── login.html          # 独立登录页
│   ├── pages/              # 页面 HTML 片段
│   └── assets/
│       ├── css/
│       ├── js/
│       │   ├── core/       # 路由 / 状态 / API
│       │   ├── components/ # Web Components
│       │   ├── charts/     # Canvas/SVG 图表
│       │   └── pages/      # 页面控制器
│       └── icons/
├── docker/                 # 第三方组件初始化
└── docs/
```

## 与历史版本差异

v2 与 v1 (React + Express) 是完全独立的实现:技术栈、目录结构、业务术语、数据模型、UI 风格、接口路径均不重合。v1 已归档于 git 分支 `v1-archive` 与 tag `v1.0-original`。
