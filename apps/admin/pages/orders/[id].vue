<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const route = useRoute();
const api = useAdminApi();
const store = useAdminAuthStore();
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

interface ShipmentItem {
  id: string;
  orderItemId: string;
  quantity: number;
  orderItem: OrderItem;
}

interface Shipment {
  id: string;
  carrier: string;
  carrierName: string | null;
  trackingNumber: string;
  status: string;
  isInternational: boolean;
  shippedAt: string | null;
  deliveredAt: string | null;
  notes: string | null;
  createdAt: string;
  items: ShipmentItem[];
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
  wechatTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

const order = ref<Order | null>(null);
const shipments = ref<Shipment[]>([]);
const loading = ref(true);
const statusUpdating = ref(false);
const paymentStatusUpdating = ref(false);
const newStatus = ref('');
const newPaymentStatus = ref('');

const isBrandManager = computed(() => store.isBrandManager);

// Shipment dialog
const shipDialogVisible = ref(false);
const shipForm = ref({
  carrier: 'SF_EXPRESS',
  carrierName: '',
  trackingNumber: '',
  isInternational: false,
  notes: '',
});

const carrierOptions = [
  { label: '顺丰速运', value: 'SF_EXPRESS' },
  { label: '圆通速递', value: 'YTO' },
  { label: '中通快递', value: 'ZTO' },
  { label: '申通快递', value: 'STO' },
  { label: '韵达快递', value: 'YUNDA' },
  { label: 'EMS', value: 'EMS' },
  { label: 'DHL', value: 'DHL' },
  { label: 'FedEx', value: 'FEDEX' },
  { label: 'UPS', value: 'UPS' },
  { label: '其他', value: 'OTHER' },
];

const shipmentStatusLabels: Record<string, string> = {
  PENDING: '待发货',
  SHIPPED: '已发货',
  IN_TRANSIT: '运输中',
  DELIVERED: '已签收',
  RETURNED: '已退回',
};

function carrierLabel(carrier: string, name: string | null) {
  if (carrier === 'OTHER' && name) return name;
  return carrierOptions.find((c) => c.value === carrier)?.label ?? carrier;
}

async function load() {
  loading.value = true;
  try {
    const [o, s] = await Promise.all([
      api.get<Order>(`/api/admin/orders/${id}`),
      api.get<Shipment[]>(`/api/admin/orders/${id}/shipments`),
    ]);
    order.value = o;
    shipments.value = s;
    newStatus.value = o.status;
    newPaymentStatus.value = o.paymentStatus;
  } finally {
    loading.value = false;
  }
}

function formatPrice(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

async function updateStatus() {
  if (!order.value || newStatus.value === order.value.status) return;
  statusUpdating.value = true;
  try {
    const updated = await api.patch<Order>(`/api/admin/orders/${id}/status`, { status: newStatus.value });
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
    const updated = await api.patch<Order>(`/api/admin/orders/${id}/payment-status`, { paymentStatus: newPaymentStatus.value });
    order.value = updated;
    ElMessage.success('付款状态已更新');
  } catch (err: any) {
    ElMessage.error(err?.data?.message || '更新失败');
    newPaymentStatus.value = order.value.paymentStatus;
  } finally {
    paymentStatusUpdating.value = false;
  }
}

// ─── Shipment CRUD ──────────────────────────

function openShipDialog() {
  shipForm.value = { carrier: 'SF_EXPRESS', carrierName: '', trackingNumber: '', isInternational: false, notes: '' };
  shipDialogVisible.value = true;
}

async function createShipment() {
  if (!shipForm.value.trackingNumber) {
    ElMessage.error('请填写运单号');
    return;
  }
  try {
    await api.post(`/api/admin/orders/${id}/shipments`, shipForm.value);
    shipDialogVisible.value = false;
    await load();
    ElMessage.success('发货单已创建');
  } catch (err: any) {
    ElMessage.error(err?.message || '创建失败');
  }
}

async function markDelivered(shipmentId: string) {
  try {
    await api.patch(`/api/admin/orders/${id}/shipments/${shipmentId}`, { status: 'DELIVERED' });
    await load();
    ElMessage.success('已标记签收');
  } catch (err: any) {
    ElMessage.error(err?.message || '更新失败');
  }
}

async function deleteShipment(shipmentId: string) {
  try {
    await ElMessageBox.confirm('确定删除这条发货记录？', '确认', { type: 'warning' });
    await api.del(`/api/admin/orders/${id}/shipments/${shipmentId}`);
    await load();
    ElMessage.success('发货记录已删除');
  } catch {
    // cancelled
  }
}

onMounted(load);
</script>

<template>
  <div class="wk-admin-page">
    <div class="editor-header">
      <NuxtLink to="/orders" class="editor-header__back">&larr; 返回订单列表</NuxtLink>
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
                  </div>
                </div>
                <div class="item-pricing">
                  <div class="item-unit-price">{{ formatPrice(item.unitPriceCents) }} &times; {{ item.quantity }}</div>
                  <div class="item-total">{{ formatPrice(item.totalPriceCents) }}</div>
                </div>
              </div>
            </div>

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

          <!-- Shipments -->
          <AdminProductEditorSection title="物流信息" :description="shipments.length ? `${shipments.length} 条发货记录` : '暂未发货'">
            <template #header-actions>
              <ElButton v-if="!isBrandManager" size="small" type="primary" @click="openShipDialog">
                + 创建发货单
              </ElButton>
            </template>

            <div v-if="!shipments.length" class="text-subdued text-sm" style="padding: 8px 0">
              暂无发货记录
            </div>

            <div v-else class="shipment-list">
              <div v-for="s in shipments" :key="s.id" class="shipment-card">
                <div class="shipment-card__header">
                  <div class="shipment-card__carrier">
                    <strong>{{ carrierLabel(s.carrier, s.carrierName) }}</strong>
                    <span class="shipment-card__tracking">{{ s.trackingNumber }}</span>
                  </div>
                  <span class="wk-badge" :class="`wk-badge--${s.status === 'DELIVERED' ? 'confirmed' : s.status === 'SHIPPED' || s.status === 'IN_TRANSIT' ? 'paid' : 'pending'}`">
                    {{ shipmentStatusLabels[s.status] || s.status }}
                  </span>
                </div>

                <div class="shipment-card__meta">
                  <span v-if="s.shippedAt">发货：{{ formatShortDate(s.shippedAt) }}</span>
                  <span v-if="s.deliveredAt">签收：{{ formatShortDate(s.deliveredAt) }}</span>
                  <span v-if="s.isInternational" class="wk-badge wk-badge--info">国际</span>
                </div>

                <div v-if="s.items.length" class="shipment-card__items">
                  <span v-for="si in s.items" :key="si.id" class="shipment-item-tag">
                    {{ si.orderItem.productNameSnapshot }}
                    <template v-if="si.orderItem.variantNameSnapshot"> · {{ si.orderItem.variantNameSnapshot }}</template>
                    × {{ si.quantity }}
                  </span>
                </div>

                <div v-if="s.notes" class="shipment-card__notes">{{ s.notes }}</div>

                <div v-if="!isBrandManager" class="shipment-card__actions">
                  <ElButton
                    v-if="s.status !== 'DELIVERED'"
                    size="small"
                    type="success"
                    @click="markDelivered(s.id)"
                  >
                    标记签收
                  </ElButton>
                  <ElButton size="small" type="danger" text @click="deleteShipment(s.id)">
                    删除
                  </ElButton>
                </div>
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
              <ElSelect v-model="newStatus" style="width: 100%" :disabled="isBrandManager">
                <ElOption label="待处理" value="PENDING" />
                <ElOption label="已确认" value="CONFIRMED" />
                <ElOption label="已发货" value="SHIPPED" />
                <ElOption label="已签收" value="DELIVERED" />
                <ElOption label="已取消" value="CANCELLED" />
              </ElSelect>
            </div>
            <template v-if="!isBrandManager" #footer>
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
              <ElSelect v-model="newPaymentStatus" style="width: 100%" :disabled="isBrandManager">
                <ElOption label="未付款" value="UNPAID" />
                <ElOption label="已付款" value="PAID" />
                <ElOption label="付款失败" value="FAILED" />
                <ElOption label="已退款" value="REFUNDED" />
              </ElSelect>
            </div>
            <template v-if="!isBrandManager" #footer>
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
              <div v-if="order.wechatTransactionId" class="info-row">
                <span class="info-label">微信支付</span>
                <span class="info-value mono">{{ order.wechatTransactionId }}</span>
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

    <!-- Create Shipment Dialog -->
    <ElDialog v-model="shipDialogVisible" title="创建发货单" width="520px" destroy-on-close>
      <ElForm label-position="top" @submit.prevent="createShipment">
        <div class="form-grid form-grid--2">
          <ElFormItem label="快递公司" required>
            <ElSelect v-model="shipForm.carrier" style="width: 100%">
              <ElOption v-for="c in carrierOptions" :key="c.value" :label="c.label" :value="c.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem v-if="shipForm.carrier === 'OTHER'" label="快递公司名称">
            <ElInput v-model="shipForm.carrierName" placeholder="填写快递公司名" />
          </ElFormItem>
        </div>
        <ElFormItem label="运单号" required>
          <ElInput v-model="shipForm.trackingNumber" placeholder="快递运单号" />
        </ElFormItem>
        <ElFormItem label="选项">
          <ElCheckbox v-model="shipForm.isInternational">国际快递</ElCheckbox>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="shipForm.notes" type="textarea" :rows="2" placeholder="可选备注" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="shipDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="createShipment">创建并发货</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
/* Items */
.items-list { display: flex; flex-direction: column; gap: 12px; }

.order-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; background: var(--el-fill-color-lighter); border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.item-image {
  width: 56px; height: 56px; flex-shrink: 0; border-radius: 6px;
  overflow: hidden; background: #fff; border: 1px solid var(--el-border-color);
}
.item-image img { width: 100%; height: 100%; object-fit: cover; }
.item-image-placeholder { width: 100%; height: 100%; background: var(--el-border-color); }

.item-info { flex: 1; min-width: 0; }
.item-name { font-size: 13px; font-weight: 600; color: var(--el-text-color-primary); margin-bottom: 4px; }
.item-meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 12px; color: var(--el-text-color-secondary); }

.item-pricing { text-align: right; flex-shrink: 0; }
.item-unit-price { font-size: 12px; color: var(--el-text-color-secondary); }
.item-total { font-size: 14px; font-weight: 700; color: var(--el-text-color-primary); margin-top: 2px; }

/* Totals */
.order-totals { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--el-border-color); }
.total-line { display: flex; justify-content: space-between; font-size: 13px; color: var(--el-text-color-regular); padding: 4px 0; }
.total-line--grand { font-weight: 700; color: var(--el-text-color-primary); font-size: 14px; border-top: 1px solid var(--el-border-color); padding-top: 8px; margin-top: 4px; }

