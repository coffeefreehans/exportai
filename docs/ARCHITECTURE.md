# ExportAI 系统架构设计文档

> 版本：v2.0.0（SaaS 升级版）
> 架构师：高见远（Gao）
> 日期：2025-07-09

---

## 1. 实现方案 + 框架选型

### 1.1 核心技术挑战

| 挑战 | 说明 | 解决方案 |
|------|------|----------|
| Chrome 扩展 CORS 限制 | 扩展 Popup 无法直接调用后端 API（受浏览器同源策略限制） | 通过 background.js Service Worker 代理 API 请求，Service Worker 不受 CORS 限制 |
| JWT 双 Token 刷新 | Access Token 15min 过期，需无感刷新 | 扩展端拦截 401 响应 → 自动调用 /refresh → 重试原请求 |
| 扩展与官网登录态同步 | 两端共享同一后端，但 token 存储位置不同 | 官网使用 httpOnly cookie + localStorage；扩展使用 chrome.storage.local |
| Docker 一键部署 | 多服务编排 + 网络互通 | Docker Compose 统一编排，自定义 bridge 网络，服务名 DNS 解析 |

### 1.2 框架选型

| 组件 | 选型 | 版本 | 选型理由 |
|------|------|------|----------|
| 后端框架 | Express | ^4.18 | 轻量成熟，中间件生态丰富，TypeScript 支持好 |
| 数据库 | PostgreSQL | 15+ | JSON 字段支持、全文搜索、扩展性强 |
| ORM | Prisma | ^5.0 | 类型安全、自动迁移、查询 API 直观 |
| 认证 | JWT (jsonwebtoken) | ^9.0 | 业界标准，无状态，适合扩展场景 |
| 密码加密 | bcryptjs | ^2.4 | 纯 JS 实现，无需原生编译，Docker 友好 |
| 请求校验 | Zod | ^3.22 | TypeScript-first schema 校验，类型推导 |
| 邮件 | Nodemailer | ^6.9 | 开发环境 Ethereal 免费测试；生产环境可切换 Resend |
| 官网前端 | Next.js (App Router) | ^14.0 | SSR/SSG 支持、SEO 友好、文件路由 |
| CSS 方案 | Tailwind CSS | ^3.4 | 原子化 CSS，暗色主题切换方便 |
| 容器化 | Docker Compose | v2 | 一键编排多服务，开发/生产统一 |

### 1.3 架构模式

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Compose                            │
│                                                                  │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │   官网前端       │  │    后端 API      │  │   PostgreSQL     │  │
│  │   Next.js       │  │    Express       │  │   数据库          │  │
│  │   :3000         │──│    :4000         │──│   :5432          │  │
│  │   SSR + CSR     │  │    REST API      │  │   Prisma ORM     │  │
│  └────────────────┘  └─────────────────┘  └──────────────────┘  │
│         │                     │                                   │
│         │    ┌────────────────┘                                   │
│         │    │                                                    │
│  ┌──────┴────┴──────────────────────────────────────────────┐    │
│  │           Chrome Extension (Manifest V3)                  │    │
│  │  ┌─────────┐    ┌──────────────┐    ┌────────────────┐  │    │
│  │  │  Popup  │───→│ Background   │───→│  后端 API      │  │    │
│  │  │  UI     │    │ Service Wkr  │    │  :4000         │  │    │
│  │  └─────────┘    └──────────────┘    └────────────────┘  │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

- **后端**：经典三层架构（Route → Service → Prisma DAO）
- **官网前端**：Next.js App Router，服务端组件 + 客户端组件混合
- **扩展**：Popup 负责 UI，Background Service Worker 负责网络请求代理

---

## 2. 完整文件列表

### 2.1 后端（server/ 目录）

