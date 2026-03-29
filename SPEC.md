# Wanjukong — 技术规格说明书 (SPEC)

> 产品需求详见 [PRD.md](./PRD.md)

---

## 1. 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 运行时 | Node.js | >= 20 |
| 包管理 | pnpm workspaces | 9.15 |
| 语言 | TypeScript | 5.7 |
| API 服务 | NestJS | 10.4 |
| ORM | Prisma | 6.0 |
| 数据库 | PostgreSQL | 16 |
| 前台 / 后台 | Nuxt 3 (Vue 3) | 3.15 |
| 状态管理 | Pinia (仅后台) | 2.3 |
| 对象存储 | 腾讯云 COS (STS 直传) | — |
| 支付 | PayPal REST API v2 | — |
| 密码哈希 | Argon2 | — |
| 邮件 | Nodemailer | — |
| 定时任务 | @nestjs/schedule | 6.1 |

---

## 2. 项目结构

```
wanjukong/
├── apps/
│   ├── api/          # NestJS 后端 (Port 3001)
│   │   ├── prisma/   # Schema + 迁移
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── health/
│   │       │   ├── brands/
│   │       │   ├── categories/
│   │       │   ├── products/         # 含 images、variants 子模块
│   │       │   ├── orders/           # 含 admin/public controllers
│   │       │   ├── payments/         # PayPal 集成
│   │       │   ├── uploads/
│   │       │   ├── admin-auth/       # Admin Session 认证 + 角色
│   │       │   ├── storefront-auth/  # 客户注册/登录
│   │       │   ├── storefront-account/ # 客户资料/地址/订单
│   │       │   └── mailer/           # 邮件发送服务
│   │       ├── prisma/               # PrismaService
│   │       ├── app.module.ts
│   │       └── main.ts
│   ├── web/          # 买家前台 Nuxt (Port 3000)
│   └── admin/        # 管理后台 Nuxt (Port 3002)
├── packages/
│   └── shared/       # 共享常量 (APP_NAME, API_PREFIX)
├── deploy/           # 部署脚本 (Nginx, Certbot)
└── infra/
    └── docker-compose.yml   # PostgreSQL
```

---

## 3. 环境变量

### API (`apps/api/.env`)
```env
PORT=3001
CORS_ORIGIN=http://localhost:3000,http://localhost:3002
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wanjukong
SESSION_SECRET=dev-session-secret-change-in-production
APP_BASE_URL=http://localhost:3000

# 腾讯云 COS
TENCENT_COS_SECRET_ID=
TENCENT_COS_SECRET_KEY=
TENCENT_COS_BUCKET=bucket-name-1250000000
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_PUBLIC_BASE_URL=https://bucket-name.cos.ap-guangzhou.myqcloud.com

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# 邮件（可选，未配置时日志输出）
MAIL_HOST=
MAIL_PORT=
MAIL_USER=
MAIL_PASS=
MAIL_FROM=

UPLOAD_TEMP_EXPIRE_HOURS=24
```

### Web (`apps/web/.env`)
```env
NUXT_PUBLIC_API_BASE=http://localhost:3001
NUXT_PUBLIC_PAYPAL_CLIENT_ID=
```

