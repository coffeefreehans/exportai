# ExportAI 图标设计方案

> 基于 Unicon (19,000+ 图标) 的统一图标系统设计
>
> ✅ 已生成：React 组件（web/src/components/icons/）+ SVG 图标（src/assets/icons/）

## 一、设计理念

ExportAI 是一款支持 9 大 AI 平台、9 种导出格式的 Chrome 浏览器扩展 + Next.js 官网。图标系统需要传达：

- **智能** — AI 赋能的导出能力
- **效率** — 一键导出，多格式支持
- **可信赖** — 专业、稳定、安全
- **现代感** — 符合 AI 工具调性

---

## 二、图标库选择策略

| 场景 | 推荐库 | 原因 |
|------|--------|------|
| UI 功能图标 | `lucide` | 统一 stroke 风格，React 生态首选 |
| 系统/状态图标 | `tabler` | 覆盖广、视觉一致 |
| AI 平台 Logo | `remix` / `hugeicons` | 内置 AI 品牌图标 |
| 品牌图标 | `simple-icons` | 3,300+ 品牌 logo |

---

## 三、App Logo & 主图标

### 3.1 扩展图标（manifest.json）
当前已有自绘 SVG 图标（`icons/icon.svg`），包含 AI 星点 + 文档导出视觉元素。建议保留。

### 3.2 官网 Favicon
```
使用 Unicon 获取 AI 主题图标作为备用方案
```

---

## 四、功能图标分类

### 4.1 导航栏 (Navbar)

| 用途 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| Logo/首页 | `sparkles` | lucide | `unicon get sparkles --format react` |
| 首页 | `home` | lucide | `unicon get home --format react` |
| 功能 | `layout-dashboard` | lucide | `unicon get layout-dashboard --format react` |
| 定价 | `dollar-sign` | lucide | `unicon get dollar-sign --format react` |
| 登录 | `log-in` | lucide | `unicon get log-in --format react` |
| 汉堡菜单 | `menu` | lucide | `unicon get menu --format react` |
| 关闭 | `x` | lucide | `unicon get x --format react` |

### 4.2 Hero 区域

| 用途 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| 导出箭头 | `arrow-down-to-line` | lucide | `unicon get arrow-down-to-line --format react` |
| AI 星点 | `sparkles` | lucide | `unicon get sparkles --format react` |
| 闪电（快速） | `zap` | lucide | `unicon get zap --format react` |

### 4.3 功能展示 (Features)

| 功能 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| 多平台支持 | `globe` | lucide | `unicon get globe --format react` |
| 多格式导出 | `file-text` | lucide | `unicon get file-text --format react` |
| 一键复制 | `clipboard-copy` | lucide | `unicon get clipboard-copy --format react` |
| AI 智能识别 | `brain` | lucide | `unicon get brain --format react` |
| 隐私安全 | `shield` | lucide | `unicon get shield --format react` |
| 批量处理 | `layers` | lucide | `unicon get layers --format react` |
| 格式转换 | `refresh-cw` | lucide | `unicon get refresh-cw --format react` |
| 历史记录 | `history` | lucide | `unicon get history --format react` |

### 4.4 用户认证 (Auth)

| 用途 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| 邮箱登录 | `mail` | lucide | `unicon get mail --format react` |
| Google 登录 | `chrome` | lucide | `unicon get chrome --format react` |
| 密码 | `lock` | lucide | `unicon get lock --format react` |
| 用户头像 | `user` | lucide | `unicon get user --format react` |
| 显示/隐藏密码 | `eye` / `eye-off` | lucide | `unicon get eye --format react` |
| 登出 | `log-out` | lucide | `unicon get log-out --format react` |
| 设置 | `settings` | lucide | `unicon get settings --format react` |

### 4.5 定价页 (Pricing)

| 用途 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| 免费版 | `coffee` | lucide | `unicon get coffee --format react` |
| Pro 版 | `crown` | lucide | `unicon get crown --format react` |
| 企业版 | `building` | lucide | `unicon get building --format react` |
| 勾选/包含 | `check` | lucide | `unicon get check --format react` |
| 不支持 | `x` | lucide | `unicon get x --format react` |