```
server/
├── package.json                    # 依赖声明 + 脚本
├── tsconfig.json                   # TypeScript 配置
├── Dockerfile                      # 后端容器构建
├── .env.example                    # 环境变量模板
├── prisma/
│   └── schema.prisma               # 数据模型定义
└── src/
    ├── index.ts                    # Express 入口（启动服务器、挂载中间件/路由）
    ├── config/
    │   ├── env.ts                  # 环境变量校验与导出（Zod schema）
    │   └── cors.ts                 # CORS 配置（允许扩展 + 官网来源）
    ├── middleware/
    │   ├── auth.ts                 # JWT 认证中间件（验证 access token）
    │   └── validate.ts             # 请求体校验中间件（基于 Zod schema）
    ├── routes/
    │   └── auth.ts                 # /api/auth/* 路由定义
    ├── services/
    │   ├── auth.service.ts         # 认证业务逻辑（注册/登录/登出/密码重置）
    │   ├── token.service.ts        # Token 生成、验证、刷新逻辑
    │   └── email.service.ts        # 邮件发送（Nodemailer + Ethereal/Resend）
    └── utils/
        └── errors.ts              # 自定义错误类（AppError、ErrorCode 枚举）
```

### 2.2 官网前端（web/ 目录）

```
web/
├── package.json                    # 依赖声明 + 脚本
├── next.config.js                  # Next.js 配置（API proxy 等）
├── tailwind.config.ts              # Tailwind 配置（暗色主题 + 自定义色板）
├── tsconfig.json                   # TypeScript 配置
├── postcss.config.js               # PostCSS 配置
├── Dockerfile                      # 前端容器构建
├── public/
│   └── favicon.ico                 # 网站图标
└── src/
    ├── app/
    │   ├── layout.tsx              # 根布局（全局样式 + 字体 + Navbar）
    │   ├── page.tsx                # 首页着陆页
    │   ├── login/
    │   │   └── page.tsx            # 登录页
    │   ├── register/
    │   │   └── page.tsx            # 注册页
    │   ├── forgot-password/
    │   │   └── page.tsx            # 忘记密码页
    │   └── reset-password/
    │       └── page.tsx            # 重置密码页
    ├── components/
    │   ├── Navbar.tsx              # 顶部导航栏
    │   ├── Hero.tsx                # 首页 Hero 区块
    │   ├── Features.tsx            # 功能展示区块
    │   ├── Testimonials.tsx        # 用户评价区块
    │   ├── FAQ.tsx                 # 常见问题折叠面板
    │   ├── Footer.tsx              # 页脚
    │   └── AuthForm.tsx            # 登录/注册通用表单组件
    └── lib/
        └── api.ts                  # API 调用封装（fetch + token 管理）
```

### 2.3 扩展修改（现有文件）

```
popup/
├── popup.html                      # 新增：登录面板区域 HTML
├── popup.js                        # 新增：登录/登出/用户状态逻辑
└── popup.css                       # 新增：登录面板样式
background/
└── background.js                   # 新增：API 请求代理消息处理
```

### 2.4 根目录

```
ExportAI/
├── docker-compose.yml              # 服务编排
├── .env.example                    # 全局环境变量模板
├── manifest.json                   # 扩展清单（需新增 permissions）
└── ...（现有扩展文件不动）
```

---

## 3. 数据模型与接口

### 3.1 Prisma Schema

```prisma
// server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String         @id @default(uuid()) @db.Uuid
  email        String         @unique @db.VarChar(255)
  passwordHash String         @map("password_hash") @db.VarChar(255)
  isActive     Boolean        @default(true) @map("is_active")
  createdAt    DateTime       @default(now()) @map("created_at") @db.Timestamp
  updatedAt    DateTime       @updatedAt @map("updated_at") @db.Timestamp

  refreshTokens RefreshToken[]
  passwordResets PasswordReset[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique @db.VarChar(500)
  expiresAt DateTime @map("expires_at") @db.Timestamp
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamp
  revokedAt DateTime? @map("revoked_at") @db.Timestamp

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model PasswordReset {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique @db.VarChar(500)
  expiresAt DateTime @map("expires_at") @db.Timestamp
  usedAt    DateTime? @map("used_at") @db.Timestamp
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamp

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@map("password_resets")
}
```

### 3.2 类图

