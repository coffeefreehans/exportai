# ExportAI 商店文案（中文）

## 扩展名称
ExportAI - AI 对话导出助手

## 简短描述
一键导出完整 AI 对话，支持 8 种格式并可直接发送到 Notion。

## 详细描述
ExportAI 是一款用于保存和整理 AI 聊天记录的浏览器扩展。它可以把完整对话导出为常用文件，也可以直接发送到你授权的 Notion 页面，适合知识归档、项目记录、研究资料整理和团队交付。

主要功能：
- 支持 TXT、PDF、MHT、HTML、MD、DOCX、XLSX、PNG 共 8 种导出格式。
- 弹窗内可以多选格式，一次生成多个文件。
- 尽量保留代码块、列表、表格、公式、图片和附件相关内容。
- 支持 ChatGPT、Claude、Gemini、Grok、DeepSeek、豆包、通义、智谱、Kimi、MiniMax 等 AI 对话页面。
- 在扩展主弹窗内登录、查看账号和连接 Notion，无需额外打开连接窗口。
- Notion 保存位置按页面层级显示，可逐级进入并选择任意已授权页面或数据库。
- 免费账号每天可发送 3 次到 Notion；有效会员不限制发送次数。
- 对话导出和发送主要在浏览器内完成，ExportAI 服务器不保存聊天正文。

隐私说明：
账号服务器仅用于登录、会员状态、Notion 免费额度和设置同步，不保存导出的聊天正文。Notion 内容由浏览器直接发送到用户授权的 Notion 工作区。请在导出前确认你有权保存相关内容。

## 搜索关键词
AI 对话导出, 聊天归档, 对话备份, Notion

## 权限说明
- activeTab/tabs：识别当前支持的 AI 对话页面并读取可导出的对话内容。
- storage：保存登录状态、会员状态、设置、Notion 连接信息和导出偏好。
- downloads：把导出文件保存到浏览器下载目录或用户选择的位置。
- pageCapture/debugger：生成需要页面渲染或捕获的导出文件。
- identity：完成 Google 登录和授权回调。
- alarms：执行扩展内部的定时任务。
- host permissions：仅用于受支持的 AI 平台、ExportAI 官网、Notion API 和登录同步。
