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
  description: '',
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
      description: form.value.description || undefined,
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
    }
    payload.estimatedShipAt = form.value.estimatedShipAt ? new Date(form.value.estimatedShipAt).toISOString() : undefined;

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
    <AdminPageHeader title="New Product" />

    <ElAlert v-if="error" :title="error" type="error" show-icon closable style="margin-bottom: 16px" />

    <ElCard shadow="never" style="max-width: 800px">
      <ProductFormFields
        v-model:form="form"
        :brands="brands"
        :categories="categories"
        @blur-name="generateSlug"
      />

      <ElDivider>Default Variant</ElDivider>

      <ElForm label-position="top">
        <ElRow :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="Variant Name" required>
              <ElInput v-model="defaultVariant.name" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="SKU">
              <ElInput v-model="defaultVariant.sku" placeholder="Auto-generated if blank" />
              <div style="font-size: 12px; color: #909399; margin-top: 4px">Leave blank to auto-generate</div>
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="20">
          <ElCol :span="8">
            <ElFormItem label="Manufacturer SKU">
              <ElInput v-model="defaultVariant.manufacturerSku" placeholder="e.g. MMS617" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="Price (cents)" required>
              <ElInputNumber v-model="defaultVariant.priceCents" :min="0" style="width: 100%" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="Stock" required>
              <ElInputNumber v-model="defaultVariant.stock" :min="0" style="width: 100%" />
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>

      <div style="font-size: 13px; color: #909399; margin-bottom: 16px; font-style: italic">
        The first variant is created with the product. Add images and more variants after saving.
      </div>

      <ElSpace>
        <ElButton type="primary" :loading="saving" @click="save">Create Product</ElButton>
        <NuxtLink to="/products">
          <ElButton>Cancel</ElButton>
        </NuxtLink>
      </ElSpace>
    </ElCard>
  </div>
</template>