```mermaid
classDiagram
    class User {
        +string id
        +string email
        +string passwordHash
        +boolean isActive
        +Date createdAt
        +Date updatedAt
        +refreshTokens: RefreshToken[]
        +passwordResets: PasswordReset[]
    }

    class RefreshToken {
        +string id
        +string userId
        +string token
        +Date expiresAt
        +Date createdAt
        +Date revokedAt
        +User user
    }

    class PasswordReset {
        +string id
        +string userId
        +string token
        +Date expiresAt
        +Date usedAt
        +Date createdAt
        +User user
    }

    class AuthService {
        +register(email, password) User
        +login(email, password) AuthResult
        +logout(userId, refreshToken) void
        +forgotPassword(email) void
        +resetPassword(token, newPassword) void
        +getMe(userId) User
    }

    class TokenService {
        +generateAccessToken(userId) string
        +generateRefreshToken(userId) RefreshToken
        +verifyAccessToken(token) TokenPayload
        +verifyRefreshToken(token) RefreshToken
        +refreshTokens(refreshToken) AuthResult
        +revokeRefreshToken(token) void
        +revokeAllUserTokens(userId) void
    }

    class EmailService {
        +sendPasswordResetEmail(email, resetToken) void
        +sendWelcomeEmail(email) void
    }

    class AuthMiddleware {
        +authenticate(req, res, next) void
    }

    class ValidateMiddleware {
        +validate(schema)(req, res, next) void
    }

    class AuthRoute {
        +POST /register
        +POST /login
        +POST /logout
        +POST /refresh
        +POST /forgot-password
        +POST /reset-password
        +GET /me
    }

    User "1" --o "many" RefreshToken : has
    User "1" --o "many" PasswordReset : has
    AuthService --> TokenService : uses
    AuthService --> EmailService : uses
    AuthService --> User : manages
    AuthRoute --> AuthService : delegates
    AuthRoute --> ValidateMiddleware : validates
    AuthMiddleware --> TokenService : verifies
```

### 3.3 API 接口定义

#### POST /api/auth/register — 用户注册

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**校验规则**：
- `email`：合法邮箱格式
- `password`：≥ 8 位

**成功响应** `201`：
```json
{
  "code": 201,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "createdAt": "2025-07-09T00:00:00.000Z"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  },
  "message": "注册成功"
}
```

**失败响应** `409`：
```json
{
  "code": 409,
  "data": null,
  "message": "该邮箱已注册"
}
```

---

#### POST /api/auth/login — 用户登录

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**成功响应** `200`：
```json
{
  "code": 200,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "createdAt": "2025-07-09T00:00:00.000Z"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  },
  "message": "登录成功"
}
```

**失败响应** `401`：
```json
{
  "code": 401,
  "data": null,
  "message": "邮箱或密码错误"
}
```

---

#### POST /api/auth/logout — 用户登出

**请求头**：`Authorization: Bearer <access_token>`

**请求体**：
```json
{
  "refreshToken": "eyJhbG..."
}
```

**成功响应** `200`：
```json
{
  "code": 200,
  "data": null,
  "message": "登出成功"
}
```

---

#### POST /api/auth/refresh — 刷新 Token

**请求体**：
```json
{
  "refreshToken": "eyJhbG..."
}
```

**成功响应** `200`：
```json
{
  "code": 200,
  "data": {
    "accessToken": "eyJhbG...(新)",
    "refreshToken": "eyJhbG...(新)"
  },
  "message": "Token 刷新成功"
}
```

**失败响应** `401`：
```json
{
  "code": 401,
  "data": null,
  "message": "Refresh token 无效或已过期"
}
```

---

#### POST /api/auth/forgot-password — 忘记密码

**请求体**：
```json
{
  "email": "user@example.com"
}
```

**成功响应** `200`（无论邮箱是否存在都返回相同内容，防止枚举）：
```json
{
  "code": 200,
  "data": null,
  "message": "如果该邮箱已注册，重置链接已发送"
}
```

---

#### POST /api/auth/reset-password — 重置密码

**请求体**：
```json
{
  "token": "reset-token-uuid",
  "password": "newpassword123"
}
```

**校验规则**：
- `password`：≥ 8 位
- `token`：有效且未使用，未过期（30 分钟内）

**成功响应** `200`：
```json
{
  "code": 200,
  "data": null,
  "message": "密码重置成功"
}
```

**失败响应** `400`：
```json
{
  "code": 400,
  "data": null,
  "message": "重置链接无效或已过期"
}
```

---

#### GET /api/auth/me — 获取当前用户

**请求头**：`Authorization: Bearer <access_token>`

