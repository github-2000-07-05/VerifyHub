# 验证码服务 API 文档

> 一个安全、可靠的邮件验证码发送和验证服务

## 功能特性

- ✅ 邮件验证码发送（支持多种邮件服务商）
- ✅ 验证码状态追踪（等待验证/验证成功/已过期/已作废）
- ✅ 错误尝试次数限制（默认3次）
- ✅ 自定义邮件模板（支持占位符）
- ✅ API Key 认证机制
- ✅ 速率限制保护

## 快速开始

### 1. 注册账户

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "your_name",
    "email": "your@email.com",
    "password": "YourPassword@123"
  }'
```

### 2. 登录获取 Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "YourPassword@123"
  }'
```

### 3. 创建项目获取 API Key

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Project",
    "emailSubject": "验证码验证",
    "emailContent": "您的验证码是：{{code}}"
  }'
```

### 4. 发送验证码

```bash
curl -X POST http://localhost:3000/api/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "apiKey": "YOUR_API_KEY",
    "skipUserCheck": true
  }'
```

### 5. 验证验证码

```bash
curl -X PUT http://localhost:3000/api/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456",
    "skipUserCheck": true
  }'
```

---

## API 接口文档

### 认证接口

#### 注册
**POST** `/api/auth/register`

请求体：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 用户姓名（1-50字符） |
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码（至少8位，包含大小写字母和数字） |

响应示例：
```json
{
  "success": true,
  "message": "注册成功",
  "token": "JWT_TOKEN",
  "user": {
    "id": "user_id",
    "name": "your_name",
    "email": "your@email.com"
  }
}
```

#### 登录
**POST** `/api/auth/login`

请求体：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码 |

响应示例：
```json
{
  "success": true,
  "message": "登录成功",
  "token": "JWT_TOKEN",
  "user": {
    "id": "user_id",
    "name": "your_name",
    "email": "your@email.com"
  }
}
```

---

### 验证码接口

#### 发送验证码
**POST** `/api/send-code`

请求体：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 接收验证码的邮箱 |
| apiKey | string | 否 | 项目 API Key（使用自定义模板） |
| skipUserCheck | boolean | 否 | 是否跳过用户注册检查（默认 false） |

响应示例：
```json
{
  "success": true,
  "message": "验证码已发送到您的邮箱"
}
```

#### 验证验证码
**PUT** `/api/send-code`

请求体：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 用户邮箱 |
| code | string | 是 | 验证码（6位数字） |
| skipUserCheck | boolean | 否 | 是否跳过用户注册检查 |

响应示例（成功）：
```json
{
  "success": true,
  "message": "验证成功",
  "status": "verified",
  "requestId": "req_xxx"
}
```

响应示例（失败）：
```json
{
  "success": false,
  "message": "验证码错误，还剩 2 次机会",
  "status": "pending",
  "requestId": "req_xxx",
  "attempts": 1,
  "maxAttempts": 3
}
```

#### 查询验证码状态
**GET** `/api/send-code?email=xxx` 或 `/api/send-code?requestId=xxx`

响应示例：
```json
{
  "success": true,
  "verification": {
    "requestId": "req_xxx",
    "status": "pending",
    "email": "user@example.com",
    "expiresAt": "2024-01-01T12:00:00Z",
    "attemptCount": 1,
    "maxAttempts": 3,
    "createdAt": "2024-01-01T11:55:00Z"
  }
}
```

---

### 项目管理接口

> 所有项目接口需要在请求头中携带 `Authorization: Bearer YOUR_JWT_TOKEN`

#### 获取项目列表
**GET** `/api/projects`

响应示例：
```json
{
  "success": true,
  "projects": [
    {
      "id": "project_id",
      "name": "My Project",
      "apiKey": "abc123...",
      "emailSubject": "验证码验证",
      "emailContent": "您的验证码是：{{code}}",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

#### 创建项目
**POST** `/api/projects`

请求体：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 项目名称（1-100字符） |
| description | string | 否 | 项目描述（最多500字符） |
| emailSubject | string | 否 | 邮件主题（最多200字符，默认"验证码验证"） |
| emailContent | string | 否 | 邮件内容（最多5000字符，支持占位符） |

响应示例：
```json
{
  "success": true,
  "project": {
    "id": "project_id",
    "name": "My Project",
    "apiKey": "abc123def456...",
    "emailSubject": "验证码验证",
    "emailContent": "您的验证码是：{{code}}"
  }
}
```

#### 获取项目详情
**GET** `/api/projects/:id`

响应示例：同创建项目响应

#### 更新项目
**PUT** `/api/projects/:id`

请求体：同创建项目

#### 删除项目
**DELETE** `/api/projects/:id`

响应示例：
```json
{
  "success": true,
  "message": "删除成功"
}
```

#### 重新生成 API Key
**POST** `/api/projects/:id/regenerate-key`

响应示例：
```json
{
  "success": true,
  "message": "API Key 已重新生成",
  "apiKey": "new_api_key_here"
}
```

#### 获取项目日志
**GET** `/api/projects/:id/logs`

响应示例：
```json
{
  "success": true,
  "logs": [
    {
      "id": "log_id",
      "email": "user@example.com",
      "status": "success",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

---

## 验证码状态说明

| 状态 | 说明 |
|------|------|
| `pending` | 等待验证（验证码已发送，等待用户输入） |
| `verified` | 验证成功（验证码已正确使用） |
| `expired` | 已过期（5分钟内未使用） |
| `invalid` | 已作废（错误尝试超过3次） |

---

## 邮件模板占位符

支持以下占位符，发送邮件时会自动替换：

| 占位符 | 替换内容 |
|--------|----------|
| `{{code}}` | 6位数字验证码 |
| `{{email}}` | 收件人邮箱地址 |
| `{{expireMinutes}}` | 验证码有效期（分钟） |

示例模板：
```html
<div style="padding: 20px; border: 1px solid #eee; border-radius: 8px;">
  <h3>您好，{{email}}</h3>
  <p>您的验证码是：<strong>{{code}}</strong></p>
  <p>验证码有效期为 {{expireMinutes}} 分钟</p>
</div>
```

---

## 错误码说明

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 请求参数错误 |
| 401 | 未授权（缺少或无效的 Token） |
| 403 | 无权限（无法访问资源） |
| 404 | 资源不存在 |
| 429 | 请求过于频繁（速率限制） |
| 500 | 服务器内部错误 |

---

## 速率限制

| 接口 | 限制 |
|------|------|
| `/api/send-code` | 5分钟内最多5次 |
| `/api/auth/login` | 15分钟内最多10次 |
| `/api/auth/register` | 15分钟内最多5次 |

---

## 安全建议

1. **保护 API Key**：不要将 API Key 硬编码在客户端代码中
2. **使用 HTTPS**：生产环境务必使用 HTTPS 协议
3. **设置正确的 CORS**：限制允许访问的域名
4. **定期轮换 API Key**：定期重新生成项目的 API Key
5. **验证码有效期**：验证码有效期为5分钟，请提醒用户及时使用

---

## 环境变量配置

```bash
# 数据库配置
DATABASE_URL="file:./dev.db"

# JWT 密钥（生产环境使用强随机字符串）
JWT_SECRET="your_jwt_secret_here"

# 允许的域名（生产环境设置具体域名）
ALLOWED_ORIGIN="*"

# 邮件服务配置（选择一种即可）
EMAIL_SERVICE="gmail"  # gmail, qq, netease, outlook, sendgrid
EMAIL_USER="your_email@example.com"
EMAIL_PASS="your_email_password"
EMAIL_FROM_NAME="验证码服务"
```

---

## 技术栈

- **框架**: Next.js 15
- **数据库**: SQLite（支持 PostgreSQL/MySQL）
- **ORM**: Prisma
- **认证**: JWT
- **邮件**: Nodemailer

---

## License

MIT