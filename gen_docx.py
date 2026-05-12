#!/usr/bin/env python3
"""将操作手册.md转换为Word文档，包含截图和格式化表格"""

import os
import re
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCREENSHOTS_DIR = os.path.join(BASE_DIR, 'screenshots')
OUTPUT_PATH = os.path.join(BASE_DIR, '双碳数据采集系统操作手册.docx')

def set_cell_shading(cell, color):
    """设置单元格背景色"""
    shading = cell._element.get_or_add_tcPr()
    shading_elm = shading.makeelement(qn('w:shd'), {
        qn('w:fill'): color,
        qn('w:val'): 'clear',
    })
    shading.append(shading_elm)

def add_table(doc, headers, rows):
    """添加格式化表格"""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers), style='Table Grid')
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # 表头
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in p.runs:
            run.bold = True
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_shading(cell, '2F5496')
    # 数据行
    for r_idx, row_data in enumerate(rows):
        for c_idx, val in enumerate(row_data):
            cell = table.rows[r_idx + 1].cells[c_idx]
            cell.text = val
            for p in cell.paragraphs:
                p.style.font.size = Pt(10)
            if r_idx % 2 == 1:
                set_cell_shading(cell, 'D6E4F0')
    return table

def add_image_centered(doc, img_path, caption, width_inches=5.8):
    """添加居中图片和图注"""
    if os.path.exists(img_path):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run()
        run.add_picture(img_path, width=Inches(width_inches))

        cap = doc.add_paragraph()
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = cap.add_run(caption)
        run.bold = True
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
        doc.add_paragraph()  # 空行
    else:
        doc.add_paragraph(f'[图片缺失: {img_path}]')