### 4.6 页脚 (Footer)

| 用途 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| GitHub | `github` | lucide | `unicon get github --format react` |
| Twitter/X | `twitter` | lucide | `unicon get twitter --format react` |
| 邮箱联系 | `mail` | lucide | `unicon get mail --format react` |
| Discord | `message-circle` | lucide | `unicon get message-circle --format react` |

---

## 五、AI 平台图标

### 5.1 支持的 9 大 AI 平台

| 平台 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| ChatGPT | `chat-gpt` | hugeicons | `unicon get chat-gpt --format react` |
| Claude | `claude-fill` | remix | `unicon get claude-fill --format react` |
| Gemini | `gemini-line` | remix | `unicon get gemini-line --format react` |
| DeepSeek | `deepseek-fill` | remix | `unicon get deepseek-fill --format react` |
| Perplexity | `perplexity-fill` | remix | `unicon get perplexity-fill --format react` |
| GitHub Copilot | `github` | lucide | `unicon get github --format react` |
| 通用 AI 平台 | `bot` | lucide | `unicon get bot --format react` |
| 通用 AI 平台 | `cpu` | lucide | `unicon get cpu --format react` |

> **注意**：部分 AI 平台品牌图标可能只有特定库提供。优先使用 `remix` Logos 系列。

### 5.2 更多 AI 品牌搜索

```bash
# 搜索更多 AI 平台
unicon search "openai chatgpt" --pick
unicon search "google bard" --pick

# 搜索 Simple Icons 品牌库
unicon search "openai" --pick
```

---

## 六、导出格式图标

### 6.1 支持的 9 种导出格式

| 格式 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| Markdown | `markdown-logo` | phosphor | `unicon get markdown-logo --format react` |
| PDF | `file-pdf` | phosphor | `unicon get file-pdf --format react` |
| JSON | `file-json` | lucide | `unicon get file-json --format react` |
| CSV | `file-spreadsheet` | lucide | `unicon get file-spreadsheet --format react` |
| HTML | `file-html` | phosphor | `unicon get file-html --format react` |
| 纯文本 | `file-text` | lucide | `unicon get file-text --format react` |
| 图片 | `image` | lucide | `unicon get image --format react` |
| 代码 | `file-code` | lucide | `unicon get file-code --format react` |
| XML | `file-code-2` | lucide | `unicon get file-code-2 --format react` |

### 6.2 导出操作图标

| 用途 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| 下载 | `download` | lucide | `unicon get download --format react` |
| 复制 | `copy` | lucide | `unicon get copy --format react` |
| 导出 | `file-down` | lucide | `unicon get file-down --format react` |
| 分享 | `share` | lucide | `unicon get share --format react` |
| 打印 | `printer` | lucide | `unicon get printer --format react` |
| 打开文件夹 | `folder-open` | lucide | `unicon get folder-open --format react` |

---

## 七、Chrome 扩展专属图标

### 7.1 Popup 弹窗

| 用途 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| 设置 | `settings` | lucide | `unicon get settings --format react` |
| 帮助 | `help-circle` | lucide | `unicon get help-circle --format react` |
| 反馈 | `message-square` | lucide | `unicon get message-square --format react` |
| 刷新 | `refresh-cw` | lucide | `unicon get refresh-cw --format react` |
| 固定窗口 | `pin` | lucide | `unicon get pin --format react` |
| 展开 | `maximize-2` | lucide | `unicon get maximize-2 --format react` |

### 7.2 状态指示

| 用途 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| 成功 | `check-circle` | lucide | `unicon get check-circle --format react` |
| 警告 | `alert-triangle` | lucide | `unicon get alert-triangle --format react` |
| 错误 | `x-circle` | lucide | `unicon get x-circle --format react` |
| 加载中 | `loader-2` | lucide | `unicon get loader-2 --format react` |
| 信息 | `info` | lucide | `unicon get info --format react` |
| 离线 | `wifi-off` | lucide | `unicon get wifi-off --format react` |