/* Shipments */
.shipment-list { display: flex; flex-direction: column; gap: 12px; }

.shipment-card {
  border: 1px solid var(--el-border-color); border-radius: 8px;
  padding: 16px; background: var(--el-fill-color-lighter);
}
.shipment-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.shipment-card__carrier { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.shipment-card__tracking {
  font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 12px;
  color: var(--el-text-color-secondary); background: var(--el-bg-color);
  padding: 2px 6px; border-radius: 4px;
}
.shipment-card__meta { display: flex; gap: 12px; font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 8px; }
.shipment-card__items { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.shipment-item-tag {
  font-size: 12px; padding: 2px 8px; border-radius: 4px;
  background: var(--el-bg-color); border: 1px solid var(--el-border-color);
  color: var(--el-text-color-primary);
}
.shipment-card__notes { font-size: 12px; color: var(--el-text-color-secondary); font-style: italic; margin-bottom: 8px; }
.shipment-card__actions { display: flex; gap: 8px; }

/* Address */
.address-block p { margin: 0 0 4px; font-size: 13px; color: var(--el-text-color-primary); line-height: 1.5; }

/* Detail fields */
.detail-label { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 2px; }
.detail-value { font-size: 13px; color: var(--el-text-color-primary); }

/* Sidebar */
.sidebar-field { margin-bottom: 4px; }
.sidebar-info { display: flex; flex-direction: column; gap: 10px; }
.info-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.info-label { font-size: 12px; color: var(--el-text-color-secondary); flex-shrink: 0; }
.info-value { font-size: 13px; color: var(--el-text-color-primary); text-align: right; word-break: break-all; }
.mono { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 12px; }
</style>