**成功响应** `200`：
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "isActive": true,
    "createdAt": "2025-07-09T00:00:00.000Z"
  },
  "message": "ok"
}
```

**失败响应** `401`：
```json
{
  "code": 401,
  "data": null,
  "message": "未授权，请先登录"
}
```

---

### 3.4 错误码约定

| HTTP Status | code | message | 场景 |
|-------------|------|---------|------|
| 400 | 400 | 请求参数校验失败 | Zod 校验不通过 |
| 400 | 400 | 重置链接无效或已过期 | reset token 无效/过期/已使用 |
| 401 | 401 | 未授权，请先登录 | access token 缺失/无效/过期 |
| 401 | 401 | Refresh token 无效或已过期 | refresh token 校验失败 |
| 401 | 401 | 邮箱或密码错误 | 登录凭据不匹配 |
| 409 | 409 | 该邮箱已注册 | 注册邮箱重复 |
| 429 | 429 | 请求过于频繁 | 限流触发 |
| 500 | 500 | 服务器内部错误 | 未预期异常 |

---

## 4. 程序调用流程

### 4.1 注册流程

```mermaid
sequenceDiagram
    participant C as Client (Popup/Web)
    participant B as Background SW
    participant S as Server (Express)
    participant AS as AuthService
    participant TS as TokenService
    participant DB as PostgreSQL

    C->>B: sendMessage({type: "API_REQUEST", ...})
    B->>S: POST /api/auth/register {email, password}
    S->>S: validate(schemaRegister)
    S->>AS: register(email, password)
    AS->>DB: prisma.user.findUnique({email})
    DB-->>AS: null (邮箱未注册)
    AS->>AS: bcrypt.hash(password, 12)
    AS->>DB: prisma.user.create({email, passwordHash})
    DB-->>AS: user
    AS->>TS: generateAccessToken(user.id)
    TS-->>AS: accessToken
    AS->>TS: generateRefreshToken(user.id)
    TS->>DB: prisma.refreshToken.create({userId, token, expiresAt})
    DB-->>TS: refreshToken record
    TS-->>AS: refreshToken
    AS-->>S: {user, accessToken, refreshToken}
    S-->>B: 201 {code, data, message}
    B-->>C: sendMessage response
    C->>C: 存储 tokens → chrome.storage.local
    C->>C: 更新 UI 为已登录状态
```

### 4.2 登录流程

```mermaid
sequenceDiagram
    participant C as Client (Popup/Web)
    participant B as Background SW
    participant S as Server (Express)
    participant AS as AuthService
    participant TS as TokenService
    participant DB as PostgreSQL

    C->>B: sendMessage({type: "API_REQUEST", ...})
    B->>S: POST /api/auth/login {email, password}
    S->>S: validate(schemaLogin)
    S->>AS: login(email, password)
    AS->>DB: prisma.user.findUnique({email})
    DB-->>AS: user
    AS->>AS: bcrypt.compare(password, user.passwordHash)
    Note over AS: 密码匹配 ✓
    AS->>TS: generateAccessToken(user.id)
    TS-->>AS: accessToken
    AS->>TS: generateRefreshToken(user.id)
    TS->>DB: prisma.refreshToken.create(...)
    TS-->>AS: refreshToken
    AS-->>S: {user, accessToken, refreshToken}
    S-->>B: 200 {code, data, message}
    B-->>C: sendMessage response
    C->>C: 存储 tokens → chrome.storage.local
    C->>C: 更新 UI 为已登录状态
```

### 4.3 Token 刷新流程

```mermaid
sequenceDiagram
    participant C as Client (Popup)
    participant B as Background SW
    participant S as Server (Express)
    participant TS as TokenService
    participant DB as PostgreSQL

    Note over C: access token 过期，收到 401
    C->>B: sendMessage({type: "API_REQUEST", url, options})
    B->>S: 请求 API (携带过期 access token)
    S-->>B: 401 {code: 401, message: "未授权"}
    B->>B: 检测 401 → 从 chrome.storage 获取 refreshToken
    B->>S: POST /api/auth/refresh {refreshToken}
    S->>TS: refreshTokens(refreshToken)
    TS->>DB: prisma.refreshToken.findUnique({token})
    DB-->>TS: tokenRecord
    TS->>TS: 校验 expiresAt 和 revokedAt
    TS->>DB: prisma.refreshToken.update({revokedAt: now}) (作废旧 token)
    TS->>TS: generateAccessToken(userId)
    TS->>TS: generateRefreshToken(userId) (轮转)
    TS->>DB: prisma.refreshToken.create(...)
    TS-->>S: {accessToken, refreshToken}
    S-->>B: 200 {code, data}
    B->>B: 更新 chrome.storage 中的 tokens
    B->>S: 重试原请求 (携带新 access token)
    S-->>B: 200 原始响应
    B-->>C: 返回原始请求结果
