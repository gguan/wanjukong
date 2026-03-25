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
│   │       │   ├── products/      # 含 images、variants 子模块
│   │       │   ├── orders/
│   │       │   └── uploads/
│   │       ├── prisma/            # PrismaService
│   │       ├── app.module.ts
│   │       └── main.ts
│   ├── web/          # 买家前台 Nuxt (Port 3000)
│   └── admin/        # 管理后台 Nuxt (Port 3002)
├── packages/
│   └── shared/       # 共享常量 (APP_NAME, API_PREFIX)
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

TENCENT_COS_SECRET_ID=
TENCENT_COS_SECRET_KEY=
TENCENT_COS_BUCKET=bucket-name-1250000000
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_PUBLIC_BASE_URL=https://bucket-name.cos.ap-guangzhou.myqcloud.com

UPLOAD_TEMP_EXPIRE_HOURS=24
```

### Web (`apps/web/.env`)
```env
NUXT_PUBLIC_API_BASE=http://localhost:3001
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
| availability | AvailabilityType | default(IN_STOCK) |
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

#### Order
| 字段 | 类型 | 约束 |
|------|------|------|
| id | String | PK, cuid() |
| orderNo | String | unique, 格式 `WJK-YYYYMMDD-XXXXX` |
| status | OrderStatus | default(PENDING) |
| paymentStatus | PaymentStatus | default(UNPAID) |
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
| createdAt | DateTime | default(now()) |
| updatedAt | DateTime | @updatedAt |

关联：`items → OrderItem[]`
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

---

## 5. API 端点

全局前缀：`/api`
全局验证：`ValidationPipe({ whitelist: true, transform: true })`
CORS：由 `CORS_ORIGIN` 环境变量控制

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

**Admin**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/brands` | 品牌列表 |
| GET | `/api/admin/brands/:id` | 品牌详情 |
| POST | `/api/admin/brands` | 创建品牌 |
| PUT | `/api/admin/brands/:id` | 更新品牌 |
| DELETE | `/api/admin/brands/:id` | 删除品牌 |

**CreateBrandDto**: `name` (required), `slug` (required), `logo?`

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

**CreateCategoryDto**: `name` (required), `slug` (required), `sortOrder?` (Int)

### 5.4 Products

**Public**

| 方法 | 路径 | 查询参数 | 说明 |
|------|------|---------|------|
| GET | `/api/public/products` | `brand`, `category`, `scale`, `availability` | 上架商品列表（含筛选） |
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

**CreateProductDto**:

| 字段 | 类型 | 必填 | 验证 |
|------|------|------|------|
| name | string | 是 | |
| slug | string | 是 | |
| description | string | 否 | |
| price | number | 是 | @Min(0) |
| stock | int | 否 | @Min(0) |
| scale | string | 否 | |
| status | ProductStatus | 否 | @IsEnum |
| availability | AvailabilityType | 否 | @IsEnum |
| imageUrl | string | 否 | |
| brandId | string | 是 | |
| categoryId | string | 是 | |

### 5.5 Product Images (Admin)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/products/:id/images` | 图片列表 |
| POST | `/api/admin/products/:id/images` | 添加图片（批量） |
| PATCH | `/api/admin/products/:id/images/reorder` | 调整排序 |
| PATCH | `/api/admin/products/:id/images/:imageId/primary` | 设为主图 |
| DELETE | `/api/admin/products/:id/images/:imageId` | 删除图片 |

**AddProductImagesDto**: `images[]` → `{ imageUrl, uploadFileId?, altText? }`
**ReorderProductImagesDto**: `items[]` → `{ id, sortOrder }`

### 5.6 Product Variants (Admin)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/products/:id/variants` | 变体列表 |
| GET | `/api/admin/products/:id/variants/:variantId` | 变体详情 |
| POST | `/api/admin/products/:id/variants` | 创建变体 |
| PATCH | `/api/admin/products/:id/variants/:variantId` | 更新变体 |
| DELETE | `/api/admin/products/:id/variants/:variantId` | 删除变体 |