def build_document():
    doc = Document()

    # ========== 页面设置 ==========
    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

    # ========== 默认字体 ==========
    style = doc.styles['Normal']
    style.font.name = '宋体'
    style.font.size = Pt(11)
    style.element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
    style.paragraph_format.line_spacing = 1.5

    # ========== 封面 ==========
    for _ in range(6):
        doc.add_paragraph()

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run('双碳数据采集系统')
    run.bold = True
    run.font.size = Pt(28)
    run.font.color.rgb = RGBColor(0x2F, 0x54, 0x96)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run('操 作 手 册')
    run.bold = True
    run.font.size = Pt(22)

    doc.add_paragraph()

    info = doc.add_paragraph()
    info.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = info.add_run('Carbon Data Collection System V1.0')
    run.font.size = Pt(14)
    run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

    for _ in range(8):
        doc.add_paragraph()

    date_p = doc.add_paragraph()
    date_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = date_p.add_run('编制日期：2026年4月')
    run.font.size = Pt(12)

    doc.add_page_break()

    # ========== 目录页 ==========
    h = doc.add_heading('目  录', level=1)
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER

    toc_items = [
        '一、系统概述',
        '二、系统登录',
        '三、碳排放总览（Dashboard）',
        '四、能耗监测',
        '五、碳排放分析',
        '六、设备管理',
        '七、数据采集（手动录入）',
        '八、告警中心',
        '九、报表中心',
        '十、排放因子库',
        '十一、系统设置 — 区域管理',
        '十二、系统设置 — 系统配置',
        '十三、操作流程总结',
    ]
    for item in toc_items:
        p = doc.add_paragraph(item)
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(4)
        p.runs[0].font.size = Pt(12)

    doc.add_page_break()

    # ========== 一、系统概述 ==========
    doc.add_heading('一、系统概述', level=1)

    doc.add_paragraph(
        '双碳数据采集系统（Carbon Data Collection System）是一款面向工业企业的碳排放数据管理平台，'
        '支持多源能耗数据采集（电力、天然气、水、蒸汽）、碳排放自动核算、配额管理、告警预警和报表生成等功能，'
        '助力企业实现碳达峰与碳中和目标。'
    )

    p = doc.add_paragraph()
    run = p.add_run('技术架构：')
    run.bold = True
    p.add_run('前端 React 18 + Ant Design 5 + ECharts，后端 Express + TypeScript + InfluxDB 2.x + SQLite，'
              '实时通信 Socket.IO，消息队列 MQTT。')

    p = doc.add_paragraph()
    run = p.add_run('默认管理员账号：')
    run.bold = True
    p.add_run('admin / admin123')

    # ========== 二、系统登录 ==========
    doc.add_heading('二、系统登录', level=1)

    doc.add_paragraph(
        '打开浏览器访问系统地址，进入登录界面。输入用户名和密码后，点击"登录"按钮进入系统主界面。'
        '系统支持四种角色：超级管理员（super_admin）、管理员（admin）、操作员（operator）、查看者（viewer），'
        '不同角色拥有不同的操作权限。'
    )

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '01-login-page.png'), '图1：系统登录界面')

    doc.add_paragraph('操作说明：', style='List Bullet')
    doc.add_paragraph('输入用户名：admin', style='List Bullet 2')
    doc.add_paragraph('输入密码：admin123', style='List Bullet 2')
    doc.add_paragraph('点击"登录"按钮完成登录', style='List Bullet 2')
    doc.add_paragraph('系统采用 JWT Token 认证机制，登录后 Token 有效期为 7 天', style='List Bullet 2')

    # ========== 三、碳排放总览 ==========
    doc.add_heading('三、碳排放总览（Dashboard）', level=1)

    doc.add_paragraph('登录成功后自动跳转至碳排放总览页面，该页面为系统首页，提供全局概览信息。')

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '02-dashboard.png'), '图2：碳排放总览 - 统计卡片与趋势图')

    doc.add_paragraph('页面上方展示四项核心指标卡片：')

    add_table(doc,
        ['卡片', '说明'],
        [
            ['年度碳排放量', '当年累计碳排放总量（tCO₂e），及配额使用百分比'],
            ['本月碳排放量', '当月碳排放量，显示环比变化趋势（绿色下降/红色上升）'],
            ['在线设备', '在线设备数/总设备数，异常状态标签提示'],
            ['活跃告警', '当前未处理告警数量，按严重/警告分类显示'],
        ]
    )

    doc.add_paragraph()
    doc.add_paragraph('页面中部和下部展示四组可视化图表：')

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '03-dashboard-full.png'), '图3：碳排放总览 - 完整页面（含下方图表）')

    items = [
        ('碳排放趋势（月度）', '蓝色柱状图展示各月碳排放量，红色虚线标示月度碳配额线，超额月份自动标红'),
        ('排放范围分布', '环形图展示温室气体核算三个范围（Scope 1/2/3）的占比'),
        ('能源类型碳排放占比', '环形图展示电力、天然气、蒸汽、其他各能源类型的碳排放贡献比例'),
        ('区域碳排放分布', '横向条形图对比各生产区域的碳排放量'),
    ]
    for title, desc in items:
        p = doc.add_paragraph()
        run = p.add_run(f'■ {title}：')
        run.bold = True
        p.add_run(desc)

    # ========== 四、能耗监测 ==========
    doc.add_heading('四、能耗监测', level=1)

    doc.add_paragraph('点击左侧菜单"能耗监测"进入实时能耗监控页面。')

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '04-energy-monitor.png'), '图4：能耗监测 - 电力实时监控')

    doc.add_paragraph('功能说明：')
    funcs = [
        ('能源类型切换', '顶部 Tab 栏可在电力、天然气、水、蒸汽四种能源类型间切换，每种类型显示对应的单位和数据字段'),
        ('区域筛选', '右上角下拉框可按区域筛选设备数据'),
        ('汇总统计卡片', '展示当前总功率/流量、今日累计消耗、峰值、在线设备数'),
        ('24小时趋势图', '面积图展示过去24小时的能耗变化曲线，白天用能高、夜间低的典型工业用能模式'),
        ('区域能耗对比', '横向条形图展示各区域的实时能耗排名'),
        ('设备实时数据表', '列出所有在线设备的详细参数（电力：电压、电流、功率因数；天然气/蒸汽：温度、压力等），每10秒自动刷新'),
    ]
    for i, (t, d) in enumerate(funcs, 1):
        p = doc.add_paragraph()
        run = p.add_run(f'{i}. {t}：')
        run.bold = True
        p.add_run(d)

    # ========== 五、碳排放分析 ==========
    doc.add_heading('五、碳排放分析', level=1)

    doc.add_paragraph('点击左侧菜单"碳排放分析"进入深度分析页面。')

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '05-carbon-analysis-top.png'), '图5：碳排放分析 - 统计卡片与月度趋势')

    doc.add_paragraph('页面顶部提供年份和范围筛选器，下方展示四项汇总指标：')
    for t, d in [('年度累计排放', '全年碳排放总量'), ('年度碳配额', '国家/地方分配的年度碳配额额度，标注已使用百分比'),
                 ('剩余配额', '当前剩余可排放额度，绿色表示充裕、红色表示超标'), ('同比变化', '与去年同期对比的变化百分比')]:
        p = doc.add_paragraph()
        run = p.add_run(f'■ {t}：')
        run.bold = True
        p.add_run(d)

    doc.add_paragraph(
        '碳排放月度趋势与配额对比：双Y轴图表，左轴显示月度排放柱状图（超额月份标红），'
        '右轴显示累计排放曲线，红色虚线为月度配额基准线。'
    )

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '06-carbon-analysis-full.png'),
                       '图6：碳排放分析 - 完整页面（含 Scope 堆叠图、同比分析、效率指标）')

    doc.add_paragraph('下半部分包含四项分析：')
    for t, d in [('Scope 范围分布（堆叠）', '堆叠柱状图展示每月三个范围的排放构成'),
                 ('同比分析', '对比今年与去年各月排放量的双柱状图'),
                 ('各能源类型碳排放贡献', '瀑布图展示电力、天然气、蒸汽、自来水各自的排放贡献及合计'),
                 ('碳排放效率指标', '表格展示单位产值碳排放、人均碳排放等KPI，对比当前值、目标值、行业平均值')]:
        p = doc.add_paragraph()
        run = p.add_run(f'■ {t}：')
        run.bold = True
        p.add_run(d)

    # ========== 六、设备管理 ==========
    doc.add_heading('六、设备管理', level=1)

    doc.add_paragraph('点击左侧菜单"设备管理"进入能耗计量设备管理页面。')

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '07-device-management.png'), '图7：设备管理 - 设备列表')

    doc.add_paragraph('功能说明：')
    doc.add_paragraph('设备列表展示所有计量仪表，包含设备ID、名称、能源类型、所属区域、通信协议、碳排放范围（Scope）、在线状态', style='List Bullet')
    doc.add_paragraph('支持按能源类型、区域、状态筛选', style='List Bullet')
    doc.add_paragraph('点击"刷新"按钮重新加载设备数据', style='List Bullet')
    doc.add_paragraph('点击"删除"可移除设备（需管理员权限）', style='List Bullet')

    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run('添加新设备：')
    run.bold = True
    p.add_run('点击右上角"添加设备"按钮，弹出添加设备表单：')

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '08-add-device-modal.png'), '图8：添加设备弹窗')

    doc.add_paragraph('填写以下信息：')
    for t, d in [('设备ID', '唯一标识，如 EM-004'), ('名称', '设备描述名称'),
                 ('能源类型', '电力/天然气/水/蒸汽'), ('通信协议', 'MQTT/Modbus TCP/HTTP API/手动录入'),
                 ('所属区域', '选择已配置的生产区域'), ('碳排放范围', '范围一（直接排放）/范围二（间接排放）/范围三（其他）')]:
        p = doc.add_paragraph()
        run = p.add_run(f'■ {t}：')
        run.bold = True
        p.add_run(d)

    # ========== 七、数据采集 ==========
    doc.add_heading('七、数据采集（手动录入）', level=1)

    doc.add_paragraph('点击左侧菜单"数据采集"进入手动数据录入页面。当设备不支持自动采集（MQTT/Modbus）时，可通过此页面手动录入仪表读数。')

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '09-data-collection.png'), '图9：手动数据采集页面')

    doc.add_paragraph('操作步骤：')
    steps = [
        '选择目标设备（下拉列表展示所有已注册设备）',
        '选择能源类型',
        '确认采集时间（默认为当前时间，可手动修改）',
        '在"仪表读数"区域填写累计读数（kWh/m³/t）、瞬时功率/流量（kW/m³/h/t/h）、电压/压力（V/MPa）',
        '点击"提交数据"按钮，数据写入 InfluxDB 并自动触发碳排放重新计算',
    ]
    for i, s in enumerate(steps, 1):
        doc.add_paragraph(f'{i}. {s}')

    # ========== 八、告警中心 ==========
    doc.add_heading('八、告警中心', level=1)

    doc.add_paragraph('点击左侧菜单"告警中心"进入告警管理页面。')

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '10-alarm-center.png'), '图10：告警中心页面')

    doc.add_paragraph('功能说明：')
    doc.add_paragraph('告警列表展示所有告警记录，包含标题、类别、严重程度、状态、当前值、触发时间', style='List Bullet')
    doc.add_paragraph('状态筛选：右上角下拉框可按"活跃""已确认""已解除"筛选', style='List Bullet')
    doc.add_paragraph('确认告警：点击"确认"按钮，标记已知晓该告警，可添加备注', style='List Bullet')
    doc.add_paragraph('解除告警：点击"解除"按钮，标记告警已处理完毕', style='List Bullet')

    doc.add_paragraph()
    doc.add_paragraph('系统预设告警规则：')
    add_table(doc,
        ['规则', '类型', '严重度'],
        [
            ['碳配额使用80%预警', '碳配额', '警告'],
            ['碳配额使用95%严重预警', '碳配额', '严重'],
            ['设备离线告警', '设备离线', '警告'],
            ['能耗异常突增告警', '能耗异常', '警告'],
        ]
    )

    # ========== 九、报表中心 ==========
    doc.add_heading('九、报表中心', level=1)

    doc.add_paragraph('点击左侧菜单"报表中心"进入报表管理页面。')

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '11-report-center.png'), '图11：报表中心页面')

    doc.add_paragraph('页面结构：')
    for t, d in [('统计卡片', '展示报表总数、已完成数、月报数量'),
                 ('生成新报表', '选择报表类型（月报/季报/年报）、时间范围、范围、输出格式（Excel/PDF），点击"立即生成"'),
                 ('历史报表列表', '展示所有已生成报表，包含标题、类型、周期、状态、格式、大小、创建时间'),
                 ('操作', '预览：在线查看报表摘要；下载：下载报表文件到本地')]:
        p = doc.add_paragraph()
        run = p.add_run(f'{t}：')
        run.bold = True
        p.add_run(d)

    # ========== 十、排放因子库 ==========
    doc.add_heading('十、排放因子库', level=1)

    doc.add_paragraph('点击左侧菜单"系统管理 > 排放因子库"进入排放因子管理页面。排放因子是碳排放核算的关键参数。')

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '12-emission-factors.png'), '图12：排放因子库页面')

    doc.add_paragraph('系统预置的默认排放因子：')
    add_table(doc,
        ['名称', '能源类型', '排放因子', '单位', '范围', '来源'],
        [
            ['华东电网排放因子', '电力', '0.000581', 'tCO₂e/kWh', 'Scope 2', '生态环境部2023年度'],
            ['全国电网平均排放因子', '电力', '0.000570', 'tCO₂e/kWh', 'Scope 2', '生态环境部2023年度'],
            ['天然气排放因子', '天然气', '0.002162', 'tCO₂e/m³', 'Scope 1', 'IPCC 2006'],
            ['蒸汽排放因子', '蒸汽', '0.110000', 'tCO₂e/t', 'Scope 2', '行业标准'],
            ['自来水排放因子', '水', '0.000091', 'tCO₂e/m³', 'Scope 3', '行业标准'],
        ]
    )

    doc.add_paragraph()
    doc.add_paragraph('标记为"默认"的因子将用于碳排放自动计算', style='List Bullet')
    doc.add_paragraph('可通过"添加"按钮新增自定义排放因子', style='List Bullet')
    doc.add_paragraph('支持按能源类型筛选', style='List Bullet')

    # ========== 十一、区域管理 ==========
    doc.add_heading('十一、系统设置 — 区域管理', level=1)

    doc.add_paragraph(
        '点击左侧菜单"系统管理 > 系统设置"，默认显示"区域管理"选项卡。'
        '区域（Area）用于对企业内的生产车间、办公区域进行划分管理，便于按区域统计能耗和碳排放。'
    )

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '13-system-areas.png'), '图13：系统设置 - 区域管理')

    doc.add_paragraph('展示所有已配置区域，包含ID、名称、类型、描述、排序号', style='List Bullet')
    doc.add_paragraph('点击"添加区域"可新增区域', style='List Bullet')
    doc.add_paragraph('区域数据与设备绑定，用于区域级碳排放统计', style='List Bullet')

    # ========== 十二、系统配置 ==========
    doc.add_heading('十二、系统设置 — 系统配置', level=1)

    doc.add_paragraph('切换到"系统配置"选项卡，管理系统级参数。')

    add_image_centered(doc, os.path.join(SCREENSHOTS_DIR, '14-system-config.png'), '图14：系统设置 - 系统配置')

    doc.add_paragraph('可配置参数：')
    add_table(doc,
        ['参数', '说明', '默认值'],
        [
            ['企业名称', '显示在系统中的企业名称', '智能制造有限公司'],
            ['碳排放计算间隔(秒)', '定时碳排放计算任务的执行间隔', '3600（1小时）'],
            ['数据模拟器', '是否启用开发环境数据模拟器', 'true'],
        ]
    )

    doc.add_paragraph()
    doc.add_paragraph('修改后点击"保存配置"按钮生效。')

    # ========== 十三、操作流程总结 ==========
    doc.add_heading('十三、操作流程总结', level=1)

    flow_text = (
        '用户登录 → 碳排放总览（查看全局指标）\n'
        '    ├── 能耗监测（实时监控各能源消耗）\n'
        '    ├── 碳排放分析（深度分析与趋势对比）\n'
        '    ├── 设备管理（添加/管理计量仪表）\n'
        '    ├── 数据采集（手动录入仪表读数）\n'
        '    ├── 告警中心（查看/处理告警）\n'
        '    ├── 报表中心（生成/下载碳排放报表）\n'
        '    └── 系统管理\n'
        '        ├── 排放因子库（维护核算参数）\n'
        '        ├── 区域管理（管理生产区域）\n'
        '        └── 系统配置（修改系统参数）'
    )
    p = doc.add_paragraph()
    run = p.add_run(flow_text)
    run.font.name = 'Consolas'
    run.font.size = Pt(10)

    doc.add_paragraph()
    doc.add_paragraph()

    # 页脚信息
    footer = doc.add_paragraph()
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer.add_run('双碳数据采集系统 v1.0 操作手册')
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
    run.italic = True

    footer2 = doc.add_paragraph()
    footer2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer2.add_run('编制日期：2026年4月')
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
    run.italic = True

    # ========== 保存 ==========
    doc.save(OUTPUT_PATH)
    print(f'Word文档已生成: {OUTPUT_PATH}')

if __name__ == '__main__':
    build_document()
