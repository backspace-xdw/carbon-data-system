import { useEffect, useState, useCallback } from 'react'
import { Card, Tabs, Row, Col, Table, Badge, Statistic, Tag, Select, Space } from 'antd'
import {
  ThunderboltOutlined,
  FireOutlined,
  ExperimentOutlined,
  CloudOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import api from '../../services/api'
import { getSocket } from '../../services/socket'
import type { EnergyRealtimeData } from '../../types'

const energyTabs = [
  { key: 'electricity', label: '电力', unit: 'kW', totalUnit: 'kWh', icon: <ThunderboltOutlined />, color: '#5470c6' },
  { key: 'gas', label: '天然气', unit: 'm³/h', totalUnit: 'm³', icon: <FireOutlined />, color: '#ee6666' },
  { key: 'water', label: '水', unit: 'm³/h', totalUnit: 'm³', icon: <ExperimentOutlined />, color: '#73c0de' },
  { key: 'steam', label: '蒸汽', unit: 't/h', totalUnit: 't', icon: <CloudOutlined />, color: '#fac858' },
]

// 根据能源类型获取主要字段
const getMainField = (type: string): string => {
  switch (type) {
    case 'electricity': return 'active_power'
    case 'gas': return 'flow_rate'
    case 'water': return 'flow_rate'
    case 'steam': return 'flow_rate'
    default: return 'active_power'
  }
}

// 根据能源类型获取累计字段
const getTotalField = (type: string): string => {
  switch (type) {
    case 'electricity': return 'total_energy'
    case 'gas': return 'total_volume'
    case 'water': return 'total_volume'
    case 'steam': return 'total_mass'
    default: return 'total_energy'
  }
}

export default function EnergyMonitor() {
  const [activeTab, setActiveTab] = useState('electricity')
  const [realtimeData, setRealtimeData] = useState<EnergyRealtimeData[]>([])
  const [areaFilter, setAreaFilter] = useState<string>('')
  const [trendHistory, setTrendHistory] = useState<{ time: string; value: number }[]>([])

  // 加载实时数据
  const loadRealtime = useCallback(async () => {
    try {
      const params: any = { energyType: activeTab }
      if (areaFilter) params.areaId = areaFilter
      const res: any = await api.get('/data/realtime', { params })
      if (res.code === 0) setRealtimeData(res.data)
    } catch { /* ignore */ }
  }, [activeTab, areaFilter])

  useEffect(() => {
    loadRealtime()
    const socket = getSocket()
    socket.emit('subscribe:energy', { energyTypes: [activeTab] })
    socket.on('energy:realtime', (data: EnergyRealtimeData) => {
      if (data.energyType === activeTab) {
        setRealtimeData(prev => {
          const idx = prev.findIndex(d => d.deviceId === data.deviceId)
          if (idx >= 0) { const next = [...prev]; next[idx] = data; return next }
          return [...prev, data]
        })
        // 更新趋势历史
        const mainField = getMainField(activeTab)
        const val = data.data?.[mainField]
        if (val !== undefined) {
          setTrendHistory(prev => {
            const next = [...prev, { time: new Date().toLocaleTimeString(), value: val }]
            return next.length > 60 ? next.slice(-60) : next
          })
        }
      }
    })
    return () => { socket.off('energy:realtime') }
  }, [activeTab, loadRealtime])

  // 定时刷新
  useEffect(() => {
    const timer = setInterval(loadRealtime, 30000)
    return () => clearInterval(timer)
  }, [loadRealtime])

  // 当前Tab信息
  const currentTab = energyTabs.find(t => t.key === activeTab)!
  const mainField = getMainField(activeTab)
  const totalField = getTotalField(activeTab)

  // 计算汇总统计
  const totalPower = realtimeData.reduce((sum, d) => sum + (d.data?.[mainField] || 0), 0)
  const totalConsumption = realtimeData.reduce((sum, d) => sum + (d.data?.[totalField] || 0), 0)
  const onlineCount = realtimeData.length
  const maxPower = realtimeData.length > 0 ? Math.max(...realtimeData.map(d => d.data?.[mainField] || 0)) : 0

  // 生成24小时趋势数据
  const now = Date.now()
  const timeLabels = Array.from({ length: 24 }, (_, i) => {
    const t = new Date(now - (23 - i) * 3600000)
    return `${t.getHours().toString().padStart(2, '0')}:00`
  })
  const demoTrendData = Array.from({ length: 24 }, (_, i) => {
    // 模拟白天高、夜间低的用能曲线
    const hour = (new Date(now - (23 - i) * 3600000)).getHours()
    const base = activeTab === 'electricity' ? 80 : activeTab === 'gas' ? 20 : activeTab === 'water' ? 10 : 6
    const dayFactor = (hour >= 8 && hour <= 18) ? 1.5 : (hour >= 6 && hour <= 20) ? 1.2 : 0.6
    return +(base * dayFactor + (Math.random() - 0.5) * base * 0.3).toFixed(2)
  })

  // 24小时趋势图配置
  const trendOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0]
        return `${p.axisValue}<br/>${p.seriesName}: ${p.value} ${currentTab.unit}`
      },
    },
    grid: { left: 60, right: 30, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: { interval: 2, rotate: 0 },
    },
    yAxis: {
      type: 'value',
      name: currentTab.unit,
      nameTextStyle: { padding: [0, 40, 0, 0] },
    },
    series: [{
      name: `${currentTab.label}消耗`,
      type: 'line',
      smooth: true,
      data: demoTrendData,
      areaStyle: { opacity: 0.25, color: currentTab.color },
      itemStyle: { color: currentTab.color },
      lineStyle: { width: 2 },
      symbol: 'none',
    }],
  }

  // 各区域能耗对比图配置
  const areaNames = ['生产车间A', '生产车间B', '办公楼', '仓库', '动力中心']
  const areaData = activeTab === 'electricity'
    ? [78, 62, 13, 8, 25]
    : activeTab === 'gas' ? [15, 0, 0, 0, 25]
    : activeTab === 'water' ? [3, 2, 1.5, 0.5, 1]
    : [0, 0, 0, 0, 5]
  const areaCompareOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 80, right: 30, top: 20, bottom: 30 },
    xAxis: { type: 'value', name: currentTab.unit },
    yAxis: { type: 'category', data: areaNames },
    series: [{
      type: 'bar',
      data: areaData,
      itemStyle: { color: currentTab.color, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', formatter: `{c} ${currentTab.unit}` },
    }],
  }

  // 设备数据表格列定义
  const columns = [
    { title: '设备ID', dataIndex: 'deviceId', key: 'deviceId', width: 100 },
    {
      title: '设备名称', key: 'deviceName',
      render: (_: any, record: EnergyRealtimeData) => {
        const nameMap: Record<string, string> = {
          'EM-001': '1#车间总电表', 'EM-002': '2#车间总电表', 'EM-003': '办公楼电表',
          'GM-001': '1#车间燃气表', 'GM-002': '动力中心燃气表',
          'WM-001': '总水表', 'SM-001': '动力中心蒸汽表',
        }
        return nameMap[record.deviceId] || record.deviceId
      },
    },
    {
      title: '所属区域', key: 'area',
      render: (_: any, record: EnergyRealtimeData) => {
        const areaMap: Record<string, string> = {
          'area-workshop-a': '生产车间A', 'area-workshop-b': '生产车间B',
          'area-office': '办公楼', 'area-warehouse': '仓库', 'area-power': '动力中心',
        }
        return areaMap[record.areaId] || record.areaId
      },
    },
    {
      title: '状态', key: 'status', width: 80,
      render: () => <Badge status="success" text="在线" />,
    },
    {
      title: `瞬时值 (${currentTab.unit})`, key: 'instantValue',
      render: (_: any, record: EnergyRealtimeData) => {
        const val = record.data?.[mainField]
        return val !== undefined ? <span style={{ fontWeight: 'bold', color: currentTab.color }}>{val.toFixed(2)}</span> : '--'
      },
    },
    {
      title: `累计值 (${currentTab.totalUnit})`, key: 'totalValue',
      render: (_: any, record: EnergyRealtimeData) => {
        const val = record.data?.[totalField]
        return val !== undefined ? val.toFixed(1) : '--'
      },
    },
    ...(activeTab === 'electricity' ? [
      {
        title: '电压 (V)', key: 'voltage',
        render: (_: any, record: EnergyRealtimeData) => record.data?.voltage?.toFixed(1) || '--',
      },
      {
        title: '电流 (A)', key: 'current',
        render: (_: any, record: EnergyRealtimeData) => record.data?.current?.toFixed(1) || '--',
      },
      {
        title: '功率因数', key: 'pf',
        render: (_: any, record: EnergyRealtimeData) => record.data?.power_factor?.toFixed(3) || '--',
      },
    ] : []),
    ...(activeTab !== 'electricity' && activeTab !== 'water' ? [
      {
        title: '温度 (°C)', key: 'temperature',
        render: (_: any, record: EnergyRealtimeData) => record.data?.temperature?.toFixed(1) || '--',
      },
    ] : []),
    ...(activeTab !== 'electricity' ? [
      {
        title: '压力 (MPa)', key: 'pressure',
        render: (_: any, record: EnergyRealtimeData) => record.data?.pressure?.toFixed(3) || '--',
      },
    ] : []),
    {
      title: '更新时间', dataIndex: 'timestamp', key: 'timestamp', width: 100,
      render: (t: string) => t ? new Date(t).toLocaleTimeString() : '--',
    },
  ]

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => { setActiveTab(key); setTrendHistory([]) }}
        items={energyTabs.map(t => ({
          key: t.key,
          label: <span>{t.icon} {t.label}</span>,
        }))}
        tabBarExtraContent={
          <Select
            value={areaFilter}
            onChange={setAreaFilter}
            style={{ width: 140 }}
            allowClear
            placeholder="区域筛选"
            options={[
              { value: 'area-workshop-a', label: '生产车间A' },
              { value: 'area-workshop-b', label: '生产车间B' },
              { value: 'area-office', label: '办公楼' },
              { value: 'area-power', label: '动力中心' },
            ]}
          />
        }
      />

      {/* 汇总统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={`当前总${activeTab === 'electricity' ? '功率' : '流量'}`}
              value={totalPower}
              precision={2}
              suffix={currentTab.unit}
              valueStyle={{ color: currentTab.color }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日累计消耗"
              value={totalConsumption}
              precision={1}
              suffix={currentTab.totalUnit}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="峰值"
              value={maxPower}
              precision={2}
              suffix={currentTab.unit}
              valueStyle={{ color: '#ee6666' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="在线设备数"
              value={onlineCount}
              suffix="台"
              prefix={<Badge status="success" />}
            />
          </Card>
        </Col>
      </Row>

      {/* 趋势图 + 区域对比 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title={`${currentTab.label} 消耗趋势（24h）`}>
            <ReactECharts option={trendOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="各区域能耗对比">
            <ReactECharts option={areaCompareOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      {/* 设备实时数据表 */}
      <Card title={`${currentTab.label}设备实时数据`} style={{ marginTop: 16 }}
        extra={<Tag color="green">每10秒自动刷新</Tag>}>
        <Table
          dataSource={realtimeData}
          columns={columns}
          rowKey="deviceId"
          pagination={false}
          size="middle"
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  )
}