```

### 4.4 密码重置流程

```mermaid
sequenceDiagram
    participant W as Web (官网)
    participant S as Server (Express)
    participant AS as AuthService
    participant ES as EmailService
    participant DB as PostgreSQL

    W->>S: POST /api/auth/forgot-password {email}
    S->>AS: forgotPassword(email)
    AS->>DB: prisma.user.findUnique({email})
    DB-->>AS: user (存在)
    AS->>AS: crypto.randomBytes(32) → resetToken
    AS->>AS: bcrypt.hash(resetToken) → tokenHash
    AS->>DB: prisma.passwordReset.create({userId, token: tokenHash, expiresAt: now+30min})
    AS->>ES: sendPasswordResetEmail(email, resetToken)
    ES->>ES: Nodemailer → Ethereal/Resend
    ES-->>AS: 发送成功
    AS-->>S: void
    S-->>W: 200 {message: "如果该邮箱已注册，重置链接已发送"}

    Note over W: 用户点击邮件中的重置链接
    W->>W: 跳转到 /reset-password?token=xxx

    W->>S: POST /api/auth/reset-password {token, password}
    S->>AS: resetPassword(token, password)
    AS->>DB: prisma.passwordReset.findFirst({token: hash(token), usedAt: null})
    DB-->>AS: resetRecord
    AS->>AS: 校验 expiresAt > now
    AS->>AS: bcrypt.hash(newPassword, 12)
    AS->>DB: prisma.user.update({passwordHash})
    AS->>DB: prisma.passwordReset.update({usedAt: now})
    AS-->>S: void
    S-->>W: 200 {message: "密码重置成功"}
```

---

## 5. 任务列表

### 5.1 依赖包列表

#### 后端（server/package.json）

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "@prisma/client": "^5.10.0",
    "nodemailer": "^6.9.13",
    "dotenv": "^16.4.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.2.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/nodemailer": "^6.4.14",
    "prisma": "^5.10.0",
    "ts-node-dev": "^2.0.0"
  }
}
```

#### 官网前端（web/package.json）

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-icons": "^5.0.1"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### 5.2 任务分解

---

#### T01: 项目基础设施（后端 + 前端 + Docker 配置）

**描述**：搭建后端和前端的脚手架项目，安装依赖，配置 TypeScript、Dockerfile 和 Docker Compose。确保 `docker-compose up` 能启动所有服务。

**涉及文件**：
- `server/package.json`
- `server/tsconfig.json`
- `server/Dockerfile`
- `server/.env.example`
- `server/prisma/schema.prisma`
- `server/src/index.ts`（基础 Express 启动）
- `server/src/config/env.ts`
- `server/src/config/cors.ts`
- `server/src/utils/errors.ts`
- `web/package.json`
- `web/tsconfig.json`
- `web/next.config.js`
- `web/tailwind.config.ts`
- `web/postcss.config.js`
- `web/Dockerfile`
- `web/public/favicon.ico`
- `web/src/app/layout.tsx`（空壳布局）
- `web/src/app/page.tsx`（占位首页）
- `docker-compose.yml`
- `.env.example`

**依赖任务**：无

**优先级**：P0

**预估复杂度**：L

---

#### T02: 后端认证 API 全栈实现

**描述**：实现完整的认证体系——注册、登录、登出、Token 刷新、密码重置。包括 Prisma 数据模型、中间件、路由、服务层、邮件发送。

**涉及文件**：
- `server/prisma/schema.prisma`（完善模型）
- `server/src/middleware/auth.ts`
- `server/src/middleware/validate.ts`
- `server/src/routes/auth.ts`
- `server/src/services/auth.service.ts`
- `server/src/services/token.service.ts`
- `server/src/services/email.service.ts`
- `server/src/index.ts`（挂载路由）

**依赖任务**：T01

**优先级**：P0

**预估复杂度**：L

