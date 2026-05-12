# 本安双碳实时数据采集系统

本安出品的、面向工业企业碳排放数据管理的内部系统。主要做两件事：把生产现场的能耗数据（电、气、水、蒸汽、热、煤）采集上来；按照排放因子换算成二氧化碳当量，做月度年度统计、配额管理，以及对外报送。

版本：v2.0
开发语言：TypeScript（服务端）+ 原生 HTML/CSS/JavaScript（前端）

## 目录结构

```
.
├── server          服务端
│   ├── prisma         数据库 schema 与迁移
│   └── src
│       ├── domain         业务定义（类型、常量）
│       ├── application    业务逻辑（按模块分子目录）
│       ├── infrastructure 基础设施（数据库、时序库、消息、日志）
│       └── interface      接口层（HTTP 路由、WebSocket）
├── web             前端
│   ├── index.html         应用主页面
│   ├── login.html         登录页
│   └── assets
│       ├── css            样式表
│       ├── js
│       │   ├── core          路由、API、状态、实时通道
│       │   ├── components    自定义元素（iecsp-card、iecsp-chart）
│       │   ├── charts        Canvas 自绘的图表实现
│       │   └── pages         各业务页面
│       └── icons         图标
├── docker          容器编排相关
├── docs            手册
└── scripts         打包脚本
```

前端没有用任何框架，也不打包，所有 JavaScript 都通过原生 `<script type="module">` 直接加载，方便部署到任意静态服务器，也方便审查。

## 模块说明

系统分成下面几个模块（左侧菜单按这个分组）：

- **数据看板 / 综合总览**：进入系统的默认页面。展示当年累计排放、当月排放、在线计量点数量、未处理报警数量这四个指标，以及月度趋势、能源结构两张图。
- **数据采集**：包括「实时数据」和「计量点管理」两个子页面。前者查看指定计量点的历史曲线和实时推送，后者维护计量点档案（编号、单位、所属企业、MQTT 主题等）。
- **碳排放管理**：包括「碳排放核算」和「排放配额」。核算页可以选时段查看各类能源换算后的 CO₂e；配额页登记企业的年度分配额度，跟踪累计使用情况。
- **报警与报送**：「报警管理」维护报警规则并查看报警事件流转记录；「数据报送」用于生成报送快照并记录政府平台的提交状态。
- **系统管理**：包括组织结构、账户、操作日志。仅单位管理员及以上角色可见。

## 技术栈

服务端基于 Node.js 20 和 TypeScript。Web 框架用 Fastify 4，比较轻。关系型数据用 Prisma 5 + SQLite，便于单机部署；时序数据（计量点读数）走 InfluxDB 2.x，因为量大且需要按时间窗口聚合。计量点的数据来源主要是 MQTT，使用 Eclipse Mosquitto 作为 broker，HTTP 接口也支持手工补录。

前端没有引入任何 UI 框架，使用浏览器原生的 Web Components 实现复用（`<iecsp-card>`、`<iecsp-chart>`）。图表（折线、柱状、环形、仪表盘）全部基于 Canvas 自己画，没有用 ECharts、Chart.js 之类的第三方库。这样做的好处是部署轻、定制方便，缺点是初期开发量大一些。

## 部署步骤

下面是从零部署的步骤。已经装好 Node 20+、npm 9+ 和 Docker 的话直接照着做即可。

第一步，启动 InfluxDB 和 Mosquitto：

```bash
docker compose up -d influxdb mosquitto
```

如果暂时不接 MQTT、也不存时序数据（比如演示环境），可以跳过这步，系统在没有 InfluxDB 时也能跑，只是历史曲线会是空的。

第二步，准备配置文件：

```bash
cp .env.example .env
# 然后编辑 .env，至少修改 JWT_SECRET
```

第三步，安装依赖、初始化数据库、灌入示例数据：

```bash
npm install
npm run migrate
npm run seed
```

第四步，启动：

```bash
# 开发模式（带热重载）
npm run dev

# 生产模式
npm run build
npm start
```

服务起来后访问 `http://localhost:7090` 即可。默认账号：

- 管理员：`admin` / `Sjcj@2026`
- 单位管理员：`parkadmin` / `Parkadmin@2026`
- 数据员：`steward` / `Steward@2026`
- 查看人员：`observer` / `Observer@2026`

部署到生产环境务必修改这些初始密码，并替换 `.env` 中的 `JWT_SECRET`。

## 接口规范

所有 HTTP 接口前缀 `/api/v1`，统一返回 JSON：

```
{ "ok": true,  "data": ... }
{ "ok": false, "error": "code", "message": "..." }
```

需要登录的接口都在 `Authorization: Bearer <token>` 中带 Token，登录接口返回的 token 默认 7 天有效。

实时通道使用 WebSocket，路径 `/ws`，消息格式：

```json
{ "type": "meter" | "risk" | "hello" | "ping", "payload": { ... } }
```

## 历史版本

v1 是 React + Express 实现的版本，已不再维护，归档在 git tag `v1.0-original` 和分支 `v1-archive`。
