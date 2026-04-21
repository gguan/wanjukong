<script setup lang="ts">
const props = defineProps<{
  productId: string;
  brandSlug?: string;
  productSlug?: string;
}>();
const api = useAdminApi();
const { rate: usdCnyRate, date: rateDate } = useExchangeRate();

interface Variant {
  id: string;
  name: string;
  nameI18n?: Record<string, string>;
  sku: string;
  manufacturerSku: string | null;
  priceCents: number;
  usdPriceCents: number | null;
  stock: number;
  subtitle: string | null;
  subtitleI18n?: Record<string, string>;
  specifications: string | null;
  specificationsI18n?: Record<string, string>;
  isDefault: boolean;
  sortOrder: number;
  coverImageUrl: string | null;
}

const variants = ref<Variant[]>([]);
const loading = ref(false);
const error = ref('');
const expandedIds = ref<Set<string>>(new Set());

// New variant creation
const showNewForm = ref(false);
const newForm = reactive({
  name: '',
  nameI18n: {} as Record<string, string>,
  sku: '',
  manufacturerSku: '',
  priceYuan: 0,
  usdPriceDollar: 0,
  stock: 0,
  subtitle: '',
  subtitleI18n: {} as Record<string, string>,
  specifications: '',
  specificationsI18n: {} as Record<string, string>,
  sortOrder: 0,
  coverImageUrl: '',
});
// UploadFile id captured when newForm.coverImageUrl is set via upload —
// sent on create so the API can mark the upload USED and the cleanup
// cron doesn't reap the COS object after 24h.
const newCoverUploadFileId = ref<string | null>(null);
const creatingNew = ref(false);

const newSuggestedUsd = computed(() => {
  if (!usdCnyRate.value || !newForm.priceYuan) return 0;
  return Math.round(newForm.priceYuan / usdCnyRate.value);
});

function getNewValidationError(): string | null {
  if (!newForm.name?.trim()) return '请填写版本名称';
  if (!newForm.priceYuan || newForm.priceYuan <= 0) return '请填写版本价格';
  return null;
}


function applyNewSuggestedUsd() {
  if (newSuggestedUsd.value > 0) newForm.usdPriceDollar = newSuggestedUsd.value;
}

function resetNewForm() {
  newForm.name = '';
  newForm.nameI18n = {};
  newForm.sku = '';
  newForm.manufacturerSku = '';
  newForm.priceYuan = 0;
  newForm.usdPriceDollar = 0;
  newForm.stock = 0;
  newForm.subtitle = '';
  newForm.subtitleI18n = {};
  newForm.specifications = '';
  newForm.specificationsI18n = {};
  newForm.sortOrder = variants.value.length;
  newForm.coverImageUrl = '';
  newCoverUploadFileId.value = null;
}

async function loadVariants() {
  loading.value = true;
  try {
    variants.value = await api.get<Variant[]>(
      `/api/admin/products/${props.productId}/variants`,
    );
    // Auto-expand default variant
    const defaultV = variants.value.find((v) => v.isDefault);
    if (defaultV && expandedIds.value.size === 0) {
      expandedIds.value.add(defaultV.id);
    }
  } catch {
    error.value = '加载版本失败';
  } finally {
    loading.value = false;
  }
}

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id);
  } else {
    expandedIds.value.add(id);
  }
}

async function saveVariant(id: string, data: Partial<Variant>) {
  error.value = '';
  try {
    await api.patch(
      `/api/admin/products/${props.productId}/variants/${id}`,
      data,
    );
    ElMessage.success('版本已更新');
    await loadVariants();
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || '保存版本失败';
  }
}

async function createVariant() {
  const validationErr = getNewValidationError();
  if (validationErr) {
    ElMessage.warning(validationErr);
    return;
  }
  error.value = '';
  creatingNew.value = true;
  try {
    const payload = {
      name: newForm.name,
      nameI18n: newForm.nameI18n,
      priceCents: Math.round(newForm.priceYuan * 100),
      usdPriceCents: newForm.usdPriceDollar > 0 ? Math.round(newForm.usdPriceDollar * 100) : undefined,
      stock: Number(newForm.stock),
      sortOrder: Number(newForm.sortOrder),
      sku: newForm.sku || undefined,
      manufacturerSku: newForm.manufacturerSku || undefined,
      subtitle: newForm.subtitle || undefined,
      subtitleI18n: newForm.subtitleI18n,
      specifications: newForm.specifications || undefined,
      specificationsI18n: newForm.specificationsI18n,
      coverImageUrl: newForm.coverImageUrl || undefined,
      ...(newCoverUploadFileId.value
        ? { coverImageUploadFileId: newCoverUploadFileId.value }
        : {}),
    };
    const created = await api.post<Variant>(
      `/api/admin/products/${props.productId}/variants`,
      payload,
    );
    ElMessage.success('版本已创建');
    showNewForm.value = false;
    resetNewForm();
    await loadVariants();
    // Auto-expand new variant
    if (created?.id) {
      expandedIds.value.add(created.id);
    }
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || '创建版本失败';
  } finally {
    creatingNew.value = false;
  }
}