---

#### T03: 官网前端着陆页 + 认证页面

**描述**：实现官网暗色主题着陆页（Hero → 功能 → 评价 → FAQ → CTA）及登录/注册/忘记密码/重置密码页面。包含 API 调用封装和 token 管理。

**涉及文件**：
- `web/src/app/page.tsx`（完整着陆页）
- `web/src/app/login/page.tsx`
- `web/src/app/register/page.tsx`
- `web/src/app/forgot-password/page.tsx`
- `web/src/app/reset-password/page.tsx`
- `web/src/components/Navbar.tsx`
- `web/src/components/Hero.tsx`
- `web/src/components/Features.tsx`
- `web/src/components/Testimonials.tsx`
- `web/src/components/FAQ.tsx`
- `web/src/components/Footer.tsx`
- `web/src/components/AuthForm.tsx`
- `web/src/lib/api.ts`

**依赖任务**：T01

**优先级**：P0

**预估复杂度**：L

---

#### T04: Chrome 扩展登录集成

**描述**：在现有扩展 Popup 中集成登录/登出/用户状态功能，修改 Background Service Worker 添加 API 请求代理，实现 Token 自动刷新。更新 manifest.json 添加必要权限。

**涉及文件**：
- `popup/popup.html`（新增登录面板区域）
- `popup/popup.js`（新增登录/登出/用户状态逻辑）
- `popup/popup.css`（新增登录面板样式）
- `background/background.js`（新增 API 代理消息处理 + Token 刷新）
- `manifest.json`（新增权限声明）

**依赖任务**：T01、T02

**优先级**：P0

**预估复杂度**：M

---

#### T05: 全链路集成 + Docker 部署验证

**描述**：端到端联调所有组件——官网注册 → 扩展登录 → Token 刷新 → 密码重置。验证 Docker Compose 一键部署，确保网络互通、环境变量正确、数据持久化。

**涉及文件**：
- `docker-compose.yml`（调优配置）
- `server/.env.example`（完善变量）
- `.env.example`（完善变量）
- `server/src/config/cors.ts`（根据实际扩展 ID 调整）
- `web/next.config.js`（API 代理确认）

**依赖任务**：T02、T03、T04

**优先级**：P0

**预估复杂度**：M

---

### 5.3 任务依赖图

```mermaid
graph LR
    T01[T01: 项目基础设施] --> T02[T02: 后端认证 API]
    T01 --> T03[T03: 官网前端页面]
    T01 --> T04[T04: 扩展登录集成]
    T02 --> T04
    T02 --> T05[T05: 全链路集成验证]
    T03 --> T05
    T04 --> T05
```

---

## 6. 共享知识

### 6.1 API 响应格式约定

所有 API 响应统一使用以下格式：

```typescript
interface ApiResponse<T> {
  code: number;       // HTTP status code
  data: T | null;     // 业务数据，失败时为 null
  message: string;    // 人类可读的消息
}
```

### 6.2 Token 存储策略

| 端 | Access Token | Refresh Token | 说明 |
|----|-------------|---------------|------|
| Chrome 扩展 | `chrome.storage.local` | `chrome.storage.local` | 不用 `sync`（有容量限制） |
| 官网前端 | `localStorage` | `localStorage` | 页面刷新后保留 |

**扩展端存储键名**：
```javascript
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'exportai_access_token',
  REFRESH_TOKEN: 'exportai_refresh_token',
  USER_INFO: 'exportai_user_info',
};
```

### 6.3 JWT Token 规格

| 属性 | Access Token | Refresh Token |
|------|-------------|---------------|
| 有效期 | 15 分钟 | 7 天 |
| 算法 | HS256 | HS256 |
| Payload | `{ userId, type: 'access' }` | `{ userId, type: 'refresh' }` |
| 存储 | 客户端存储 | 客户端存储 + 数据库记录 |
| 轮转 | 不轮转 | 每次刷新时轮转（旧 token 作废，颁发新 token） |

### 6.4 环境变量清单

#### 后端（server/.env）

```env
# 数据库
DATABASE_URL=postgresql://exportai:exportai_secret@postgres:5432/exportai?schema=public

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 邮件
MAIL_PROVIDER=ethereal          # ethereal | resend
RESEND_API_KEY=                 # Resend API Key（生产环境）
MAIL_FROM=noreply@exportai.com

# 服务器
PORT=4000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID,http://localhost:3000

# 前端
WEB_URL=http://localhost:3000
```