**CreateProductVariantDto**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | |
| sku | string | 是 | 全局唯一 |
| priceCents | int | 是 | 价格（分），@Min(0) |
| versionCode | string | 否 | |
| stock | int | 否 | @Min(0) |
| availabilityType | AvailabilityType | 否 | |
| status | ProductStatus | 否 | |
| subtitle | string | 否 | |
| specSummary | string | 否 | |
| estimatedShipAt | ISO string | 否 | |
| weightGrams | int | 否 | @Min(0) |
| isDefault | boolean | 否 | |
| sortOrder | int | 否 | @Min(0) |
| coverImageUrl | string | 否 | |

### 5.7 Orders

**Public**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/public/orders/buy-now` | 立即购买下单 |
| GET | `/api/public/orders/:orderNo` | 按订单号查询 |

**CreateBuyNowOrderDto**:

| 字段 | 类型 | 必填 | 验证 |
|------|------|------|------|
| productId | string | 是 | |
| variantId | string | 是 | |
| quantity | int | 是 | @Min(1) |
| fullName | string | 是 | |
| email | string | 是 | @IsEmail |
| phone | string | 否 | |
| country | string | 是 | |
| stateOrProvince | string | 否 | |
| city | string | 是 | |
| addressLine1 | string | 是 | |
| addressLine2 | string | 否 | |
| postalCode | string | 否 | |
| currency | string | 否 | default: USD |

**下单业务逻辑（事务内）：**
1. 校验商品存在且 `status: ACTIVE`
2. 校验变体存在且 `status: ACTIVE`
3. 如果变体是 `IN_STOCK`，检查库存 ≥ 数量
4. 价格从 `variant.priceCents` 服务端计算（不信任前端传值）
5. 生成订单号 `WJK-YYYYMMDD-XXXXX`
6. 事务：扣减库存（仅 IN_STOCK）+ 创建 Order + 创建 OrderItem（含快照）

**Admin**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/orders` | 订单列表（按时间倒序） |
| GET | `/api/admin/orders/:id` | 订单详情（按内部 ID） |

### 5.8 Uploads (Admin)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/uploads/cos-sts` | 获取 COS 临时凭证（30 分钟有效） |
| POST | `/api/admin/uploads/register-temp` | 注册临时上传文件 |

**STS 凭证范围：** 限定 `{bucket}/products/*` 路径，允许 PutObject / PostObject / 分片上传相关操作

**RegisterTempUploadDto**: `objectKey` (required), `fileUrl` (required), `originalFileName?`, `mimeType?`, `sizeBytes?`

---

## 6. 关键架构决策

| 决策 | 说明 |
|------|------|
| **变体定价** | 价格以分（priceCents）为单位存储在变体上，下单时服务端读取，不信任前端传价 |
| **订单快照** | OrderItem 冻结下单时的商品/变体/品牌/分类信息，不受后续改动影响 |
| **库存扣减** | 仅 `IN_STOCK` 类型在事务内扣减；`PREORDER` 不扣减库存 |
| **主图同步** | `Product.imageUrl` 自动与主图保持同步，列表查询无需 JOIN 图片表 |
| **STS 直传** | 前端用临时凭证直传 COS，后端不经手文件流，降低服务端带宽压力 |
| **订单号格式** | `WJK-YYYYMMDD-XXXXX` 人类可读，不暴露内部 ID |
| **默认变体** | 单商品唯一默认变体，自动管理创建/删除时的默认值转移 |

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
| P0 | Admin API 鉴权（JWT / Session） | API Guard + Admin 登录流程 |
| P0 | 订单状态更新端点 | API 新增 PATCH `/api/admin/orders/:id/status` |
| P0 | 结账前库存二次校验 | 前端 + API 端点 |
| P0 | 下单幂等/防重复提交 | API 幂等键 + 前端按钮防抖 |
| P1 | 商品搜索 | API 新增 `search` 查询参数 + 前端搜索组件 |
| P1 | 商品列表排序 | API 新增 `sort` 查询参数 |
| P1 | 分页 | API 新增 `page`/`limit` 参数 + 前端分页组件 |
| P1 | 商品描述 Markdown 渲染 | 前端集成 markdown 渲染库 |
| P2 | SEO meta | Nuxt `useHead` / `useSeoMeta` |
| P2 | 邮件通知 | API 集成邮件服务（如 Resend / Nodemailer） |
| P2 | 数据仪表盘 | API 聚合查询端点 + Admin 图表页面 |