async function deleteVariant(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该版本吗？', '提示', { type: 'warning' });
    await api.del(`/api/admin/products/${props.productId}/variants/${id}`);
    ElMessage.success('版本已删除');
    expandedIds.value.delete(id);
    await loadVariants();
  } catch (e: any) {
    if (e !== 'cancel') {
      error.value = e?.data?.message || '删除版本失败';
    }
  }
}

async function setDefault(id: string) {
  try {
    await api.patch(
      `/api/admin/products/${props.productId}/variants/${id}`,
      { isDefault: true },
    );
    ElMessage.success('默认版本已更新');
    await loadVariants();
  } catch {
    error.value = '设置默认版本失败';
  }
}

function startCreate() {
  resetNewForm();
  showNewForm.value = true;
}

function copyFromLast() {
  // Copy fields from the last existing variant (sorted by sortOrder desc)
  if (variants.value.length === 0) return;
  const last = [...variants.value].sort((a, b) => b.sortOrder - a.sortOrder)[0];
  newForm.name = last.name + ' (副本)';
  newForm.nameI18n = { ...(last.nameI18n || {}) };
  newForm.subtitle = last.subtitle || '';
  newForm.subtitleI18n = { ...(last.subtitleI18n || {}) };
  newForm.specifications = last.specifications || '';
  newForm.specificationsI18n = { ...(last.specificationsI18n || {}) };
  newForm.manufacturerSku = last.manufacturerSku || '';
  newForm.priceYuan = last.priceCents / 100;
  newForm.usdPriceDollar = (last.usdPriceCents ?? 0) / 100;
  newForm.stock = last.stock;
  newForm.coverImageUrl = last.coverImageUrl || '';
  newForm.sortOrder = variants.value.length;
  // Don't copy SKU — user should set a new one or leave blank to auto-generate
  newForm.sku = '';
  ElMessage.success('已复制上一版本信息');
}

onMounted(loadVariants);
</script>

