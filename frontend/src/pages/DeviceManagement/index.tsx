import { useEffect, useState } from 'react'
import { Card, Table, Button, Tag, Space, Modal, Form, Input, Select, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '../../services/api'
import type { Device } from '../../types'

const statusMap: Record<string, { color: string; text: string }> = {
  online: { color: 'green', text: '在线' },
  offline: { color: 'red', text: '离线' },
  warning: { color: 'orange', text: '告警' },
  maintenance: { color: 'blue', text: '维护' },
}

const energyTypeMap: Record<string, string> = {
  electricity: '电力', gas: '天然气', water: '水', steam: '蒸汽',
}

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => { loadDevices() }, [])

  const loadDevices = async () => {
    setLoading(true)
    try {
      const res: any = await api.get('/devices')
      if (res.code === 0) setDevices(res.data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleCreate = async (values: any) => {
    try {
      const res: any = await api.post('/devices', values)
      if (res.code === 0) {
        message.success('设备创建成功')
        setModalOpen(false)
        form.resetFields()
        loadDevices()
      }
    } catch { message.error('创建失败') }
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除设备 ${id} 吗？`,
      onOk: async () => {
        await api.delete(`/devices/${id}`)
        message.success('已删除')
        loadDevices()
      },
    })
  }

  const columns = [
    { title: '设备ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '能源类型', dataIndex: 'energy_type', key: 'energy_type', render: (t: string) => energyTypeMap[t] || t },
    { title: '区域', dataIndex: 'area_name', key: 'area_name' },
    { title: '协议', dataIndex: 'protocol', key: 'protocol', render: (t: string) => <Tag>{t.toUpperCase()}</Tag> },
    { title: '范围', dataIndex: 'scope', key: 'scope', render: (s: string) => <Tag color="blue">{s}</Tag> },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>,
    },
    {
      title: '操作', key: 'action',
      render: (_: any, record: Device) => (
        <Space>
          <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="设备管理"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadDevices}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加设备</Button>
        </Space>
      }
    >
      <Table dataSource={devices} columns={columns} rowKey="id" loading={loading} />

      <Modal title="添加设备" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="id" label="设备ID"><Input placeholder="如: EM-004" /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="energy_type" label="能源类型" rules={[{ required: true }]}>
            <Select options={[
              { value: 'electricity', label: '电力' }, { value: 'gas', label: '天然气' },
              { value: 'water', label: '水' }, { value: 'steam', label: '蒸汽' },
            ]} />
          </Form.Item>
          <Form.Item name="protocol" label="通信协议" rules={[{ required: true }]}>
            <Select options={[
              { value: 'mqtt', label: 'MQTT' }, { value: 'modbus', label: 'Modbus TCP' },
              { value: 'http', label: 'HTTP API' }, { value: 'manual', label: '手动录入' },
            ]} />
          </Form.Item>
          <Form.Item name="area_id" label="所属区域" rules={[{ required: true }]}>
            <Select options={[
              { value: 'area-workshop-a', label: '生产车间A' }, { value: 'area-workshop-b', label: '生产车间B' },
              { value: 'area-office', label: '办公楼' }, { value: 'area-warehouse', label: '仓库' },
              { value: 'area-power', label: '动力中心' },
            ]} />
          </Form.Item>
          <Form.Item name="scope" label="碳排放范围" initialValue="scope2">
            <Select options={[
              { value: 'scope1', label: '范围一(直接排放)' },
              { value: 'scope2', label: '范围二(间接排放)' },
              { value: 'scope3', label: '范围三(其他)' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
