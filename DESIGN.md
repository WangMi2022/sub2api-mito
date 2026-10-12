---
name: Sub2API Mito
description: 蓝色导航、轻描边圆角表面与保留原有业务的 Sub2API 主题
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-soft: "rgb(219 234 254)"
  on-primary: "#fff"
  bg: "#fff"
  surface: "#fff"
  subtle: "#f8fafc"
  text: "#020617"
  muted: "#64748b"
  border: "#e2e8f0"
  card-border: "rgb(226 232 240 / 70%)"
  blue-soft: "#eaf6ff"
  blue-border: "#bfdbfe"
  green: "#16a34a"
  green-soft: "#eafaf1"
  green-border: "#bbf7d0"
  danger: "#dc2626"
  error: "#ef4444"
  warning: "#d97706"
  auth-primary: "#030712"
  bg-dark: "#020617"
  surface-dark: "#0f172a"
  subtle-dark: "#0b1222"
  text-dark: "#f8fafc"
  muted-dark: "#94a3b8"
  border-dark: "#1e293b"
  blue-dark: "#60a5fa"
  blue-soft-dark: "rgb(37 99 235 / 16%)"
  blue-border-dark: "rgb(96 165 250 / 38%)"
  green-soft-dark: "rgb(22 163 74 / 14%)"
  green-border-dark: "rgb(74 222 128 / 34%)"
typography:
  headline:
    fontFamily: "Outfit, 'Mito Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: "23.2px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-.02em"
  title:
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "24px"
  body:
    fontFamily: "Outfit, 'Mito Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: "20px"
  label:
    fontSize: "13.12px"
    fontWeight: 650
    lineHeight: "20px"
  button:
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "20px"
  navigation:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Mito Noto Sans SC', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
  metric:
    fontSize: "24.8px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.02em"
  note:
    fontSize: "11px"
    lineHeight: "16px"
  auth-title:
    fontSize: "24px"
    fontWeight: 400
rounded:
  control: "8px"
  popover: "12px"
  toast: "14px"
  card: "16px"
  auth-card: "28px"
  pill: "9999px"
spacing:
  xs: "4px"
  compact: "6px"
  sm: "8px"
  control-gap: "12px"
  md: "16px"
  section: "20px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-secondary-hover:
    backgroundColor: "{colors.subtle}"
  button-auth:
    backgroundColor: "{colors.auth-primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.card}"
    padding: "8px 14px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  navigation-item:
    textColor: "{colors.muted}"
    typography: "{typography.navigation}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  navigation-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  chip-primary:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-hover}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
  stat:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.md}"
  toast:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.toast}"
    padding: "{spacing.md}"
---

# Design System: Sub2API Mito

## Overview

**Creative North Star: "蓝色导航与轻描边工作台"**

以蓝色活动导航、简洁顶栏和轻描边圆角表面组织 Sub2API 的操作界面。正文与数字使用 Outfit 和自托管中文字体，侧栏保留系统字体栈；密度来自紧凑控件、明确的标题层级和可回流的网格。

常规业务按钮使用蓝色，认证表单使用独立的深色主按钮、更大的控件和卡片圆角。绿色、红色及琥珀色表达指标或操作状态，不扩展为第二品牌色。品牌、菜单、权限与业务字段沿用当前 Sub2API。

本文是源码提取记录，依据当前主题 CSS、Vue 组件与上游共享样式。2026-10-13 已在 8081 独立实例完成登录、仪表盘和用量页的限定浏览器验收：桌面与手机布局、深浅色、字体、卡片入场与悬停、下拉过渡、减少动态效果及普通用户权限检查通过。管理员页面、跨租户隔离和真实有用量图表尚未验收。本文不证明全部页面、隐藏状态或参考站动画逐帧一致。

**Key Characteristics:**

- 单一蓝色主强调，深浅色共享语义角色。
- 一像素描边、柔和阴影和分级圆角。
- 统计数字突出，说明与元数据保持次要层级。
- 短促状态反馈；减少动态效果时保留内容与状态。

主要依据：[主题样式](frontend/src/themes/mito/theme.css)、[Tailwind 接入](frontend/src/themes/mito/tailwind.mjs)、[上游共享样式](frontend/src/style.css)、[统计卡](frontend/src/themes/mito/DashboardStats.vue)、[图表](frontend/src/themes/mito/DashboardCharts.vue)、[输入框](frontend/src/components/common/Input.vue)、[选择器](frontend/src/components/common/Select.vue)、[通知](frontend/src/components/common/Toast.vue)、[侧栏](frontend/src/components/layout/AppSidebar.vue)。frontmatter 记录基础值；[sidecar](.impeccable/design.json) 补充阴影、状态片段、动效和断点。

## Colors

### Primary