<template>
  <div>
    <ElAlert v-if="error" :title="error" type="error" closable style="margin-bottom: 12px" @close="error = ''" />

    <div v-if="loading" v-loading="true" style="height: 100px" />

    <template v-else>
      <!-- Variant cards -->
      <div v-if="variants.length > 0" style="display: flex; flex-direction: column; gap: 12px">
        <ProductVariantEditorCard
          v-for="v in variants"
          :key="v.id"
          :variant="v"
          :expanded="expandedIds.has(v.id)"
          :brand-slug="brandSlug"
          :product-slug="productSlug"
          @toggle="toggleExpand(v.id)"
          @save="(data) => saveVariant(v.id, data)"
          @delete="deleteVariant(v.id)"
          @set-default="setDefault(v.id)"
        />
      </div>

      <ElEmpty v-else-if="!showNewForm" description="暂无版本" />

      <!-- New variant inline form -->
      <div v-if="showNewForm" class="variant-card" style="margin-top: 12px">
        <div class="variant-card__header" style="cursor: default">
          <div class="variant-card__header-left">
            <span class="variant-card__name">新建版本</span>
          </div>
          <div class="variant-card__actions">
            <ElButton
              v-if="variants.length > 0"
              size="small"
              text
              @click="copyFromLast"
            >
              复制上一版本
            </ElButton>
            <ElButton size="small" text @click="showNewForm = false">取消</ElButton>
          </div>
        </div>
        <div class="variant-card__body">
          <ElForm label-position="top">
            <div class="form-grid form-grid--2">
              <ElFormItem label="版本名称" required>
                <ElInput v-model="newForm.name" placeholder="例如：豪华版、限定版" />
                <AdminI18nInput v-model="newForm.nameI18n" :source-text="newForm.name" label="版本名称" />
              </ElFormItem>
              <ElFormItem label="排序值">
                <ElInputNumber v-model="newForm.sortOrder" :min="0" style="width: 100%" />
              </ElFormItem>
            </div>
            <ElFormItem label="版本描述">
              <ElInput v-model="newForm.subtitle" placeholder="例如：含额外配件..." />
              <AdminI18nInput v-model="newForm.subtitleI18n" :source-text="newForm.subtitle" label="版本描述" />
            </ElFormItem>
            <div class="form-grid form-grid--2">
              <ElFormItem label="货号">
                <ElInput v-model="newForm.sku" placeholder="留空自动生成" />
                <div class="field-hint">留空后系统自动生成</div>
              </ElFormItem>
              <ElFormItem label="厂商货号">
                <ElInput v-model="newForm.manufacturerSku" placeholder="例如：MMS617" />
              </ElFormItem>
            </div>
            <div class="form-grid form-grid--3">
              <ElFormItem label="价格（元）" required>
                <ElInputNumber v-model="newForm.priceYuan" :min="0" :precision="0" :step="1" style="width: 100%" />
                <div class="field-hint">
                  <template v-if="usdCnyRate > 0">
                    今日汇率 1 USD ≈ ¥{{ usdCnyRate.toFixed(4) }}<span v-if="rateDate">（{{ rateDate }}）</span>
                    <template v-if="newSuggestedUsd > 0"> · 约 ${{ newSuggestedUsd }}</template>
                  </template>
                  <template v-else>人民币，含国际运费</template>
                </div>
              </ElFormItem>
              <ElFormItem label="美元价格">
                <ElInputNumber v-model="newForm.usdPriceDollar" :min="0" :precision="0" :step="1" style="width: 100%" />
                <div class="field-hint">
                  <template v-if="usdCnyRate > 0">
                    今日汇率 1 USD = ¥{{ usdCnyRate.toFixed(4) }}<span v-if="rateDate">（{{ rateDate }}）</span>
                  </template>
                  <template v-else>选填，0 表示不设置</template>
                </div>
                <div v-if="newSuggestedUsd > 0" class="field-hint suggested-hint">
                  按当前人民币价换算约 ${{ newSuggestedUsd }}
                  <ElButton
                    v-if="newForm.usdPriceDollar !== newSuggestedUsd"
                    link
                    type="primary"
                    size="small"
                    @click="applyNewSuggestedUsd"
                  >
                    使用此价格
                  </ElButton>
                </div>
              </ElFormItem>
              <ElFormItem label="库存">
                <ElInputNumber v-model="newForm.stock" :min="0" style="width: 100%" />
              </ElFormItem>
            </div>
            <div class="shipping-hint">
              <div class="shipping-hint__title">💡 定价提示</div>
              <ul class="shipping-hint__list">
                <li>售价应包含国际邮费（DHL/FedEx/EMS）</li>
                <li>参考运费：美国/加拿大 ≈ $30、欧洲 ≈ $40、澳新 ≈ $45、东南亚 ≈ $25</li>
                <li>大件（≥3kg）运费按 +$15/kg 估算</li>
              </ul>
            </div>
            <ElFormItem label="封面图">
              <AdminImageUploadField
                v-model="newForm.coverImageUrl"
                prefix="products"
                :brand-slug="brandSlug"
                :product-slug="productSlug"
                label="点击或拖拽上传版本封面图"
                hint="支持 JPG/PNG/WebP，最大 5MB，自动转为 JPG"
                @update:upload-file-id="(id) => (newCoverUploadFileId = id)"
              />
            </ElFormItem>
            <ElFormItem label="说明信息">
              <ProductRichTextEditor v-model="newForm.specifications" />
              <AdminI18nInput v-model="newForm.specificationsI18n" :source-text="newForm.specifications" label="说明信息" type="richtext" />
            </ElFormItem>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px">
              <ElButton @click="showNewForm = false">取消</ElButton>
              <ElButton type="primary" :loading="creatingNew" @click="createVariant">创建版本</ElButton>
            </div>
          </ElForm>
        </div>
      </div>

      <!-- Add version button -->
      <div v-if="!showNewForm" style="margin-top: 12px">
        <ElButton @click="startCreate">+ 添加版本</ElButton>
      </div>
    </template>
  </div>
</template>

