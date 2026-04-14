import { useEffect, useState } from 'react'
import { Card, Table, Tag, Button, Space, Select, message, Modal, Input } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import api from '../../services/api'
import type { AlarmRecord } from '../../types'

const severityMap: Record<string, { color: string; text: string }> = {
  critical: { color: 'red', text: '严重' },
  warning: { color: 'orange', text: '警告' },
  info: { color: 'blue', text: '信息' },
}

const statusMap: Record<string, { color: string; text: string }> = {
  active: { color: 'red', text: '活跃' },
  acknowledged: { color: 'orange', text: '已确认' },
  resolved: { color: 'green', text: '已解除' },
}

export default function AlarmCenter() {
  const [alarms, setAlarms] = useState<AlarmRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => { loadAlarms() }, [statusFilter])

  const loadAlarms = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (statusFilter) params.status = statusFilter
      const res: any = await api.get('/alarms', { params })
      if (res.code === 0) setAlarms(res.data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleAcknowledge = (id: string) => {
    Modal.confirm({
      title: '确认告警',
      content: <Input.TextArea placeholder="备注信息（可选）" />,
      onOk: async () => {
        await api.put(`/alarms/${id}/acknowledge`, { note: '' })
        message.success('已确认')
        loadAlarms()
      },
    })
  }

  const handleResolve = (id: string) => {
    Modal.confirm({
      title: '解除告警',
      content: <Input.TextArea placeholder="解除原因" />,
      onOk: async () => {
        await api.put(`/alarms/${id}/resolve`, { note: '' })
        message.success('已解除')
        loadAlarms()
      },
    })
  }

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '类别', dataIndex: 'category', key: 'category' },
    {
      title: '严重程度', dataIndex: 'severity', key: 'severity',
      render: (s: string) => <Tag color={severityMap[s]?.color}>{severityMap[s]?.text}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>,
    },
    { title: '当前值', dataIndex: 'current_value', key: 'current_value', render: (v: number) => v?.toFixed(2) || '--' },
    { title: '时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作', key: 'action',
      render: (_: any, r: AlarmRecord) => (
        <Space>
          {r.status === 'active' && <Button size="small" onClick={() => handleAcknowledge(r.id)}>确认</Button>}
          {r.status !== 'resolved' && <Button size="small" type="primary" onClick={() => handleResolve(r.id)}>解除</Button>}
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="告警中心"
      extra={
        <Space>
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 120 }} allowClear placeholder="状态筛选"
            options={[
              { value: 'active', label: '活跃' },
              { value: 'acknowledged', label: '已确认' },
              { value: 'resolved', label: '已解除' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={loadAlarms}>刷新</Button>
        </Space>
      }
    >
      <Table dataSource={alarms} columns={columns} rowKey="id" loading={loading} />
    </Card>
  )
}