操作蓝用于活动侧栏、普通主按钮与请求柱形图。悬停用更深的蓝；余额卡、选中行和聚焦通过柔和蓝色表面或描边表达关联。深色模式中的文本强调与聚焦改用亮蓝，活动导航和普通主按钮仍保持操作蓝。

### Neutral

浅色工作区和卡片均为白色，次级表面为淡蓝灰，主要文字接近墨色。深色模式用深海军蓝工作区、较亮的卡片和浅色文字；正文、次要文字与描边分别切换对应的 `*-dark` 基础值。卡片描边在浅色有透明度，深色使用实色边界。

### Semantic

绿色用于已有的累计消费卡与成功操作，红色用于危险操作与字段错误，琥珀色用于警告。徽章和通知保留上游的语义色阶；它们不是统一的品牌色阶。认证表单的主按钮在浅色为近黑色，深色为浅色；不改变普通业务主按钮的颜色。

**The State Accent Rule.** 蓝色连接当前导航、主要操作和聚焦；语义状态色只承担已有业务含义。

## Typography

正文字体栈见 frontmatter；Outfit 与 `Mito Noto Sans SC` 自托管并使用 `font-display: swap`。中文字体是当前界面字符子集，动态或新增字符通过 PingFang SC、Microsoft YaHei 等回退。侧栏使用独立系统字体栈，不把正文栈强制覆盖到导航。代码仍使用上游等宽字体。

### Hierarchy

- **Headline:** 页面标题；较粗字重、紧凑行高与轻微负字距。
- **Title:** 常规图表面板标题；大型面板标题另有局部加大处理。
- **Body:** 字段、表格和常见正文的紧凑层级；页面说明保留较大的局部字级，不存在全局正文大小重置。
- **Label / Button / Navigation:** 分别用于统计标签、业务按钮与菜单，沿用各自字重。
- **Metric:** 主要统计值；次级统计值缩小，账户余额有自己的展示尺寸。
- **Note:** 统计卡的附注和单位补充，仅用于短元数据，不作为通用正文。
- **Auth Title:** 认证表单标题使用常规字重，与后台标题形成明确区分。

**The Numeric Alignment Rule.** 统计值、账户余额和表格采用等宽数字特性；不把金额与 Token 的不同单位合并成装饰数字。

## Layout

应用采用固定侧栏加自适应主区域。桌面侧栏展开宽度（224px）、折叠宽度（72px），从桌面断点（1024px）起同步主区域左边距。顶栏最小高度（64px），按钮组可换行；桌面内容内边距为（24px 16px 24px 24px），较小屏幕改为（20px 16px）。

统计网格默认四列、间隔（12px）；视口不大于（1440px）为两列，不大于（720px）为一列。图表网格默认两列、间隔（24px），不大于（1280px）变为一列。小屏页面标题和操作区换行，操作靠左；移动侧栏的开关与表格模式继续由上游组件决定。

认证页为独立居中布局：顶栏最大宽度（1088px）、表单内容最大宽度（440px）。内容顶部间距在桌面为（116px）、不大于（720px）为（36px）；卡片内边距由（32px）缩至（24px）。日常间距以 frontmatter 的复用步长为主，保留图表等组件的局部几何值，不把这些数值推广为新的全局刻度。

## Elevation & Depth

表面通过轻描边与低阴影形成基本层级；共享卡片、顶栏和弹窗遮罩的主题样式关闭背景模糊。下拉菜单、通知、图表提示与弹窗分别使用更明显的浮层阴影；认证卡片的柔和扩散阴影是局部处理。具体 `box-shadow` 值只记录在 sidecar。

普通悬停卡片保持位置，只稍增强阴影。统计卡有独立的鼠标悬停抬升与缩放反馈，不能据此要求所有卡片都移动。

**The Border First Rule.** 普通表面先用描边界定边界；下拉菜单、提示与弹窗再用各自的浮层阴影表达层级。

## Shapes

共享按钮、输入框与侧栏条目使用小圆角；顶栏控件、下拉菜单和图表提示使用中圆角；卡片、表格容器与居中弹窗使用大圆角。通知使用独立圆角与一像素全边框，主题覆盖上游的左侧粗边。认证卡片进一步增大圆角，认证输入与按钮使用卡片级圆角。徽章为胶囊，头像为圆形。

抽屉继续贴侧边并使用直角；全屏弹窗沿用上游的直角规则。不要将居中弹窗的外形或入场定位套到抽屉。

## Components

### Buttons

普通主按钮为实色蓝，次按钮为描边表面；危险、成功、警告与支付按钮保留各自业务含义。共享按钮最小高度（36px），禁用时保留禁止指针、半透明与不可按下变换的上游规则。主题为键盘聚焦提供可见轮廓；上游聚焦环与主题阴影的最终合成效果尚未做浏览器验证。按钮状态过渡（200ms）与按下缩放（0.98）来自上游。

认证按钮最小高度（48px），使用深浅色反转的独立主色；顶栏控件最小高度（40px），悬停只改变底色与描边，颜色过渡（150ms）。各变体不互相替代。

