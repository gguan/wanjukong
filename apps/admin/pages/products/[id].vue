<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();
const route = useRoute();
const router = useRouter();

interface Option { id: string; name: string }

const brands = ref<Option[]>([]);
const categories = ref<Option[]>([]);
const saving = ref(false);
const loadingData = ref(true);
const error = ref<string | null>(null);

const form = ref({
  name: '',
  slug: '',
  scale: '',
  status: 'DRAFT',
  brandId: '',
  categoryId: '',
  saleType: 'IN_STOCK',
  preorderStartAt: '',
  preorderEndAt: '',
  estimatedShipAt: '',
});

const updatedAt = ref('');

onMounted(async () => {
  const store = useAdminAuthStore();

  const fetches: Promise<unknown>[] = [
    api.get<Record<string, unknown>>(`/api/admin/products/${route.params.id}`),
    store.isBrandManager
      ? Promise.resolve(store.allowedBrands)
      : api.get<Option[]>('/api/admin/brands'),
    api.get<Option[]>('/api/admin/categories'),
  ];

  const [product, brandList, categoryList] = (await Promise.all(fetches)) as [
    Record<string, unknown>,
    Option[],
    Option[],
  ];

  brands.value = brandList;
  categories.value = categoryList;

  form.value = {
    name: product.name as string,
    slug: product.slug as string,
    scale: (product.scale as string) || '',
    status: product.status as string,
    brandId: product.brandId as string,
    categoryId: product.categoryId as string,
    saleType: (product.saleType as string) || 'IN_STOCK',
    preorderStartAt: product.preorderStartAt ? toLocalDatetime(product.preorderStartAt as string) : '',
    preorderEndAt: product.preorderEndAt ? toLocalDatetime(product.preorderEndAt as string) : '',
    estimatedShipAt: product.estimatedShipAt ? toLocalDatetime(product.estimatedShipAt as string) : '',
  };

  if (product.updatedAt) {
    updatedAt.value = new Date(product.updatedAt as string).toLocaleString();
  }

  loadingData.value = false;
});

function toLocalDatetime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const isPreorder = computed(() => form.value.saleType === 'PREORDER');

async function save() {
  saving.value = true;
  error.value = null;
  try {
    const payload: Record<string, unknown> = { ...form.value };

    if (form.value.saleType === 'PREORDER') {
      payload.preorderStartAt = form.value.preorderStartAt ? new Date(form.value.preorderStartAt).toISOString() : null;
      payload.preorderEndAt = form.value.preorderEndAt ? new Date(form.value.preorderEndAt).toISOString() : null;
      payload.estimatedShipAt = form.value.estimatedShipAt ? new Date(form.value.estimatedShipAt).toISOString() : null;
    } else {
      payload.preorderStartAt = null;
      payload.preorderEndAt = null;
      payload.estimatedShipAt = null;
    }

    await api.put(`/api/admin/products/${route.params.id}`, payload);
    ElMessage.success('商品已更新');
    router.push('/products');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '更新商品失败';
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
        <h2 class="editor-header__title">编辑商品</h2>
      </div>
      <div class="editor-header__actions">
        <NuxtLink to="/products">
          <ElButton>取消</ElButton>
        </NuxtLink>
        <ElButton type="primary" :loading="saving" @click="save">保存</ElButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loadingData" v-loading="true" style="height: 200px" />

    <!-- Editor Body -->
    <div v-else class="product-editor">
      <!-- ═══ Main Column ═══ -->
      <div class="product-editor__main">
        <ElAlert v-if="error" :title="error" type="error" show-icon closable @close="error = null" />

        <!-- Basic Information -->
        <AdminProductEditorSection title="基础信息" description="前台展示的核心商品信息。">
          <ProductFormFields
            v-model:form="form"
            :brands="brands"
            :categories="categories"
          />
        </AdminProductEditorSection>

        <!-- Media -->
        <AdminProductEditorSection title="商品图片" description="前台展示给用户的商品图片。">
          <ProductImagesManager :product-id="(route.params.id as string)" />
        </AdminProductEditorSection>

        <!-- Versions -->
        <AdminProductEditorSection title="商品版本" description="管理可售版本，如标准版、豪华版和限定版。">
          <ProductVariantsManager :product-id="(route.params.id as string)" />
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
        <!-- Status / Publishing -->
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
          <template #footer>
            <div v-if="updatedAt" style="font-size: 12px; color: var(--el-text-color-secondary)">
              最后更新：{{ updatedAt }}
            </div>
          </template>
        </AdminSidebarCard>

        <!-- Sales / Availability -->
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

        <!-- Preview -->
        <AdminSidebarCard title="商品链接">
          <div style="font-size: 13px; color: var(--el-text-color-secondary); word-break: break-all">
            /products/{{ form.slug || '...' }}
          </div>
        </AdminSidebarCard>
      </aside>
    </div>
  </div>
</template>
