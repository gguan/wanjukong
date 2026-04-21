<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();
const router = useRouter();

interface Option { id: string; name: string; slug?: string }

const brands = ref<Option[]>([]);
const categories = ref<Option[]>([]);
const saving = ref(false);
const error = ref<string | null>(null);

const form = ref({
  name: '',
  nameI18n: {} as Record<string, string>,
  slug: '',
  scale: '1/6',
  status: 'DRAFT',
  brandId: '',
  categoryId: '',
  saleType: 'IN_STOCK',
  preorderStartAt: '',
  preorderEndAt: '',
  estimatedShipAt: '',
  depositYuan: 0,
  usdDepositDollar: 0,
  usdDepositTouched: false,
  imageUrl: '',
});

// Computed brand slug for upload path
interface OptionWithSlug extends Option { slug?: string }
const brandSlug = computed(() => {
  const b = brands.value.find((x) => x.id === form.value.brandId) as OptionWithSlug | undefined;
  return b?.slug || '';
});

const defaultVariant = ref({
  name: '标准版',
  nameI18n: {} as Record<string, string>,
  subtitle: '',
  subtitleI18n: {} as Record<string, string>,
  specifications: '',
  specificationsI18n: {} as Record<string, string>,
  sku: '',
  manufacturerSku: '',
  priceYuan: 0,
  usdPriceYuan: 0,
  stock: 0,
});

const isBrandManager = computed(() => useAdminAuthStore().isBrandManager);
const isPreorder = computed(() => form.value.saleType === 'PREORDER');

const { rate: usdCnyRate, date: rateDate } = useExchangeRate();

const suggestedUsdPrice = computed(() => {
  if (!usdCnyRate.value || !defaultVariant.value.priceYuan) return 0;
  return Math.round(defaultVariant.value.priceYuan / usdCnyRate.value);
});

function applySuggestedUsdPrice() {
  if (suggestedUsdPrice.value > 0) defaultVariant.value.usdPriceYuan = suggestedUsdPrice.value;
}

// Auto-fill USD deposit at 10% of USD price when user hasn't manually edited
watch(() => defaultVariant.value.usdPriceYuan, (usd) => {
  if (!form.value.usdDepositTouched && isPreorder.value && usd > 0) {
    form.value.usdDepositDollar = Math.round(usd * 0.1);
  }
});

function onUsdDepositChange() {
  form.value.usdDepositTouched = true;
}

onMounted(async () => {
  const store = useAdminAuthStore();
  if (store.isBrandManager) {
    brands.value = store.allowedBrands;
  } else {
    brands.value = await api.get('/api/admin/brands');
  }
  categories.value = await api.get('/api/admin/categories');
});