### Admin (`apps/admin/.env`)
```env
NUXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

---

## 4. 数据库 Schema

### 枚举

| 枚举 | 值 |
|------|-----|
| ProductStatus | `DRAFT` · `ACTIVE` · `INACTIVE` · `SOLD_OUT` |
| AvailabilityType | `IN_STOCK` · `PREORDER` |
| UploadFileStatus | `TEMP` · `USED` · `DELETED` |
| OrderStatus | `PENDING` · `CONFIRMED` · `CANCELLED` |
| PaymentStatus | `UNPAID` · `PAID` · `FAILED` · `REFUNDED` |
| PaymentProvider | `PAYPAL` |
| PaymentIntentStatus | `CREATED` · `APPROVED` · `CAPTURED` · `FAILED` · `ORDER_CREATED` |
| AdminRole | `SUPER_ADMIN` · `ADMIN` · `EDITOR` · `BRAND_MANAGER` |

### 数据模型

#### Brand
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| name | String | unique |
| slug | String | unique |
| logo | String? | |
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

关联：`products → Product[]`

#### Category
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| name | String | unique |
| slug | String | unique |
| sortOrder | Int | default(0) |
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

关联：`products → Product[]`

#### Product
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| name | String | |
| slug | String | unique |
| description | String? | |
| price | Decimal | @db.Decimal(10, 2) |
| stock | Int | default(0) |
| scale | String? | |
| status | ProductStatus | default(DRAFT) |
| saleType | AvailabilityType | default(IN_STOCK) |
| preorderStartAt | DateTime? | |
| preorderEndAt | DateTime? | |
| estimatedShipAt | DateTime? | |
| imageUrl | String? | 自动同步主图 |
| brandId | String | FK → Brand |
| categoryId | String | FK → Category |
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

关联：`brand`, `category`, `images → ProductImage[]`, `variants → ProductVariant[]`, `orderItems → OrderItem[]`
索引：`[brandId]`, `[categoryId]`, `[status]`

#### ProductVariant
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| productId | String | FK → Product (onDelete: Cascade) |
| name | String | |
| versionCode | String? | |
| sku | String | unique |
| priceCents | Int | **价格以分为单位** |
| stock | Int | default(0) |
| availabilityType | AvailabilityType | default(IN_STOCK) |
| status | ProductStatus | default(DRAFT) |
| subtitle | String? | |
| specSummary | String? | 配置摘要 |
| estimatedShipAt | DateTime? | 预售预计发货时间 |
| weightGrams | Int? | |
| isDefault | Boolean | default(false) |
| sortOrder | Int | default(0) |
| coverImageUrl | String? | |
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

索引：`[productId, sortOrder]`, `[productId, status]`

**默认变体规则：**
- 每个商品只有一个 `isDefault=true` 的变体
- 创建第一个变体时自动设为默认
- 删除默认变体时，按 sortOrder 顺序自动指定下一个

#### ProductImage
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| productId | String | FK → Product (onDelete: Cascade) |
| uploadFileId | String? | FK → UploadFile |
| imageUrl | String | |
| altText | String? | |
| sortOrder | Int | default(0) |
| isPrimary | Boolean | default(false) |
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

索引：`[productId, sortOrder]`

**主图同步规则：**
- 添加第一张图片时自动设为主图，同步到 `Product.imageUrl`
- 手动设置主图时同步更新 `Product.imageUrl`
- 删除主图时按 sortOrder 自动选下一张；无图时 `Product.imageUrl → null`

#### UploadFile
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| provider | String | default("tencent-cos") |
| bucket | String | |
| region | String | |
| objectKey | String | unique |
| fileUrl | String | |
| originalFileName | String? | |
| mimeType | String? | |
| sizeBytes | Int? | |
| status | UploadFileStatus | default(TEMP) |
| linkedEntityType | String? | |
| linkedEntityId | String? | |
| expiresAt | DateTime? | |
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

索引：`[status, expiresAt]`

**文件生命周期：**
1. 前端直传 COS → 调用 `register-temp` → 状态 `TEMP`，24h 过期
2. 关联到商品图片 → 状态 `USED`，清除过期时间
3. 定时任务（每小时）清理过期 TEMP 文件 → 从 COS 删除 + 状态 `DELETED`

#### Customer
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| email | String | unique |
| passwordHash | String | Argon2 哈希 |
| name | String? | |
| phone | String? | |
| isActive | Boolean | default(true) |
| isEmailVerified | Boolean | default(false) |
| emailVerificationToken | String? | SHA256 哈希存储 |
| emailVerificationExpiresAt | DateTime? | 24h 过期 |
| passwordResetToken | String? | SHA256 哈希存储 |
| passwordResetExpiresAt | DateTime? | 60min 过期 |
| failedLoginAttempts | Int | default(0) |
| lockedUntil | DateTime? | 5次失败锁15分钟 |
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

关联：`addresses → CustomerAddress[]`, `orders → Order[]`

#### CustomerAddress
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| customerId | String | FK → Customer |
| label | String? | |
| fullName | String | |
| phone | String? | |
| country | String | |
| stateOrProvince | String? | |
| city | String | |
| addressLine1 | String | |
| addressLine2 | String? | |
| postalCode | String? | |
| isDefault | Boolean | default(false) |
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

索引：`[customerId]`

#### Order
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| orderNo | String | unique, 格式 `WJK-YYYYMMDD-XXXXX` |
| status | OrderStatus | default(PENDING) |
| paymentStatus | PaymentStatus | default(UNPAID) |
| customerId | String? | FK → Customer |
| guestAccessTokenHash | String? | SHA256，游客订单访问令牌 |
| fullName | String | |
| email | String | |
| phone | String? | |
| country | String | |
| stateOrProvince | String? | |
| city | String | |
| addressLine1 | String | |
| addressLine2 | String? | |
| postalCode | String? | |
| currency | String | default("USD") |
| subtotalPriceCents | Int | |
| totalPriceCents | Int | |
| paypalOrderId | String? | |
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

关联：`customer`, `items → OrderItem[]`, `paymentIntents → PaymentIntent[]`
索引：`[email]`, `[status]`

#### OrderItem
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| orderId | String | FK → Order (onDelete: Cascade) |
| productId | String | FK → Product |
| variantId | String? | FK → ProductVariant |
| productNameSnapshot | String | 快照 |
| productSlugSnapshot | String | 快照 |
| variantNameSnapshot | String? | 快照 |
| skuSnapshot | String? | 快照 |
| brandNameSnapshot | String? | 快照 |
| categoryNameSnapshot | String? | 快照 |
| coverImageUrlSnapshot | String? | 快照 |
| scaleSnapshot | String? | 快照 |
| unitPriceCents | Int | 下单时价格 |
| quantity | Int | |
| totalPriceCents | Int | unitPriceCents × quantity |

索引：`[orderId]`, `[productId]`

**快照模式：** 下单时冻结商品/变体/品牌/分类信息，不受后续数据变更影响。

#### PaymentIntent
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| provider | PaymentProvider | default(PAYPAL) |
| paypalOrderId | String? | unique |
| customerId | String? | FK → Customer |
| email | String? | |
| currency | String | default("USD") |
| amountCents | Int | |
| cartSnapshotJson | String | 购物车快照 JSON |
| status | PaymentIntentStatus | default(CREATED) |
| capturedAt | DateTime? | |
| orderId | String? | FK → Order |
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

索引：`[paypalOrderId]`, `[status]`

#### AdminUser
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| email | String | unique |
| passwordHash | String | Argon2 |
| name | String | |
| role | AdminRole | default(EDITOR) |
| isActive | Boolean | default(true) |
| lastLoginAt | DateTime? | |
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

关联：`brandAssignments → AdminBrandAssignment[]`

---

## 5. API 端点

全局前缀：`/api`
全局验证：`ValidationPipe({ whitelist: true, transform: true })`
CORS：由 `CORS_ORIGIN` 环境变量控制
认证：Admin 使用 Express Session + RolesGuard；Customer 使用 Express Session + CustomerSessionAuthGuard

### 5.1 Health

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查（测试数据库连接） |

### 5.2 Brands

**Public**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/public/brands` | 品牌列表 |
| GET | `/api/public/brands/:slug` | 品牌详情 + 该品牌的上架商品 |

