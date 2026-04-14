import { useEffect, useState } from 'react'
import { Card, Tabs, Table, Button, Form, Input, message, Tag, Modal } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import api from '../../services/api'
import type { Area } from '../../types'

export default function SystemSettings() {
  const [areas, setAreas] = useState<Area[]>([])
  const [, setConfig] = useState<Record<string, string>>({})
  const [areaModalOpen, setAreaModalOpen] = useState(false)
  const [areaForm] = Form.useForm()
  const [configForm] = Form.useForm()

  useEffect(() => { loadAreas(); loadConfig() }, [])

  const loadAreas = async () => {
    try {
      const res: any = await api.get('/system/areas')
      if (res.code === 0) setAreas(res.data)
    } catch { /* ignore */ }
  }

  const loadConfig = async () => {
    try {
      const res: any = await api.get('/system/config')
      if (res.code === 0) { setConfig(res.data); configForm.setFieldsValue(res.data) }
    } catch { /* ignore */ }
  }

  const handleCreateArea = async (values: any) => {
    try {
      const res: any = await api.post('/system/areas', values)
      if (res.code === 0) { message.success('区域创建成功'); setAreaModalOpen(false); areaForm.resetFields(); loadAreas() }
    } catch { message.error('创建失败') }
  }

  const handleUpdateConfig = async (values: any) => {
    try {
      await api.put('/system/config', values)
      message.success('配置已更新')
    } catch { message.error('更新失败') }
  }

  const areaColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (t: string) => <Tag>{t}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order' },
  ]

  const tabItems = [
    {
      key: 'areas',
      label: '区域管理',
      children: (
        <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setAreaModalOpen(true)}>添加区域</Button>}>
          <Table dataSource={areas} columns={areaColumns} rowKey="id" pagination={false} />
        </Card>
      ),
    },
    {
      key: 'config',
      label: '系统配置',
      children: (
        <Card>
          <Form form={configForm} layout="vertical" onFinish={handleUpdateConfig} style={{ maxWidth: 500 }}>
            <Form.Item name="company_name" label="企业名称"><Input /></Form.Item>
            <Form.Item name="carbon_calc_interval" label="碳排放计算间隔(秒)"><Input /></Form.Item>
            <Form.Item name="data_simulator_enabled" label="数据模拟器"><Input /></Form.Item>
            <Form.Item><Button type="primary" htmlType="submit">保存配置</Button></Form.Item>
          </Form>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <Tabs items={tabItems} />
      <Modal title="添加区域" open={areaModalOpen} onCancel={() => setAreaModalOpen(false)} onOk={() => areaForm.submit()}>
        <Form form={areaForm} layout="vertical" onFinish={handleCreateArea}>
          <Form.Item name="name" label="区域名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型" initialValue="production"><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
