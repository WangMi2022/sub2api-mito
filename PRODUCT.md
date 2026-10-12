# Sub2API Mito 产品上下文

## Platform

web

## 本次目标（用户明确要求）

为 `172.30.3.135:/data/sub2api-deploy/sub2api` 的 Sub2API 前端复用 `https://sub.anzhiyu.com/dashboard` 的视觉风格和组件外观。使用本项目原有业务功能；主题应在更新上游后可重复应用、检查冲突和撤销。交付目标仓库为 `WangMi2022/sub2api-mito`。

## 产品与使用场景（现有代码依据）

用户通过仪表盘查看余额、消费、请求与 Token 统计，管理 API 密钥、查询使用记录及维护个人资料。管理员沿用原有管理页面与权限过滤。界面包括中文/英文、深浅色和桌面/移动端布局。

## 品牌与边界

视觉方向已由用户指定：蓝色活动导航、轻描边圆角卡片、简洁顶栏、Outfit 与中文无衬线字体、参考站登录页的表单外观。品牌名称、标志、路由、权限、认证、计费字段和 API 来自当前 Sub2API；不引入参考站私有数据或独有业务能力。

## Stack

现有前端使用 Vue 3、TypeScript、Tailwind CSS、Pinia、Vue Router、Vue I18n 和 Chart.js。主题位于 `frontend/src/themes/mito`；上游接入点由 `frontend/scripts/mito-theme.mjs` 管理。后端不在本次修改范围内。