#### 前端（web/.env.local）

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

#### Docker Compose 全局

```env
POSTGRES_USER=exportai
POSTGRES_PASSWORD=exportai_secret
POSTGRES_DB=exportai
```

### 6.5 扩展消息协议

扩展内部通过 `chrome.runtime.sendMessage` 通信，新增以下消息类型：

```typescript
// Popup → Background：发起 API 请求
interface ApiRequestMessage {
  type: 'API_REQUEST';
  url: string;           // 相对路径，如 '/api/auth/login'
  method: 'GET' | 'POST';
  body?: object;
}

// Background → Popup：API 响应
interface ApiResponseMessage {
  type: 'API_RESPONSE';
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

// Popup → Background：检查登录状态
interface CheckAuthMessage {
  type: 'CHECK_AUTH';
}

// Background → Popup：登录状态响应
interface AuthStatusMessage {
  type: 'AUTH_STATUS';
  isLoggedIn: boolean;
  user?: { id: string; email: string };
}
```

### 6.6 manifest.json 权限变更

需新增以下权限：

```json
{
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "downloads"
  ],
  "host_permissions": [
    "https://claude.ai/*",
    "...(现有平台)",
    "http://localhost:4000/*"
  ]
}
```

> 注意：生产环境需将 `http://localhost:4000/*` 替换为实际 API 域名。

---

## 7. 待明确事项（已决策）

| # | 问题 | 决策 | 理由 |
|---|------|------|------|
| 1 | 数据库选型 | **PostgreSQL** | JSON 字段支持、全文搜索、Prisma 生态最佳 |
| 2 | 邮件服务 | **Nodemailer + Ethereal**（开发）/ **Resend**（生产） | 开发环境零成本测试，生产环境开发者友好 |
| 3 | 密码策略 | **≥ 8 位**，无特殊字符要求 | 平衡安全性与用户体验，后续可增强 |
| 4 | 域名 | 暂用 localhost，部署时配置 | 不阻塞开发 |
| 5 | 部署平台 | Docker Compose，先本地/VM 部署 | 降低初期运维复杂度 |
| 6 | CORS 策略 | 开发环境允许 localhost + 扩展 ID；生产环境配置实际域名 | Background SW 代理请求可规避大部分 CORS 问题 |

---

## 8. 附录：Background Service Worker API 代理设计

扩展端的 CORS 限制通过 Background Service Worker 代理解决。核心实现思路：

```javascript
// background.js 新增代码（伪代码）
const API_BASE = 'http://localhost:4000';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'API_REQUEST') {
    handleApiRequest(msg, sendResponse);
    return true; // 异步 sendResponse
  }

  if (msg.type === 'CHECK_AUTH') {
    checkAuthStatus(sendResponse);
    return true;
  }

  // ... 现有消息处理
});

async function handleApiRequest(msg, sendResponse) {
  try {
    // 从 storage 获取 token
    const tokens = await getStoredTokens();

    const headers = { 'Content-Type': 'application/json' };
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    let response = await fetch(`${API_BASE}${msg.url}`, {
      method: msg.method,
      headers,
      body: msg.body ? JSON.stringify(msg.body) : undefined,
    });

    // 自动刷新 Token
    if (response.status === 401 && tokens?.refreshToken) {
      const refreshResult = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (refreshResult.ok) {
        const refreshData = await refreshResult.json();
        await storeTokens(refreshData.data.accessToken, refreshData.data.refreshToken);

        // 重试原请求
        headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
        response = await fetch(`${API_BASE}${msg.url}`, {
          method: msg.method,
          headers,
          body: msg.body ? JSON.stringify(msg.body) : undefined,
        });
      } else {
        // Refresh 也失败 → 清除 token，要求重新登录
        await clearTokens();
      }
    }

    const data = await response.json();
    sendResponse({
      type: 'API_RESPONSE',
      success: response.ok,
      data: data.data,
      error: data.message,
      statusCode: response.status,
    });
  } catch (err) {
    sendResponse({
      type: 'API_RESPONSE',
      success: false,
      error: err.message,
    });
  }
}
```