### 7.3 操作按钮

| 用途 | Unicon 图标 | 库 | 命令 |
|------|------------|-----|------|
| 全选 | `check-square` | lucide | `unicon get check-square --format react` |
| 清空 | `trash-2` | lucide | `unicon get trash-2 --format react` |
| 搜索 | `search` | lucide | `unicon get search --format react` |
| 排序 | `arrow-up-down` | lucide | `unicon get arrow-up-down --format react` |
| 过滤 | `filter` | lucide | `unicon get filter --format react` |
| 预览 | `eye` | lucide | `unicon get eye --format react` |

---

## 八、技术实现

### 8.1 Next.js 项目集成（web/）

**方案 A：直接安装 Unicon CLI，按需生成**

```bash
cd web
npm install -g @webrenew/unicon

# 初始化配置
unicon init --interactive

# 搜索并选择图标
unicon search "navigation" --pick

# 添加到 bundle
unicon add nav --query "home layout sparkles settings"

# 生成 React 组件
unicon sync
```

**方案 B：使用现有 react-icons（推荐保持）**

项目已安装 `react-icons`，可直接使用 `lucide-react` 风格的图标。Unicon 图标与 lucide 视觉一致，可以作为补充。

### 8.2 Chrome 扩展集成（src/popup/）

扩展使用原生 JS/TS，推荐使用 SVG 格式：

```bash
# 获取 SVG 格式
unicon get sparkles --format svg -o src/assets/icons/sparkles.svg
unicon get download --format svg -o src/assets/icons/download.svg
```

### 8.3 图标尺寸规范

| 场景 | 尺寸 | stroke-width |
|------|------|-------------|
| 导航图标 | 20×20 | 2 |
| 功能图标 | 24×24 | 2 |
| 按钮内图标 | 16×16 | 2 |
| 平台 logo | 32×32 | 2 |
| Hero 大图标 | 48×48 | 1.5 |

---

## 九、Unicon 一键生成命令

### 9.1 生成全部官网图标（React 组件）

```bash
cd web
mkdir -p src/components/icons

# 导航类
unicon bundle --query "home sparkles log-in menu x" --format react -o src/components/icons/nav

# 功能类
unicon bundle --query "globe file-text clipboard-copy brain shield layers refresh-cw history" --format react -o src/components/icons/features

# AI 平台
unicon bundle --query "chat-gpt claude-fill gemini-line deepseek-fill perplexity-fill" --format react -o src/components/icons/platforms

# 导出格式
unicon bundle --query "markdown-logo file-pdf file-json file-spreadsheet file-html file-text file-code" --format react -o src/components/icons/formats

# 认证
unicon bundle --query "mail lock user eye eye-off log-out settings" --format react -o src/components/icons/auth
```

### 9.2 生成全部扩展图标（SVG）

```bash
cd src
mkdir -p assets/icons

unicon bundle --query "settings help-circle message-square refresh-cw pin download copy share" --format svg -o assets/icons
```

---

## 十、配色方案

图标采用 `currentColor` 继承父元素颜色，配合 Tailwind CSS：

```css
/* 主要图标颜色 */
.text-primary      → #0F766E (teal-700)
.text-accent       → #6366F1 (indigo-500)
.text-gold         → #FACC15 (yellow-400)
.text-muted        → #94A3B8 (slate-400)
.text-success      → #22C55E (green-500)
.text-warning      → #F59E0B (amber-500)
.text-danger       → #EF4444 (red-500)
```

---

## 十一、图标使用示例

### React 组件中使用

```tsx
import { Sparkles, Download, Globe } from '@/components/icons/nav';

export function Hero() {
  return (
    <div className="flex items-center gap-2">
      <Sparkles className="w-6 h-6 text-primary" />
      <span>AI-Powered Export</span>
    </div>
  );
}
```

### Chrome 扩展中使用

```typescript
// popup.ts
const sparklesIcon = await fetch('assets/icons/sparkles.svg');
const svgText = await sparklesIcon.text();
document.getElementById('logo').innerHTML = svgText;
```

---

> 最后更新：2026-05-31
