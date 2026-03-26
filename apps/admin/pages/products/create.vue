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
  name: 'Standard',
  sku: '',
  manufacturerSku: '',
  priceCents: 0,
  stock: 0,
});

const isPreorder = computed(() => form.value.saleType === 'PREORDER');

onMounted(async () => {
  brands.value = await api.get('/api/admin/brands');
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
    ElMessage.success('Product created');
    router.push(`/products/${product.id}`);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to create product';
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
        <h2 class="editor-header__title">Create Product</h2>
      </div>
      <div class="editor-header__actions">
        <NuxtLink to="/products">
          <ElButton>Cancel</ElButton>
        </NuxtLink>
        <ElButton type="primary" :loading="saving" @click="save">Create Product</ElButton>
      </div>
    </div>

    <ElAlert v-if="error" :title="error" type="error" show-icon closable style="margin-bottom: 16px" @close="error = null" />

    <div class="product-editor">
      <!-- ═══ Main Column ═══ -->
      <div class="product-editor__main">
        <!-- Basic Information -->
        <AdminProductEditorSection title="Basic information" description="Core product content shown on the storefront.">
          <ProductFormFields
            v-model:form="form"
            :brands="brands"
            :categories="categories"
            @blur-name="generateSlug"
          />
        </AdminProductEditorSection>

        <!-- Default Variant -->
        <AdminProductEditorSection title="Default version" description="The Standard version is created with the product. Add more versions after saving.">
          <ElForm label-position="top">
            <div class="form-grid form-grid--2">
              <ElFormItem label="Version Name" required>
                <ElInput v-model="defaultVariant.name" />
              </ElFormItem>
              <ElFormItem label="SKU">
                <ElInput v-model="defaultVariant.sku" placeholder="Auto-generated if blank" />
                <div class="field-hint">Leave blank to auto-generate</div>
              </ElFormItem>
            </div>
            <div class="form-grid form-grid--3">
              <ElFormItem label="Manufacturer SKU">
                <ElInput v-model="defaultVariant.manufacturerSku" placeholder="e.g. MMS617" />
              </ElFormItem>
              <ElFormItem label="Price (cents)" required>
                <ElInputNumber v-model="defaultVariant.priceCents" :min="0" style="width: 100%" />
              </ElFormItem>
              <ElFormItem label="Stock" required>
                <ElInputNumber v-model="defaultVariant.stock" :min="0" style="width: 100%" />
              </ElFormItem>
            </div>
          </ElForm>
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
        <!-- Status -->
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
        </AdminSidebarCard>

        <!-- Sales -->
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
              <ElFormItem label="Estimated Ship Date" style="margin-bottom: 0">
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

        <!-- Storefront Preview -->
        <AdminSidebarCard title="Storefront">
          <div style="font-size: 13px; color: var(--el-text-color-secondary); word-break: break-all">
            /products/{{ form.slug || '...' }}
          </div>
        </AdminSidebarCard>
      </aside>
    </div>
  </div>
</template>