**Admin** — 需要 `SUPER_ADMIN` / `ADMIN` / `EDITOR` 角色

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/brands` | 品牌列表 |
| GET | `/api/admin/brands/:id` | 品牌详情 |
| POST | `/api/admin/brands` | 创建品牌 |
| PUT | `/api/admin/brands/:id` | 更新品牌 |
| DELETE | `/api/admin/brands/:id` | 删除品牌 |

### 5.3 Categories

**Public**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/public/categories` | 分类列表 |

**Admin**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/categories` | 分类列表 |
| GET | `/api/admin/categories/:id` | 分类详情 |
| POST | `/api/admin/categories` | 创建分类 |
| PUT | `/api/admin/categories/:id` | 更新分类 |
| DELETE | `/api/admin/categories/:id` | 删除分类 |

### 5.4 Products

**Public**

| 方法 | 路径 | 查询参数 | 说明 |
|------|------|---------|------|
| GET | `/api/public/products` | `brand`, `category`, `scale`, `availability` | 上架商品列表（含筛选） |
| GET | `/api/public/products/variants/:variantId/stock` | | 查询变体库存 → `{ available, stock }` |
| GET | `/api/public/products/:slug` | | 商品详情（含图片、上架变体） |

- 仅返回 `status: ACTIVE` 的商品
- 变体仅返回 `status: ACTIVE`
- 图片按 `sortOrder` 排序

**Admin**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/products` | 商品列表（全状态） |
| GET | `/api/admin/products/:id` | 商品详情 |
| POST | `/api/admin/products` | 创建商品 |
| PUT | `/api/admin/products/:id` | 更新商品 |
| DELETE | `/api/admin/products/:id` | 删除商品 |

