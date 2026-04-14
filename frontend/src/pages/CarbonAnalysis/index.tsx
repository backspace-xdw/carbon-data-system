import { useEffect, useState } from 'react'
import { Card, Row, Col, Select, Space, Statistic, Table, Tag } from 'antd'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import api from '../../services/api'
import dayjs from 'dayjs'

// 碳排放效率指标接口
interface EfficiencyMetric {
  name: string
  current: number
  target: number
  industry: number
  unit: string
  status: 'good' | 'warning' | 'danger'
}

export default function CarbonAnalysis() {
  const [year, setYear] = useState(dayjs().year())
  const [scope, setScope] = useState<string>('all')
  const [trendData, setTrendData] = useState<any>(null)
  const [quotaStatus, setQuotaStatus] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [year, scope])

  const loadData = async () => {
    try {
      const [trendRes, quotaRes]: any[] = await Promise.all([
        api.get('/carbon/trend', { params: { year } }),
        api.get('/carbon/quota-status', { params: { year } }),
      ])
      if (trendRes.code === 0) setTrendData(trendRes.data)
      if (quotaRes.code === 0) setQuotaStatus(quotaRes.data)
    } catch { /* ignore */ }
  }

  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
  const demoEmission = [320, 280, 350, 310, 290, 340, 360, 380, 330, 300, 270, 250]
  const emission = trendData?.values?.length ? trendData.values : demoEmission
  const totalEmission = emission.reduce((a: number, b: number) => a + b, 0)
  const monthlyQuota = quotaStatus?.monthlyQuota || 375

  // 碳排放趋势图
  const trendOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let html = `<b>${params[0].axisValue}</b><br/>`
        params.forEach((p: any) => {
          html += `${p.marker} ${p.seriesName}: ${p.value?.toFixed(1)} tCO₂e<br/>`
        })
        return html
      },
    },
    legend: { data: ['碳排放量', '月度配额', '累计排放'] },
    grid: { left: 60, right: 60, top: 50, bottom: 40 },
    xAxis: { type: 'category', data: months },
    yAxis: [
      { type: 'value', name: '月度排放 (tCO₂e)', position: 'left' },
      { type: 'value', name: '累计排放 (tCO₂e)', position: 'right' },
    ],
    series: [
      {
        name: '碳排放量',
        type: 'bar',
        data: emission,
        itemStyle: {
          color: (params: any) => params.value > monthlyQuota ? '#ee6666' : '#5470c6',
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: '月度配额',
        type: 'line',
        data: Array(12).fill(monthlyQuota),
        itemStyle: { color: '#ee6666' },
        lineStyle: { type: 'dashed', width: 2 },
        symbol: 'none',
      },
      {
        name: '累计排放',
        type: 'line',
        yAxisIndex: 1,
        data: emission.reduce((acc: number[], v: number) => {
          acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + v)
          return acc
        }, []),
        smooth: true,
        itemStyle: { color: '#fac858' },
        lineStyle: { width: 2 },
      },
    ],
  }

  // Scope堆叠图
  const scope1Ratio = 0.22, scope2Ratio = 0.68, scope3Ratio = 0.10
  const scopeStackOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['范围一(直接排放)', '范围二(间接排放)', '范围三(其他间接)'] },
    grid: { left: 60, right: 30, top: 50, bottom: 40 },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', name: 'tCO₂e' },
    series: [
      {
        name: '范围一(直接排放)',
        type: 'bar', stack: 'total',
        data: emission.map((v: number) => +(v * scope1Ratio).toFixed(1)),
        itemStyle: { color: '#ee6666' },
      },
      {
        name: '范围二(间接排放)',
        type: 'bar', stack: 'total',
        data: emission.map((v: number) => +(v * scope2Ratio).toFixed(1)),
        itemStyle: { color: '#5470c6' },
      },
      {
        name: '范围三(其他间接)',
        type: 'bar', stack: 'total',
        data: emission.map((v: number) => +(v * scope3Ratio).toFixed(1)),
        itemStyle: { color: '#91cc75' },
      },
    ],
  }

  // 同比分析图
  const lastYearEmission = emission.map((v: number) => +(v * (1.05 + Math.random() * 0.1)).toFixed(1))
  const yoyOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: [`${year}年`, `${year - 1}年`] },
    grid: { left: 60, right: 30, top: 50, bottom: 40 },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', name: 'tCO₂e' },
    series: [
      { name: `${year}年`, type: 'bar', data: emission, itemStyle: { color: '#5470c6', borderRadius: [4, 4, 0, 0] } },
      { name: `${year - 1}年`, type: 'bar', data: lastYearEmission, itemStyle: { color: '#91cc75', borderRadius: [4, 4, 0, 0] } },
    ],
  }

  // 能源类型碳排放瀑布图
  const waterfallOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 80, right: 30, top: 30, bottom: 40 },
    xAxis: { type: 'category', data: ['电力', '天然气', '蒸汽', '自来水', '合计'] },
    yAxis: { type: 'value', name: 'tCO₂e' },
    series: [
      {
        type: 'bar', stack: 'waterfall',
        data: [0, +(totalEmission * 0.68).toFixed(0), +(totalEmission * 0.68 + totalEmission * 0.22).toFixed(0), +(totalEmission * 0.90).toFixed(0), 0],
        itemStyle: { color: 'transparent' },
      },
      {
        type: 'bar', stack: 'waterfall',
        data: [
          +(totalEmission * 0.68).toFixed(0),
          +(totalEmission * 0.22).toFixed(0),
          +(totalEmission * 0.08).toFixed(0),
          +(totalEmission * 0.02).toFixed(0),
          totalEmission,
        ],
        itemStyle: {
          color: (params: any) => ['#5470c6', '#ee6666', '#fac858', '#91cc75', '#73c0de'][params.dataIndex],
          borderRadius: [4, 4, 0, 0],
        },
        label: { show: true, position: 'top', formatter: '{c} tCO₂e' },
      },
    ],
  }

  // 碳排放效率指标
  const efficiencyMetrics: EfficiencyMetric[] = [
    { name: '单位产值碳排放', current: 0.85, target: 0.80, industry: 0.95, unit: 'tCO₂e/万元', status: 'warning' },
    { name: '单位面积碳排放', current: 0.042, target: 0.040, industry: 0.055, unit: 'tCO₂e/m²', status: 'warning' },
    { name: '人均碳排放', current: 12.5, target: 11.0, industry: 15.0, unit: 'tCO₂e/人', status: 'good' },
    { name: '碳排放强度(电力)', current: 0.58, target: 0.55, industry: 0.65, unit: 'kgCO₂e/kWh', status: 'good' },
  ]

  const efficiencyColumns = [
    { title: '指标名称', dataIndex: 'name', key: 'name' },
    { title: '当前值', dataIndex: 'current', key: 'current', render: (v: number, r: EfficiencyMetric) => `${v} ${r.unit}` },
    { title: '目标值', dataIndex: 'target', key: 'target', render: (v: number, r: EfficiencyMetric) => `${v} ${r.unit}` },
    { title: '行业平均', dataIndex: 'industry', key: 'industry', render: (v: number, r: EfficiencyMetric) => `${v} ${r.unit}` },
    {
      title: '达标状态', dataIndex: 'status', key: 'status',
      render: (s: string) => s === 'good' ? <Tag color="green">达标</Tag> : s === 'warning' ? <Tag color="orange">接近</Tag> : <Tag color="red">超标</Tag>,
    },
  ]

  // 年度配额
  const annualQuota = quotaStatus?.annualQuota || 4500
  const quotaUsagePct = ((totalEmission / annualQuota) * 100)
  const yoyChange = -5.2 // 模拟同比变化

  return (
    <div>
      {/* 筛选工具栏 */}
      <Space style={{ marginBottom: 16 }}>
        <Select value={year} onChange={setYear} style={{ width: 120 }}
          options={[2024, 2025, 2026].map(y => ({ value: y, label: `${y}年` }))} />
        <Select value={scope} onChange={setScope} style={{ width: 140 }}
          options={[
            { value: 'all', label: '全部范围' },
            { value: 'scope1', label: '范围一' },
            { value: 'scope2', label: '范围二' },
            { value: 'scope3', label: '范围三' },
          ]} />
      </Space>

      {/* 汇总卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="年度累计排放" value={totalEmission} precision={1} suffix="tCO₂e" valueStyle={{ color: '#5470c6' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="年度碳配额" value={annualQuota} precision={0} suffix="tCO₂e" />
            <Tag color={quotaUsagePct > 80 ? 'red' : 'blue'} style={{ marginTop: 8 }}>已使用 {quotaUsagePct.toFixed(1)}%</Tag>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="剩余配额" value={annualQuota - totalEmission} precision={1} suffix="tCO₂e"
              valueStyle={{ color: annualQuota - totalEmission > 0 ? '#3f8600' : '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="同比变化"
              value={Math.abs(yoyChange)}
              precision={1}
              suffix="%"
              prefix={yoyChange < 0 ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
              valueStyle={{ color: yoyChange < 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 碳排放趋势 */}
      <Card title="碳排放月度趋势与配额对比" style={{ marginTop: 16 }}>
        <ReactECharts option={trendOption} style={{ height: 380 }} />
      </Card>

      {/* Scope堆叠 + 同比分析 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Scope 范围分布（堆叠）">
            <ReactECharts option={scopeStackOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="同比分析">
            <ReactECharts option={yoyOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      {/* 能源类型瀑布图 + 效率指标 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="各能源类型碳排放贡献">
            <ReactECharts option={waterfallOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="碳排放效率指标">
            <Table dataSource={efficiencyMetrics} columns={efficiencyColumns} rowKey="name" pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
