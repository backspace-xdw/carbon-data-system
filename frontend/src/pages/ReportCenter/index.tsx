import { useState } from 'react'
import { Card, Form, Select, DatePicker, Button, Table, Tag, message, Row, Col, Statistic, Space, Progress, Descriptions } from 'antd'
import { FileExcelOutlined, FilePdfOutlined, DownloadOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface ReportRecord {
  id: string
  title: string
  type: string
  period_start: string
  period_end: string
  status: string
  file_format: string
  file_size?: number
  generated_by?: string
  created_at: string
}

export default function ReportCenter() {
  const [generating, setGenerating] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null)
  const [reports] = useState<ReportRecord[]>([
    { id: '1', title: '2026年3月碳排放月报', type: 'monthly', period_start: '2026-03-01', period_end: '2026-03-31', status: 'completed', file_format: 'xlsx', file_size: 256000, generated_by: 'admin', created_at: '2026-04-01 08:30:00' },
    { id: '2', title: '2026年Q1碳排放季报', type: 'quarterly', period_start: '2026-01-01', period_end: '2026-03-31', status: 'completed', file_format: 'pdf', file_size: 1280000, generated_by: 'admin', created_at: '2026-04-02 09:15:00' },
    { id: '3', title: '2026年2月碳排放月报', type: 'monthly', period_start: '2026-02-01', period_end: '2026-02-28', status: 'completed', file_format: 'xlsx', file_size: 248000, generated_by: 'admin', created_at: '2026-03-01 08:00:00' },
    { id: '4', title: '2026年1月碳排放月报', type: 'monthly', period_start: '2026-01-01', period_end: '2026-01-31', status: 'completed', file_format: 'xlsx', file_size: 262000, generated_by: 'admin', created_at: '2026-02-01 08:00:00' },
    { id: '5', title: '2025年度碳排放年报', type: 'annual', period_start: '2025-01-01', period_end: '2025-12-31', status: 'completed', file_format: 'pdf', file_size: 3500000, generated_by: 'admin', created_at: '2026-01-15 10:00:00' },
  ])

  const typeMap: Record<string, string> = { monthly: '月报', quarterly: '季报', annual: '年报', custom: '自定义' }
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '--'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      message.success('报表生成完成')
    }, 2000)
  }

  const handlePreview = (record: ReportRecord) => {
    setSelectedReport(record)
    setPreviewVisible(true)
  }

  const columns = [
    { title: '报告标题', dataIndex: 'title', key: 'title', width: 250 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80, render: (t: string) => <Tag>{typeMap[t] || t}</Tag> },
    { title: '报告周期', key: 'period', width: 200, render: (_: any, r: ReportRecord) => `${r.period_start} ~ ${r.period_end}` },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => <Tag color={s === 'completed' ? 'green' : s === 'generating' ? 'orange' : 'red'}>
        {s === 'completed' ? '已完成' : s === 'generating' ? '生成中' : '失败'}
      </Tag>,
    },
    {
      title: '格式', dataIndex: 'file_format', key: 'file_format', width: 100,
      render: (f: string) => f === 'xlsx'
        ? <Tag icon={<FileExcelOutlined />} color="green">Excel</Tag>
        : <Tag icon={<FilePdfOutlined />} color="red">PDF</Tag>,
    },
    { title: '大小', dataIndex: 'file_size', key: 'file_size', width: 100, render: formatFileSize },
    { title: '生成者', dataIndex: 'generated_by', key: 'generated_by', width: 80 },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 160 },
    {
      title: '操作', key: 'action', width: 150,
      render: (_: any, record: ReportRecord) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>预览</Button>
          <Button type="link" size="small" icon={<DownloadOutlined />}>下载</Button>
        </Space>
      ),
    },
  ]

  // 报表汇总统计
  const completedCount = reports.filter(r => r.status === 'completed').length
  const monthlyCount = reports.filter(r => r.type === 'monthly').length

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card><Statistic title="报表总数" value={reports.length} suffix="份" /></Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card><Statistic title="已完成" value={completedCount} suffix="份" valueStyle={{ color: '#3f8600' }} /></Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card><Statistic title="月报数量" value={monthlyCount} suffix="份" /></Card>
        </Col>
      </Row>

      {/* 生成新报表 */}
      <Card title="生成新报表" style={{ marginBottom: 16 }} extra={<Button type="primary" icon={<PlusOutlined />} loading={generating} onClick={handleGenerate}>立即生成</Button>}>
        <Form layout="inline">
          <Form.Item label="报表类型" name="type" initialValue="monthly">
            <Select style={{ width: 120 }}
              options={[{ value: 'monthly', label: '月报' }, { value: 'quarterly', label: '季报' }, { value: 'annual', label: '年报' }]} />
          </Form.Item>
          <Form.Item label="时间范围" name="dateRange" initialValue={[dayjs().startOf('month'), dayjs().endOf('month')]}>
            <RangePicker />
          </Form.Item>
          <Form.Item label="范围" name="scope" initialValue="all">
            <Select style={{ width: 120 }} options={[{ value: 'all', label: '全部范围' }, { value: 'scope1', label: '范围一' }, { value: 'scope2', label: '范围二' }]} />
          </Form.Item>
          <Form.Item label="格式" name="format" initialValue="xlsx">
            <Select style={{ width: 100 }} options={[{ value: 'xlsx', label: 'Excel' }, { value: 'pdf', label: 'PDF' }]} />
          </Form.Item>
        </Form>
      </Card>

      {/* 报表列表 */}
      <Card title="历史报表">
        <Table dataSource={reports} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      {/* 报表预览抽屉 — 简化版用Descriptions展示 */}
      {previewVisible && selectedReport && (
        <Card title={`报表预览: ${selectedReport.title}`} style={{ marginTop: 16 }}
          extra={<Button onClick={() => setPreviewVisible(false)}>关闭</Button>}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="报表名称">{selectedReport.title}</Descriptions.Item>
            <Descriptions.Item label="类型">{typeMap[selectedReport.type]}</Descriptions.Item>
            <Descriptions.Item label="报告周期">{selectedReport.period_start} ~ {selectedReport.period_end}</Descriptions.Item>
            <Descriptions.Item label="格式">{selectedReport.file_format.toUpperCase()}</Descriptions.Item>
            <Descriptions.Item label="文件大小">{formatFileSize(selectedReport.file_size)}</Descriptions.Item>
            <Descriptions.Item label="生成时间">{selectedReport.created_at}</Descriptions.Item>
          </Descriptions>
          <Card title="报表摘要" style={{ marginTop: 16 }} type="inner">
            <Row gutter={16}>
              <Col span={6}><Statistic title="总碳排放" value={320.5} suffix="tCO₂e" /></Col>
              <Col span={6}><Statistic title="配额使用" value={71.2} suffix="%" /></Col>
              <Col span={6}><Statistic title="环比变化" value={-3.2} suffix="%" prefix={<Tag color="green">下降</Tag>} /></Col>
              <Col span={6}>
                <div>配额进度</div>
                <Progress percent={71.2} status="active" strokeColor="#5470c6" />
              </Col>
            </Row>
          </Card>
        </Card>
      )}
    </div>
  )
}