### Inputs / Fields

共享字段为一像素描边、最小高度（40px）和次要色占位文案。聚焦切换为主题蓝描边并增加柔和环（3px）；错误使用红色描边与对应聚焦环。禁用字段使用次级背景和透明度（0.65）。字段、按钮及其它可聚焦元素的主题键盘轮廓为（2px），偏移（3px）。

认证字段最小高度（48px），背景为次级表面。选择器的触发器、打开、搜索、键盘聚焦与禁用状态保留上游组件样式和行为；主题改变其浮层的表面、圆角、阴影与进出动效，不声称所有选择器都使用共享输入框圆角。

### Navigation

侧栏默认文字为次要色，悬停使用次级表面和主要文字；当前条目使用实色蓝与白色文字、图标。菜单最小高度（40px），几何 SVG 为主要图标语言。折叠状态保留标签隐藏、图标、徽章和过渡；移动状态保留上游开关及遮罩。顶栏不重复显示页面标题。

### Chips

上游徽章使用胶囊轮廓、紧凑内边距与小字级；主色徽章通过主题 primary 色阶转为蓝色，状态徽章保留语义色阶。状态点是另一种已有表现，不应替换成统一的可点击筛选标签。没有统一的交互式选中徽章规范。

### Cards / Containers

共享卡片使用主题表面、卡片描边及低阴影；上游常规卡片正文内边距（24px），统计卡内边距（16px）。普通表格保留横向滚动、固定列和上游移动模式。悬停行使用次级背景，选中行及移动选中卡片使用柔和蓝色；数据与操作仍来自原组件。

### Dashboard Stats & Charts

统计卡用标签、主数值和短附注组织数据，保留今日／累计、实际／计费的区别；累计缓存量来自创建缓存与读取缓存的累计值。数值可换行以适应长内容。蓝色余额卡和绿色累计卡是现有指标变体。

页面入场（400ms）；统计卡入场（500ms），从（100ms）起按每组中的顺序错峰（60ms）。只有精细指针且支持悬停时，统计卡抬升（4px）并放大（1.03）；按下缩小（0.98），反馈过渡（300ms）。

主题中的消费、请求与模型 Chart.js 图表关闭 Canvas 数据动画，提示框通过 HTML 弹入（190ms）、淡出（150ms）。提示内容使用真实图表文本，图表进入加载、空态或销毁时清理。上游 Token 趋势仍使用原组件配置，不把主题图表配置推广到全部图表。

### Overlays & Feedback

下拉菜单进入的透明度过渡（150ms）与变换过渡（240ms）分开处理，退出为（130ms）。居中弹窗进入（250ms）、退出（200ms），抽屉不套用居中内容变换。通知进入（340ms）、退出（200ms），计时条按上游通知时长线性收缩；动效不延长通知生命周期。

骨架扫光循环（1350ms）。导航进度条保留上游循环（1500ms）与淡入／淡出（150ms／300ms），通过 primary 变量显示蓝色。sidecar 保存各组件实际缓动曲线，不设虚构的统一动画速度。

### Reduced Motion

主题的 `prefers-reduced-motion: reduce` 禁用全部 CSS animation，过渡时长压至（1ms）、延迟为（0ms），平滑滚动改为自动。它清除统计卡、菜单、通知及弹窗对应状态的位移／缩放，并隐藏骨架扫光；加载内容与状态仍存在。

上游按钮的 `:active` 缩放不在主题变换清除名单中，仍会出现即时静态缩放。该行为是当前实现的范围说明，不作为未来组件的通用规则；不能据此声称减少动态效果时所有 transform 均已清除。

## Do's and Don'ts

### Do

- Do 沿用蓝色活动导航与共享表面变量，深色模式切换相同语义角色。
- Do 使用共享控件、卡片和认证表单各自的圆角，保留可见聚焦、错误和禁用状态。
- Do 保留指标的今日／累计、实际／计费区分，并使用等宽数字排版。
- Do 在小屏让网格和顶栏按既有断点回流，使用原有移动表格及侧栏行为。
- Do 新增中文界面文案时维护字体子集，并验证系统字体回退。

### Don't

- Don't 将认证表单的深色主按钮提升为全局按钮规范，或将状态色当作第二品牌色。
- Don't 将统计卡的抬升反馈应用到所有容器；普通悬停卡片只改变阴影。
- Don't 因视觉主题改动品牌、路由、权限过滤、认证流程或业务数据。
- Don't 用旧截图证明最终 CSS，或声称参考站所有页面、状态与动画逐帧一致。

未提升为系统规范：上游分组标题的局部大写样式、通知关闭按钮的英文可访问名称，以及减少动态效果时仍保留的按钮按下缩放。它们是现有局部实现，不要求新界面继承；8081 的限定浏览器验收已通过，结论仅适用于上述页面和状态。
