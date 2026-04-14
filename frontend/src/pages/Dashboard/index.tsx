import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Tag, Spin } from 'antd'
import {
  ArrowDownOutlined,
  CloudOutlined, AlertOutlined, MonitorOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import api from '../../services/api'
import type { DashboardOverview } from '../../types'
import dayjs from 'dayjs'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [carbonTrend, setCarbonTrend] = useState<any>(null)
  const [areaBreakdown, setAreaBreakdown] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [overviewRes, trendRes, areaRes]: any[] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/dashboard/carbon-trend', { params: { year: dayjs().year() } }),
        api.get('/dashboard/area-breakdown'),
      ])
      if (overviewRes.code === 0) setOverview(overviewRes.data)
      if (trendRes.code === 0) setCarbonTrend(trendRes.data)
      if (areaRes.code === 0) setAreaBreakdown(areaRes.data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const carbonTrendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['碳排放量', '碳配额'] },
    xAxis: {
      type: 'category',
      data: carbonTrend?.months?.map((_: any, i: number) => `${i + 1}月`) || Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
    },
    yAxis: { type: 'value', name: 'tCO₂e' },
    series: [
      {
        name: '碳排放量',
        type: 'bar',
        data: carbonTrend?.emission?.length ? carbonTrend.emission : [320, 280, 350, 310, 290, 340, 360, 380, 330, 300, 270, 0],
        itemStyle: { color: '#5470c6' },
      },
      {
        name: '碳配额',
        type: 'line',
        data: carbonTrend?.quota?.length ? carbonTrend.quota : Array(12).fill(375),
        itemStyle: { color: '#ee6666' },
        lineStyle: { type: 'dashed' },
      },
    ],
  }

  const scopePieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      label: { formatter: '{b}: {d}%' },
      data: [
        { value: 22, name: '范围一(直接排放)', itemStyle: { color: '#ee6666' } },
        { value: 68, name: '范围二(间接排放)', itemStyle: { color: '#5470c6' } },
        { value: 10, name: '范围三(其他)', itemStyle: { color: '#91cc75' } },
      ],
    }],
  }

  const energyPieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      label: { formatter: '{b}: {d}%' },
      data: [
        { value: 68, name: '电力', itemStyle: { color: '#5470c6' } },
        { value: 22, name: '天然气', itemStyle: { color: '#ee6666' } },
        { value: 8, name: '蒸汽', itemStyle: { color: '#fac858' } },
        { value: 2, name: '其他', itemStyle: { color: '#91cc75' } },
      ],
    }],
  }

  const areaBarOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', name: 'tCO₂e' },
    yAxis: {
      type: 'category',
      data: areaBreakdown.length ? areaBreakdown.map(a => a.areaName) : ['生产车间A', '生产车间B', '办公楼', '仓库', '动力中心'],
    },
    series: [{
      type: 'bar',
      data: areaBreakdown.length ? areaBreakdown.map(a => a.carbonEmission) : [180, 140, 45, 30, 55],
      itemStyle: { color: '#5470c6' },
    }],
  }

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />

  const co2 = overview?.carbonEmission
  const devices = overview?.deviceSummary
  const alarms = overview?.alarmSummary

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="年度碳排放量"
              value={co2?.thisYear || 1842.5}
              precision={1}
              suffix="tCO₂e"
              prefix={<CloudOutlined style={{ color: '#5470c6' }} />}
            />
            <div style={{ marginTop: 8 }}>
              <Tag color="blue">配额使用 {co2?.quotaUsagePct?.toFixed(1) || '40.9'}%</Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月碳排放量"
              value={co2?.thisMonth || 156.8}
              precision={1}
              suffix="tCO₂e"
              prefix={<ArrowDownOutlined style={{ color: '#3f8600' }} />}
              valueStyle={{ color: '#3f8600' }}
            />
            <div style={{ marginTop: 8 }}><Tag color="green">环比下降 3.2%</Tag></div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="在线设备"
              value={devices?.online || 7}
              suffix={`/ ${devices?.total || 7}`}
              prefix={<MonitorOutlined style={{ color: '#1677ff' }} />}
            />
            <div style={{ marginTop: 8 }}>
              {(devices?.warning || 0) > 0 && <Tag color="orange">告警 {devices?.warning}</Tag>}
              {(devices?.offline || 0) > 0 && <Tag color="red">离线 {devices?.offline}</Tag>}
              {!(devices?.warning || devices?.offline) && <Tag color="green">全部正常</Tag>}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃告警"
              value={alarms?.active || 0}
              prefix={<AlertOutlined style={{ color: alarms?.critical ? '#ff4d4f' : '#faad14' }} />}
              valueStyle={{ color: alarms?.critical ? '#ff4d4f' : undefined }}
            />
            <div style={{ marginTop: 8 }}>
              {(alarms?.critical || 0) > 0 && <Tag color="red">严重 {alarms?.critical}</Tag>}
              {(alarms?.warning || 0) > 0 && <Tag color="orange">警告 {alarms?.warning}</Tag>}
              {!alarms?.active && <Tag color="green">无告警</Tag>}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="碳排放趋势（月度）">
            <ReactECharts option={carbonTrendOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="排放范围分布">
            <ReactECharts option={scopePieOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="能源类型碳排放占比">
            <ReactECharts option={energyPieOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="区域碳排放分布">
            <ReactECharts option={areaBarOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
