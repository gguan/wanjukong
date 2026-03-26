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
  const [product, brandList, categoryList] = await Promise.all([
    api.get<Record<string, unknown>>(`/api/admin/products/${route.params.id}`),
    api.get<Option[]>('/api/admin/brands'),
    api.get<Option[]>('/api/admin/categories'),
  ]);

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
    ElMessage.success('Product updated');
    router.push('/products');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to update product';
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
          &larr; Products
        </NuxtLink>
        <h2 class="editor-header__title">Edit Product</h2>
      </div>
      <div class="editor-header__actions">
        <NuxtLink to="/products">
          <ElButton>Cancel</ElButton>
        </NuxtLink>
        <ElButton type="primary" :loading="saving" @click="save">Save</ElButton>
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
        <AdminProductEditorSection title="Basic information" description="Core product content shown on the storefront.">
          <ProductFormFields
            v-model:form="form"
            :brands="brands"
            :categories="categories"
          />
        </AdminProductEditorSection>

        <!-- Media -->
        <AdminProductEditorSection title="Media" description="Product images visible to customers.">
          <ProductImagesManager :product-id="(route.params.id as string)" />
        </AdminProductEditorSection>

        <!-- Versions -->
        <AdminProductEditorSection title="Versions" description="Manage sellable versions like Standard, Deluxe, and Exclusive.">
          <ProductVariantsManager :product-id="(route.params.id as string)" />
        </AdminProductEditorSection>

        <!-- Product Details -->
        <AdminProductEditorSection title="Product details">
          <ElForm label-position="top">
            <div class="form-grid form-grid--2">
              <ElFormItem label="Brand" required>
                <ElSelect v-model="form.brandId" placeholder="Select brand" style="width: 100%">
                  <ElOption
                    v-for="b in brands"
                    :key="b.id"
                    :label="b.name"
                    :value="b.id"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="Category" required>
                <ElSelect v-model="form.categoryId" placeholder="Select category" style="width: 100%">
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
              <ElFormItem label="Scale">
                <ElInput v-model="form.scale" placeholder="e.g. 1/6" />
              </ElFormItem>
            </div>
          </ElForm>
        </AdminProductEditorSection>
      </div>

      <!-- ═══ Sidebar ═══ -->
      <aside class="product-editor__sidebar">
        <!-- Status / Publishing -->
        <AdminSidebarCard title="Status">
          <ElForm label-position="top">
            <ElFormItem label="Product Status">
              <ElSelect v-model="form.status" style="width: 100%">
                <ElOption label="Draft" value="DRAFT" />
                <ElOption label="Active" value="ACTIVE" />
                <ElOption label="Inactive" value="INACTIVE" />
              </ElSelect>
              <div class="field-hint">Controls storefront visibility</div>
            </ElFormItem>
          </ElForm>
          <AdminStatusBadge :value="form.status" />
          <template #footer>
            <div v-if="updatedAt" style="font-size: 12px; color: var(--el-text-color-secondary)">
              Last updated {{ updatedAt }}
            </div>
          </template>
        </AdminSidebarCard>

        <!-- Sales / Availability -->
        <AdminSidebarCard title="Sales">
          <ElForm label-position="top">
            <ElFormItem label="Sale Type">
              <ElSelect v-model="form.saleType" style="width: 100%">
                <ElOption label="In Stock" value="IN_STOCK" />
                <ElOption label="Preorder" value="PREORDER" />
              </ElSelect>
              <div class="field-hint">Controls whether customers can purchase</div>
            </ElFormItem>

            <template v-if="isPreorder">
              <ElFormItem label="Preorder Start">
                <ElInput v-model="form.preorderStartAt" type="datetime-local" />
              </ElFormItem>
              <ElFormItem label="Preorder End">
                <ElInput v-model="form.preorderEndAt" type="datetime-local" />
              </ElFormItem>
              <ElFormItem label="Estimated Ship Date">
                <ElInput v-model="form.estimatedShipAt" type="datetime-local" />
              </ElFormItem>
            </template>
          </ElForm>
        </AdminSidebarCard>

        <!-- Organization -->
        <AdminSidebarCard title="Organization">
          <ElForm label-position="top">
            <ElFormItem label="Brand">
              <ElSelect v-model="form.brandId" placeholder="Select brand" style="width: 100%">
                <ElOption
                  v-for="b in brands"
                  :key="b.id"
                  :label="b.name"
                  :value="b.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="Category" style="margin-bottom: 0">
              <ElSelect v-model="form.categoryId" placeholder="Select category" style="width: 100%">
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
        <AdminSidebarCard title="Storefront">
          <div style="font-size: 13px; color: var(--el-text-color-secondary); word-break: break-all">
            /products/{{ form.slug || '...' }}
          </div>
        </AdminSidebarCard>
      </aside>
    </div>
  </div>
</template>
