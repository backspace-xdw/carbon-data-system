import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Avatar, theme } from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  MonitorOutlined,
  FormOutlined,
  AlertOutlined,
  FileTextOutlined,
  SettingOutlined,
  ExperimentOutlined,
  ApartmentOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/auth'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '碳排放总览' },
  { key: '/energy-monitor', icon: <ThunderboltOutlined />, label: '能耗监测' },
  { key: '/carbon-analysis', icon: <BarChartOutlined />, label: '碳排放分析' },
  { key: '/devices', icon: <MonitorOutlined />, label: '设备管理' },
  { key: '/data-collection', icon: <FormOutlined />, label: '数据采集' },
  { key: '/alarms', icon: <AlertOutlined />, label: '告警中心' },
  { key: '/reports', icon: <FileTextOutlined />, label: '报表中心' },
  {
    key: 'system',
    icon: <SettingOutlined />,
    label: '系统管理',
    children: [
      { key: '/emission-factors', icon: <ExperimentOutlined />, label: '排放因子库' },
      { key: '/areas', icon: <ApartmentOutlined />, label: '区域管理' },
      { key: '/users', icon: <UserOutlined />, label: '用户管理' },
      { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
    ],
  },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: user?.fullName || user?.username },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={220}
        style={{ background: '#001529' }}>
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: collapsed ? 14 : 18, fontWeight: 'bold', whiteSpace: 'nowrap',
          overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          {collapsed ? '双碳' : '双碳数据采集系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['system']}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px', background: colorBgContainer,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <span>{user?.fullName || user?.username}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
