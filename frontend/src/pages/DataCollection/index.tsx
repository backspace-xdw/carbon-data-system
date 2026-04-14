import { useState } from 'react'
import { Card, Form, Select, DatePicker, InputNumber, Button, message, Row, Col, Divider } from 'antd'
import api from '../../services/api'
import dayjs from 'dayjs'

export default function DataCollection() {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const res: any = await api.post('/data/manual-input', {
        deviceId: values.deviceId,
        energyType: values.energyType,
        timestamp: values.timestamp?.toISOString(),
        readings: values.readings,
      })
      if (res.code === 0) {
        message.success('数据录入成功')
        form.resetFields()
      }
    } catch { message.error('录入失败') }
    setLoading(false)
  }

  return (
    <Card title="手动数据采集">
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 800 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="deviceId" label="设备" rules={[{ required: true }]}>
              <Select placeholder="选择设备" options={[
                { value: 'EM-001', label: 'EM-001 1#车间总电表' },
                { value: 'EM-002', label: 'EM-002 2#车间总电表' },
                { value: 'GM-001', label: 'GM-001 1#车间燃气表' },
                { value: 'WM-001', label: 'WM-001 总水表' },
                { value: 'SM-001', label: 'SM-001 蒸汽表' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="energyType" label="能源类型" rules={[{ required: true }]}>
              <Select options={[
                { value: 'electricity', label: '电力' }, { value: 'gas', label: '天然气' },
                { value: 'water', label: '水' }, { value: 'steam', label: '蒸汽' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="timestamp" label="采集时间" initialValue={dayjs()}>
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider>仪表读数</Divider>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name={['readings', 'total_energy']} label="累计读数">
              <InputNumber style={{ width: '100%' }} placeholder="kWh / m³ / t" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name={['readings', 'active_power']} label="瞬时功率/流量">
              <InputNumber style={{ width: '100%' }} placeholder="kW / m³/h / t/h" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name={['readings', 'voltage']} label="电压/压力">
              <InputNumber style={{ width: '100%' }} placeholder="V / MPa" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>提交数据</Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