### 5.5 Product Images (Admin)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/products/:id/images` | 图片列表 |
| POST | `/api/admin/products/:id/images` | 添加图片（批量） |
| PATCH | `/api/admin/products/:id/images/reorder` | 调整排序 |
| PATCH | `/api/admin/products/:id/images/:imageId/primary` | 设为主图 |
| DELETE | `/api/admin/products/:id/images/:imageId` | 删除图片 |

### 5.6 Product Variants (Admin)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/products/:id/variants` | 变体列表 |
| GET | `/api/admin/products/:id/variants/:variantId` | 变体详情 |
| POST | `/api/admin/products/:id/variants` | 创建变体 |
| PATCH | `/api/admin/products/:id/variants/:variantId` | 更新变体 |
| DELETE | `/api/admin/products/:id/variants/:variantId` | 删除变体 |

### 5.7 Orders

**Public**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/public/orders/buy-now` | 立即购买下单（legacy，现通过 PayPal 流程） |
| POST | `/api/public/orders/cart` | 购物车下单（由 PayPal capture 内部调用） |
| GET | `/api/public/orders/:orderNo` | 按订单号查询（支持 `?token=` 游客访问） |

**Admin** — 需要 `SUPER_ADMIN` / `ADMIN` / `EDITOR` 角色

| 方法 | 路径 | 查询参数 | 说明 |
|------|------|---------|------|
| GET | `/api/admin/orders` | `page`, `limit`, `search`, `status`, `paymentStatus` | 订单列表（分页+筛选） |
| GET | `/api/admin/orders/stats` | | 订单统计（按状态分组计数） |
| GET | `/api/admin/orders/:id` | | 订单详情 |
| PATCH | `/api/admin/orders/:id/status` | | 更新订单状态 |
| PATCH | `/api/admin/orders/:id/payment-status` | | 更新付款状态 |

**Admin Orders 分页响应格式：**
```json
{
  "data": [Order],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**UpdateOrderStatusDto**: `status` (`PENDING` / `CONFIRMED` / `CANCELLED`), `note?`
**UpdatePaymentStatusDto**: `paymentStatus` (`UNPAID` / `PAID` / `FAILED` / `REFUNDED`), `note?`

**下单业务逻辑（事务内）：**
1. 校验商品存在且 `status: ACTIVE`
2. 校验变体可购买状态（`IN_STOCK` 或 `PREORDER`）
3. 如果变体是 `IN_STOCK`，检查库存 ≥ 数量
4. 价格从 `variant.priceCents` 服务端计算（不信任前端传值）
5. 生成订单号 `WJK-YYYYMMDD-XXXXX`
6. 事务：原子扣减库存（`updateMany` with `stock: { gte: quantity }`） + 创建 Order + 创建 OrderItem（含快照）

### 5.8 Payments (PayPal)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/public/payments/paypal/create-order` | 创建 PayPal 订单 + 本地 PaymentIntent |
| POST | `/api/public/payments/paypal/capture-order` | 捕获支付 + 创建本地订单（幂等） |

**Create PayPal Order 流程：**
1. 接收 `items[]`（productId, variantId, quantity）
2. 服务端查价 → 计算总额
3. 调用 PayPal API 创建 Order（intent: CAPTURE）
4. 创建本地 PaymentIntent 记录（status: CREATED）
5. 返回 `{ paypalOrderId, totalCents }`

**Capture PayPal Order 流程（幂等）：**
1. 查找本地 PaymentIntent
2. **幂等检查**：如果 `status === ORDER_CREATED && orderId` 存在，直接返回已有订单
3. 调用 PayPal Capture API
4. 验证捕获金额与 PaymentIntent 匹配
5. 更新 PaymentIntent → CAPTURED
6. 调用 `ordersService.createCartOrder()` 创建订单
7. 游客订单生成 guestAccessToken（SHA256 哈希存储）
8. 更新 PaymentIntent → ORDER_CREATED，关联 orderId
9. 返回 `{ orderNo, guestAccessToken? }`

### 5.9 Storefront Auth

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/public/auth/register` | 客户注册 |
| POST | `/api/public/auth/login` | 客户登录（5次失败锁15分钟） |
| POST | `/api/public/auth/logout` | 客户登出 |
| GET | `/api/public/auth/me` | 获取当前客户信息 |
| POST | `/api/public/auth/verify-email` | 邮箱验证 |
| POST | `/api/public/auth/resend-verification` | 重发验证邮件 |
| POST | `/api/public/auth/forgot-password` | 忘记密码 |
| POST | `/api/public/auth/reset-password` | 重置密码 |

### 5.10 Storefront Account（需要 CustomerSessionAuthGuard）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/public/account/profile` | 获取客户资料 |
| PUT | `/api/public/account/profile` | 更新客户资料 |
| GET | `/api/public/account/addresses` | 地址列表 |
| POST | `/api/public/account/addresses` | 创建地址 |
| PUT | `/api/public/account/addresses/:id` | 更新地址 |
| DELETE | `/api/public/account/addresses/:id` | 删除地址 |
| POST | `/api/public/account/addresses/:id/set-default` | 设为默认地址 |
| GET | `/api/public/account/orders` | 客户订单列表 |
| GET | `/api/public/account/orders/:orderNo` | 客户订单详情 |

### 5.11 Admin Auth

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/auth/login` | Admin 登录 |
| POST | `/api/admin/auth/logout` | Admin 登出 |
| GET | `/api/admin/auth/me` | 获取当前 Admin 信息 |

### 5.12 Admin Users

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/admin-users` | 管理员列表 |
| POST | `/api/admin/admin-users` | 创建管理员 |
| PATCH | `/api/admin/admin-users/:id` | 更新管理员 |
| POST | `/api/admin/admin-users/:id/assign-brands` | 分配品牌权限 |

### 5.13 Uploads (Admin)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/uploads/cos-sts` | 获取 COS 临时凭证（30 分钟有效） |
| POST | `/api/admin/uploads/register-temp` | 注册临时上传文件 |

---

## 6. 关键架构决策

| 决策 | 说明 |
|------|------|
| **变体定价** | 价格以分（priceCents）为单位存储在变体上，下单时服务端读取，不信任前端传价 |
| **订单快照** | OrderItem 冻结下单时的商品/变体/品牌/分类信息，不受后续改动影响 |
| **库存扣减** | 仅 `IN_STOCK` 类型在事务内扣减；`PREORDER` 不扣减库存 |
| **原子库存检查** | `updateMany` with `stock: { gte: quantity }` 防止并发超卖 |
| **主图同步** | `Product.imageUrl` 自动与主图保持同步，列表查询无需 JOIN 图片表 |
| **STS 直传** | 前端用临时凭证直传 COS，后端不经手文件流，降低服务端带宽压力 |
| **订单号格式** | `WJK-YYYYMMDD-XXXXX` 人类可读，不暴露内部 ID |
| **默认变体** | 单商品唯一默认变体，自动管理创建/删除时的默认值转移 |
| **PayPal 幂等** | `captureAndCreateOrder` 检查 PaymentIntent 状态，PayPal capture API 本身幂等 |
| **库存双重校验** | 前端 PayPal createOrder 前 fetch stock API；后端事务内 gte 检查 |
| **游客订单访问** | guestAccessToken → SHA256 存储，通过 `?token=` 查询参数验证 |
| **Session 认证** | Admin 和 Customer 分别使用独立的 Session Guard，cookie-based |

---

## 7. 定时任务

| 任务 | 周期 | 说明 |
|------|------|------|
| 临时文件清理 | 每小时 | 查找 `status=TEMP` 且已过期的 UploadFile，从 COS 删除对象，标记 `status=DELETED`，每次最多处理 100 条 |

---

## 8. 基础设施

### PostgreSQL (Docker Compose)
- 镜像：`postgres:16-alpine`
- 端口：5432
- 数据库：`wanjukong`
- 健康检查：`pg_isready -U postgres`
- 数据持久化：Docker Volume `pgdata`

### 生产部署
- Docker Compose（API + Web + Admin + PostgreSQL）
- Nginx 反向代理
- SSL：Certbot (Let's Encrypt)
- 域名：`overrealm.shop`（前台）+ `admin.overrealm.shop`（后台）
- 最低配置：2 核 4GB RAM

### 开发命令
```bash
pnpm dev          # 启动全部（API + Web + Admin）
pnpm dev:api      # 仅 API (:3001)
pnpm dev:web      # 仅前台 (:3000)
pnpm dev:admin    # 仅后台 (:3002)

pnpm db:up        # 启动 PostgreSQL
pnpm db:setup     # 生成 Prisma Client + 迁移 + Seed
pnpm db:reset     # 重置数据库

pnpm build        # 构建全部
pnpm lint         # ESLint
pnpm format       # Prettier
```

---

## 9. 待实现技术项（对应 PRD 规划）

| PRD 优先级 | 技术项 | 涉及范围 |
|-----------|--------|---------|
| P0 | 售罄变体禁止选择 + 售罄标识 | Web 商品详情页 + 商品卡片组件 |
| P0 | 预售 `estimatedShipAt` 展示 | Web 商品详情页变体选择区域 |
| P1 | 商品搜索（全文） | API `search` 查询参数 + Web 搜索组件 + 搜索结果页 |
| P1 | 商品列表分页 | API `page`/`limit` 参数 + Web 分页组件 |
| P1 | 变体 specSummary 展示 | Web 商品详情页变体信息区域 |
| P1 | Admin 商品搜索/筛选/分页 | Admin 商品列表页 |
| P1 | 面包屑导航 | Web 全局组件 |
| P2 | 邮件通知 | API 事件触发：下单确认、付款成功、状态变更 → Mailer 发送 |
| P2 | 相关商品推荐 | API 推荐查询（同品牌/同分类）+ Web 商品详情页推荐区域 |
| P2 | 移动端优化 | Web 全站响应式布局调整 |
| P2 | Admin 数据仪表盘 | API 聚合查询端点 + Admin Dashboard 图表（订单趋势、销售额、热销商品、库存预警） |
| P2 | SEO 优化 | Nuxt `useHead` / `useSeoMeta`，结构化数据 |
| P2 | 运费展示 | Web 结账页运费行或运费政策页 |
| P2 | 信息页面 | 关于、联系、政策等静态页面 |
| P3 | 促销/折扣 | API 优惠码模型 + 结账应用逻辑 |
| P3 | CI/CD | GitHub Actions 构建/测试/部署流水线 |
| P3 | 测试覆盖 | API 单元测试 + E2E 测试 + Web 组件测试 |
