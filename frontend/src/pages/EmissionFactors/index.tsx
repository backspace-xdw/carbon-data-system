import { useEffect, useState } from 'react'
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Select, InputNumber, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '../../services/api'
import type { EmissionFactor } from '../../types'

const energyTypeMap: Record<string, string> = {
  electricity: '电力', gas: '天然气', water: '水', steam: '蒸汽', diesel: '柴油', coal: '煤炭',
}

export default function EmissionFactors() {
  const [factors, setFactors] = useState<EmissionFactor[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => { loadFactors() }, [])

  const loadFactors = async () => {
    setLoading(true)
    try {
      const res: any = await api.get('/emission-factors')
      if (res.code === 0) setFactors(res.data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleCreate = async (values: any) => {
    try {
      const res: any = await api.post('/emission-factors', values)
      if (res.code === 0) { message.success('创建成功'); setModalOpen(false); form.resetFields(); loadFactors() }
    } catch { message.error('创建失败') }
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '能源类型', dataIndex: 'energy_type', key: 'energy_type', render: (t: string) => energyTypeMap[t] || t },
    { title: '排放因子', dataIndex: 'factor_value', key: 'factor_value', render: (v: number) => v?.toFixed(6) },
    { title: '单位', dataIndex: 'factor_unit', key: 'factor_unit' },
    { title: '范围', dataIndex: 'scope', key: 'scope', render: (s: string) => <Tag color="blue">{s}</Tag> },
    { title: '区域', dataIndex: 'region', key: 'region' },
    { title: '来源', dataIndex: 'source', key: 'source' },
    { title: '年份', dataIndex: 'valid_year', key: 'valid_year' },
    { title: '默认', dataIndex: 'is_default', key: 'is_default', render: (v: number) => v ? <Tag color="green">默认</Tag> : null },
  ]

  return (
    <Card
      title="排放因子库"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadFactors}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加</Button>
        </Space>
      }
    >
      <Table dataSource={factors} columns={columns} rowKey="id" loading={loading} pagination={false} />

      <Modal title="添加排放因子" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="energy_type" label="能源类型" rules={[{ required: true }]}>
            <Select options={Object.entries(energyTypeMap).map(([v, l]) => ({ value: v, label: l }))} />
          </Form.Item>
          <Form.Item name="factor_value" label="排放因子值" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} step={0.000001} /></Form.Item>
          <Form.Item name="factor_unit" label="因子单位" rules={[{ required: true }]}><Input placeholder="如: tCO2e/kWh" /></Form.Item>
          <Form.Item name="source_unit" label="源单位" rules={[{ required: true }]}><Input placeholder="如: kWh" /></Form.Item>
          <Form.Item name="scope" label="范围" rules={[{ required: true }]}>
            <Select options={[{ value: 'scope1', label: '范围一' }, { value: 'scope2', label: '范围二' }, { value: 'scope3', label: '范围三' }]} />
          </Form.Item>
          <Form.Item name="region" label="适用区域"><Input placeholder="如: 华东电网" /></Form.Item>
          <Form.Item name="source" label="数据来源"><Input placeholder="如: 生态环境部2023年度" /></Form.Item>
          <Form.Item name="valid_year" label="有效年份"><InputNumber style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
