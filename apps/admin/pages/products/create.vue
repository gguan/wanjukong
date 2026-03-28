<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();
const router = useRouter();

interface Option { id: string; name: string }

const brands = ref<Option[]>([]);
const categories = ref<Option[]>([]);
const saving = ref(false);
const error = ref<string | null>(null);

const form = ref({
  name: '',
  slug: '',
  scale: '1/6',
  status: 'DRAFT',
  brandId: '',
  categoryId: '',
  saleType: 'IN_STOCK',
  preorderStartAt: '',
  preorderEndAt: '',
  estimatedShipAt: '',
});

const defaultVariant = ref({
  name: '标准版',
  sku: '',
  manufacturerSku: '',
  priceCents: 0,
  stock: 0,
});

const isPreorder = computed(() => form.value.saleType === 'PREORDER');

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
        ...defaultVariant.value,
        sku: defaultVariant.value.sku || undefined,
        manufacturerSku: defaultVariant.value.manufacturerSku || undefined,
        priceCents: Number(defaultVariant.value.priceCents),
        stock: Number(defaultVariant.value.stock),
      },
    };

    if (form.value.saleType === 'PREORDER') {
      payload.preorderStartAt = form.value.preorderStartAt ? new Date(form.value.preorderStartAt).toISOString() : undefined;
      payload.preorderEndAt = form.value.preorderEndAt ? new Date(form.value.preorderEndAt).toISOString() : undefined;
      payload.estimatedShipAt = form.value.estimatedShipAt ? new Date(form.value.estimatedShipAt).toISOString() : undefined;
    }

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

        <!-- Default Variant -->
        <AdminProductEditorSection title="默认版本" description="保存商品时会同步创建默认版本，保存后可继续新增其他版本。">
          <ElForm label-position="top">
            <div class="form-grid form-grid--2">
              <ElFormItem label="版本名称" required>
                <ElInput v-model="defaultVariant.name" />
              </ElFormItem>
              <ElFormItem label="货号">
                <ElInput v-model="defaultVariant.sku" placeholder="留空自动生成" />
                <div class="field-hint">留空后系统自动生成</div>
              </ElFormItem>
            </div>
            <div class="form-grid form-grid--3">
              <ElFormItem label="厂商货号">
                <ElInput v-model="defaultVariant.manufacturerSku" placeholder="例如：MMS617" />
              </ElFormItem>
              <ElFormItem label="价格（分）" required>
                <ElInputNumber v-model="defaultVariant.priceCents" :min="0" style="width: 100%" />
              </ElFormItem>
              <ElFormItem label="库存" required>
                <ElInputNumber v-model="defaultVariant.stock" :min="0" style="width: 100%" />
              </ElFormItem>
            </div>
          </ElForm>
        </AdminProductEditorSection>

        <!-- Product Details -->
        <AdminProductEditorSection title="商品详情">
          <ElForm label-position="top">
            <div class="form-grid form-grid--2">
              <ElFormItem label="品牌" required>
                <ElSelect v-model="form.brandId" placeholder="请选择品牌" style="width: 100%">
                  <ElOption
                    v-for="b in brands"
                    :key="b.id"
                    :label="b.name"
                    :value="b.id"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="分类" required>
                <ElSelect v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
                  <ElOption
                    v-for="c in categories"
                    :key="c.id"
                    :label="c.name"
                    :value="c.id"
                  />
                </ElSelect>
              </ElFormItem>
            </div>
            <div class="form-grid form-grid--2">
              <ElFormItem label="比例">
                <ElInput v-model="form.scale" placeholder="例如：1/6" />
              </ElFormItem>
            </div>
          </ElForm>
        </AdminProductEditorSection>
      </div>

      <!-- ═══ Sidebar ═══ -->
      <aside class="product-editor__sidebar">
        <!-- Status -->
        <AdminSidebarCard title="状态">
          <ElForm label-position="top">
            <ElFormItem label="商品状态">
              <ElSelect v-model="form.status" style="width: 100%">
                <ElOption label="草稿" value="DRAFT" />
                <ElOption label="上架" value="ACTIVE" />
                <ElOption label="下架" value="INACTIVE" />
              </ElSelect>
              <div class="field-hint">控制商品在前台的可见性</div>
            </ElFormItem>
          </ElForm>
          <AdminStatusBadge :value="form.status" />
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
              <ElFormItem label="预计发货时间" style="margin-bottom: 0">
                <ElInput v-model="form.estimatedShipAt" type="datetime-local" />
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
