<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const route = useRoute();
const api = useAdminApi();
const id = route.params.id as string;

interface OrderItem {
  id: string;
  productNameSnapshot: string;
  productSlugSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  brandNameSnapshot: string | null;
  categoryNameSnapshot: string | null;
  coverImageUrlSnapshot: string | null;
  scaleSnapshot: string | null;
  unitPriceCents: number;
  quantity: number;
  totalPriceCents: number;
}

interface Order {
  id: string;
  orderNo: string;
  status: string;
  paymentStatus: string;
  fullName: string;
  email: string;
  phone: string | null;
  country: string;
  stateOrProvince: string | null;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  currency: string;
  subtotalPriceCents: number;
  totalPriceCents: number;
  paypalOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

const order = ref<Order | null>(null);
const loading = ref(true);
const statusUpdating = ref(false);
const paymentStatusUpdating = ref(false);
const newStatus = ref('');
const newPaymentStatus = ref('');

async function load() {
  loading.value = true;
  try {
    order.value = await api.get<Order>(`/api/admin/orders/${id}`);
    newStatus.value = order.value.status;
    newPaymentStatus.value = order.value.paymentStatus;
  } finally {
    loading.value = false;
  }
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function updateStatus() {
  if (!order.value || newStatus.value === order.value.status) return;
  statusUpdating.value = true;
  try {
    const updated = await api.patch<Order>(`/api/admin/orders/${id}/status`, {
      status: newStatus.value,
    });
    order.value = updated;
    ElMessage.success('订单状态已更新');
  } catch (err: any) {
    ElMessage.error(err?.data?.message || '更新失败');
    newStatus.value = order.value.status;
  } finally {
    statusUpdating.value = false;
  }
}

async function updatePaymentStatus() {
  if (!order.value || newPaymentStatus.value === order.value.paymentStatus) return;
  paymentStatusUpdating.value = true;
  try {
    const updated = await api.patch<Order>(`/api/admin/orders/${id}/payment-status`, {
      paymentStatus: newPaymentStatus.value,
    });
    order.value = updated;
    ElMessage.success('付款状态已更新');
  } catch (err: any) {
    ElMessage.error(err?.data?.message || '更新失败');
    newPaymentStatus.value = order.value.paymentStatus;
  } finally {
    paymentStatusUpdating.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="wk-admin-page">
    <div class="editor-header">
      <NuxtLink to="/orders" class="back-link">&larr; 返回订单列表</NuxtLink>
    </div>

    <div v-if="loading" v-loading="true" style="min-height: 200px" />

    <template v-else-if="order">
      <AdminPageHeader :title="`订单 ${order.orderNo}`">
        <template #actions>
          <AdminStatusTag :value="order.status" />
          <AdminStatusTag :value="order.paymentStatus" />
        </template>
      </AdminPageHeader>

      <div class="product-editor">
        <!-- Main content -->
        <div class="product-editor__main">
          <!-- Order Items -->
          <AdminProductEditorSection title="商品明细" description="订单中包含的商品">
            <div class="items-list">
              <div v-for="item in order.items" :key="item.id" class="order-item">
                <div class="item-image">
                  <img v-if="item.coverImageUrlSnapshot" :src="item.coverImageUrlSnapshot" :alt="item.productNameSnapshot" />
                  <div v-else class="item-image-placeholder" />
                </div>
                <div class="item-info">
                  <div class="item-name">{{ item.productNameSnapshot }}</div>
                  <div class="item-meta">
                    <span v-if="item.brandNameSnapshot">{{ item.brandNameSnapshot }}</span>
                    <span v-if="item.variantNameSnapshot">{{ item.variantNameSnapshot }}</span>
                    <span v-if="item.skuSnapshot">SKU: {{ item.skuSnapshot }}</span>
                    <span v-if="item.categoryNameSnapshot">{{ item.categoryNameSnapshot }}</span>
                    <span v-if="item.scaleSnapshot">{{ item.scaleSnapshot }}</span>
                  </div>
                </div>
                <div class="item-pricing">
                  <div class="item-unit-price">{{ formatPrice(item.unitPriceCents) }} &times; {{ item.quantity }}</div>
                  <div class="item-total">{{ formatPrice(item.totalPriceCents) }}</div>
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="order-totals">
              <div class="total-line">
                <span>小计</span>
                <span>{{ formatPrice(order.subtotalPriceCents) }}</span>
              </div>
              <div class="total-line total-line--grand">
                <span>合计</span>
                <span>{{ formatPrice(order.totalPriceCents) }}</span>
              </div>
            </div>
          </AdminProductEditorSection>

          <!-- Shipping Address -->
          <AdminProductEditorSection title="配送地址" description="客户的收货地址">
            <div class="address-block">
              <p><strong>{{ order.fullName }}</strong></p>
              <p>{{ order.addressLine1 }}</p>
              <p v-if="order.addressLine2">{{ order.addressLine2 }}</p>
              <p>
                {{ order.city }}
                <span v-if="order.stateOrProvince">, {{ order.stateOrProvince }}</span>
                <span v-if="order.postalCode"> {{ order.postalCode }}</span>
              </p>
              <p>{{ order.country }}</p>
            </div>
          </AdminProductEditorSection>

          <!-- Contact -->
          <AdminProductEditorSection title="联系方式" description="客户的联系信息">
            <div class="form-grid form-grid--2">
              <div>
                <div class="detail-label">邮箱</div>
                <div class="detail-value">{{ order.email }}</div>
              </div>
              <div>
                <div class="detail-label">电话</div>
                <div class="detail-value">{{ order.phone || '-' }}</div>
              </div>
            </div>
          </AdminProductEditorSection>
        </div>

        <!-- Sidebar -->
        <aside class="product-editor__sidebar">
          <!-- Order Status -->
          <AdminSidebarCard title="订单状态">
            <div class="sidebar-field">
              <ElSelect v-model="newStatus" style="width: 100%">
                <ElOption label="待处理" value="PENDING" />
                <ElOption label="已确认" value="CONFIRMED" />
                <ElOption label="已取消" value="CANCELLED" />
              </ElSelect>
            </div>
            <template #footer>
              <ElButton
                type="primary"
                size="small"
                :loading="statusUpdating"
                :disabled="newStatus === order.status"
                @click="updateStatus"
              >
                更新状态
              </ElButton>
            </template>
          </AdminSidebarCard>

          <!-- Payment Status -->
          <AdminSidebarCard title="付款状态">
            <div class="sidebar-field">
              <ElSelect v-model="newPaymentStatus" style="width: 100%">
                <ElOption label="未付款" value="UNPAID" />
                <ElOption label="已付款" value="PAID" />
                <ElOption label="付款失败" value="FAILED" />
                <ElOption label="已退款" value="REFUNDED" />
              </ElSelect>
            </div>
            <template #footer>
              <ElButton
                type="primary"
                size="small"
                :loading="paymentStatusUpdating"
                :disabled="newPaymentStatus === order.paymentStatus"
                @click="updatePaymentStatus"
              >
                更新状态
              </ElButton>
            </template>
          </AdminSidebarCard>

          <!-- Order Info -->
          <AdminSidebarCard title="订单信息">
            <div class="sidebar-info">
              <div class="info-row">
                <span class="info-label">订单号</span>
                <span class="info-value mono">{{ order.orderNo }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">创建时间</span>
                <span class="info-value">{{ formatDate(order.createdAt) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">更新时间</span>
                <span class="info-value">{{ formatDate(order.updatedAt) }}</span>
              </div>
              <div v-if="order.paypalOrderId" class="info-row">
                <span class="info-label">PayPal ID</span>
                <span class="info-value mono">{{ order.paypalOrderId }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">币种</span>
                <span class="info-value">{{ order.currency }}</span>
              </div>
            </div>
          </AdminSidebarCard>
        </aside>
      </div>
    </template>

    <div v-else class="error-state">
      <ElEmpty description="订单不存在" />
    </div>
  </div>
</template>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 16px;
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link:hover {
  color: #111;
}

/* Items */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.item-image {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-image-placeholder {
  width: 100%;
  height: 100%;
  background: #e5e7eb;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111;
  margin-bottom: 4px;
}

.item-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.75rem;
  color: #888;
}

.item-pricing {
  text-align: right;
  flex-shrink: 0;
}

.item-unit-price {
  font-size: 0.8rem;
  color: #888;
}

.item-total {
  font-size: 0.95rem;
  font-weight: 700;
  color: #111;
  margin-top: 2px;
}

/* Totals */
.order-totals {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.total-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #555;
  padding: 4px 0;
}

.total-line--grand {
  font-weight: 700;
  color: #111;
  font-size: 1rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
  margin-top: 4px;
}

/* Address */
.address-block p {
  margin: 0 0 4px;
  font-size: 0.9rem;
  color: #333;
  line-height: 1.5;
}

/* Detail fields */
.detail-label {
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 2px;
}

.detail-value {
  font-size: 0.9rem;
  color: #111;
}

/* Sidebar */
.sidebar-field {
  margin-bottom: 4px;
}

.sidebar-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-size: 0.8rem;
  color: #888;
  flex-shrink: 0;
}

.info-value {
  font-size: 0.85rem;
  color: #111;
  text-align: right;
  word-break: break-all;
}

.mono {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.8rem;
}
</style>