function generateSlug() {
  if (!form.value.slug) {
    form.value.slug = form.value.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

async function save() {
  saving.value = true;
  error.value = null;
  try {
    const payload: Record<string, unknown> = {
      ...form.value,
      defaultVariant: {
        name: defaultVariant.value.name,
        nameI18n: defaultVariant.value.nameI18n,
        subtitle: defaultVariant.value.subtitle || undefined,
        subtitleI18n: defaultVariant.value.subtitleI18n,
        specifications: defaultVariant.value.specifications || undefined,
        specificationsI18n: defaultVariant.value.specificationsI18n,
        sku: defaultVariant.value.sku || undefined,
        manufacturerSku: defaultVariant.value.manufacturerSku || undefined,
        priceCents: Math.round(defaultVariant.value.priceYuan * 100),
        usdPriceCents: defaultVariant.value.usdPriceYuan > 0 ? Math.round(defaultVariant.value.usdPriceYuan * 100) : undefined,
        stock: Number(defaultVariant.value.stock),
      },
    };

    if (form.value.saleType === 'PREORDER') {
      payload.preorderStartAt = form.value.preorderStartAt ? new Date(form.value.preorderStartAt).toISOString() : undefined;
      payload.preorderEndAt = form.value.preorderEndAt ? new Date(form.value.preorderEndAt).toISOString() : undefined;
      payload.estimatedShipAt = form.value.estimatedShipAt ? new Date(form.value.estimatedShipAt).toISOString() : undefined;
      payload.depositCents = form.value.depositYuan > 0 ? Math.round(form.value.depositYuan * 100) : null;
      payload.usdDepositCents = form.value.usdDepositDollar > 0 ? Math.round(form.value.usdDepositDollar * 100) : null;
    }
    delete payload.depositYuan;
    delete payload.usdDepositDollar;
    delete payload.usdDepositTouched;

    const product = await api.post<{ id: string }>('/api/admin/products', payload);
    ElMessage.success('商品已创建');
    router.push(`/products/${product.id}`);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '创建商品失败';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Editor Header -->
    <div class="editor-header">
      <div class="editor-header__left">
        <NuxtLink to="/products" class="editor-header__back">
          &larr; 商品
        </NuxtLink>
        <h2 class="editor-header__title">新建商品</h2>
      </div>
      <div class="editor-header__actions">
        <NuxtLink to="/products">
          <ElButton>取消</ElButton>
        </NuxtLink>
        <ElButton type="primary" :loading="saving" @click="save">创建商品</ElButton>
      </div>
    </div>

    <ElAlert v-if="error" :title="error" type="error" show-icon closable style="margin-bottom: 16px" @close="error = null" />

    <div class="product-editor">
      <!-- ═══ Main Column ═══ -->
      <div class="product-editor__main">
        <!-- Basic Information -->
        <AdminProductEditorSection title="基础信息" description="前台展示的核心商品信息。">
          <ProductFormFields
            v-model:form="form"
            :brands="brands"
            :categories="categories"
            @blur-name="generateSlug"
          />
        </AdminProductEditorSection>

        <!-- Product Main Image -->
        <AdminProductEditorSection title="商品主图" description="商品列表和首页展示的主图。保存后可在商品编辑页添加更多图片。">
          <AdminImageUploadField
            v-model="form.imageUrl"
            prefix="products"
            :brand-slug="brandSlug"
            :product-slug="form.slug"
            label="点击或拖拽上传商品主图"
            hint="支持 JPG/PNG/WebP，最大 5MB，自动转为 JPG。请先选择品牌和填写 URL 标识。"
          />
        </AdminProductEditorSection>

        <!-- Default Variant -->
        <AdminProductEditorSection title="默认版本" description="保存商品时会同步创建默认版本，保存后可继续新增其他版本。">
          <ElForm label-position="top">
            <ElFormItem label="版本名称" required>
              <ElInput v-model="defaultVariant.name" />
              <AdminI18nInput v-model="defaultVariant.nameI18n" :source-text="defaultVariant.name" label="版本名称" />
            </ElFormItem>

            <ElFormItem label="版本描述">
              <ElInput v-model="defaultVariant.subtitle" placeholder="例如：含额外配件..." />
              <AdminI18nInput v-model="defaultVariant.subtitleI18n" :source-text="defaultVariant.subtitle" label="版本描述" />
            </ElFormItem>

            <div class="form-grid form-grid--2">
              <ElFormItem label="货号">
                <ElInput v-model="defaultVariant.sku" placeholder="留空自动生成" :disabled="isBrandManager" />
                <div class="field-hint">
                  <template v-if="isBrandManager">货号由管理员设置</template>
                  <template v-else>留空后系统自动生成</template>
                </div>
              </ElFormItem>
              <ElFormItem label="厂商货号">
                <ElInput v-model="defaultVariant.manufacturerSku" placeholder="例如：MMS617" :disabled="isBrandManager" />
              </ElFormItem>
            </div>

            <div class="form-grid form-grid--3">
              <ElFormItem label="价格（元）" required>
                <ElInputNumber v-model="defaultVariant.priceYuan" :min="0" :precision="0" :step="1" style="width: 100%" />
                <div class="field-hint">
                  <template v-if="usdCnyRate > 0">
                    今日汇率 1 USD ≈ ¥{{ usdCnyRate.toFixed(4) }}<span v-if="rateDate">（{{ rateDate }}）</span>
                    <template v-if="suggestedUsdPrice > 0"> · 约 ${{ suggestedUsdPrice }}</template>
                  </template>
                  <template v-else>人民币，含国际运费</template>
                </div>
              </ElFormItem>
              <ElFormItem label="美元价格">
                <ElInputNumber v-model="defaultVariant.usdPriceYuan" :min="0" :precision="0" :step="1" style="width: 100%" />
                <div class="field-hint">
                  <template v-if="usdCnyRate > 0">
                    今日汇率 1 USD = ¥{{ usdCnyRate.toFixed(4) }}<span v-if="rateDate">（{{ rateDate }}）</span>
                  </template>
                  <template v-else>选填，0 表示不设置</template>
                </div>
                <div v-if="suggestedUsdPrice > 0" class="field-hint suggested-hint">
                  按当前人民币价换算约 ${{ suggestedUsdPrice }}
                  <ElButton
                    v-if="defaultVariant.usdPriceYuan !== suggestedUsdPrice"
                    link
                    type="primary"
                    size="small"
                    @click="applySuggestedUsdPrice"
                  >
                    使用此价格
                  </ElButton>
                </div>
              </ElFormItem>
              <ElFormItem label="库存" required>
                <ElInputNumber v-model="defaultVariant.stock" :min="0" style="width: 100%" />
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

            <ElFormItem label="说明信息">
              <ProductRichTextEditor v-model="defaultVariant.specifications" />
              <AdminI18nInput v-model="defaultVariant.specificationsI18n" :source-text="defaultVariant.specifications" label="说明信息" type="richtext" />
            </ElFormItem>
          </ElForm>
        </AdminProductEditorSection>

        <!-- Product Details section removed: brand/category/scale already in sidebar -->
      </div>

      <!-- ═══ Sidebar ═══ -->
      <aside class="product-editor__sidebar">
        <!-- Status -->
        <AdminSidebarCard title="状态">
          <div style="display: flex; align-items: center; gap: 8px">
            <AdminStatusBadge value="DRAFT" />
            <span style="font-size: 12px; color: var(--el-text-color-secondary)">
              新商品默认为草稿，保存后可提交审核
            </span>
          </div>
        </AdminSidebarCard>

        <!-- Sales -->
        <AdminSidebarCard title="销售设置">
          <ElForm label-position="top">
            <ElFormItem label="销售类型">
              <ElSelect v-model="form.saleType" style="width: 100%">
                <ElOption label="现货" value="IN_STOCK" />
                <ElOption label="预售" value="PREORDER" />
              </ElSelect>
              <div class="field-hint">控制用户当前是否可购买</div>
            </ElFormItem>

            <template v-if="isPreorder">
              <ElFormItem label="预售开始时间">
                <ElInput v-model="form.preorderStartAt" type="datetime-local" />
              </ElFormItem>
              <ElFormItem label="预售结束时间">
                <ElInput v-model="form.preorderEndAt" type="datetime-local" />
              </ElFormItem>
              <ElFormItem label="预计发货时间">
                <ElInput v-model="form.estimatedShipAt" type="datetime-local" />
              </ElFormItem>
              <ElFormItem label="定金（元）">
                <ElInputNumber v-model="form.depositYuan" :min="0" :precision="0" :step="10" style="width: 100%" />
                <div class="field-hint">为 0 则不收定金，全款预购</div>
              </ElFormItem>
              <ElFormItem label="美元定金（$）" style="margin-bottom: 0">
                <ElInputNumber
                  v-model="form.usdDepositDollar"
                  :min="0"
                  :precision="0"
                  :step="1"
                  style="width: 100%"
                  @change="onUsdDepositChange"
                />
                <div class="field-hint">默认按版本美元价 10% 自动填充，可手动修改</div>
              </ElFormItem>
            </template>
          </ElForm>
        </AdminSidebarCard>

        <!-- Organization -->
        <AdminSidebarCard title="品牌分类">
          <ElForm label-position="top">
            <ElFormItem label="品牌">
              <ElSelect v-model="form.brandId" placeholder="请选择品牌" style="width: 100%">
                <ElOption
                  v-for="b in brands"
                  :key="b.id"
                  :label="b.name"
                  :value="b.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="分类" style="margin-bottom: 0">
              <ElSelect v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
                <ElOption
                  v-for="c in categories"
                  :key="c.id"
                  :label="c.name"
                  :value="c.id"
                />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </AdminSidebarCard>

        <!-- Storefront Preview -->
        <AdminSidebarCard title="商品链接">
          <div style="font-size: 13px; color: var(--el-text-color-secondary); word-break: break-all">
            /products/{{ form.slug || '...' }}
          </div>
        </AdminSidebarCard>
      </aside>
    </div>
  </div>
</template>
