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
  description: '',
  scale: '',
  status: 'DRAFT',
  brandId: '',
  categoryId: '',
  saleType: 'IN_STOCK',
  preorderStartAt: '',
  preorderEndAt: '',
  estimatedShipAt: '',
});

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
    description: (product.description as string) || '',
    scale: (product.scale as string) || '',
    status: product.status as string,
    brandId: product.brandId as string,
    categoryId: product.categoryId as string,
    saleType: (product.saleType as string) || 'IN_STOCK',
    preorderStartAt: product.preorderStartAt ? toLocalDatetime(product.preorderStartAt as string) : '',
    preorderEndAt: product.preorderEndAt ? toLocalDatetime(product.preorderEndAt as string) : '',
    estimatedShipAt: product.estimatedShipAt ? toLocalDatetime(product.estimatedShipAt as string) : '',
  };

  loadingData.value = false;
});

function toLocalDatetime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function save() {
  saving.value = true;
  error.value = null;
  try {
    const payload: Record<string, unknown> = {
      ...form.value,
      description: form.value.description || undefined,
    };

    if (form.value.saleType === 'PREORDER') {
      payload.preorderStartAt = form.value.preorderStartAt ? new Date(form.value.preorderStartAt).toISOString() : null;
      payload.preorderEndAt = form.value.preorderEndAt ? new Date(form.value.preorderEndAt).toISOString() : null;
    } else {
      payload.preorderStartAt = null;
      payload.preorderEndAt = null;
    }
    payload.estimatedShipAt = form.value.estimatedShipAt ? new Date(form.value.estimatedShipAt).toISOString() : null;

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
    <AdminPageHeader title="Edit Product" />

    <div v-if="loadingData" v-loading="true" style="height: 200px" />

    <div v-else class="admin-stack" style="max-width: 860px">
      <ElAlert v-if="error" :title="error" type="error" show-icon closable style="margin-bottom: 4px" />

      <ElCard shadow="never">
        <template #header>
          <span style="font-weight: 600">Product Info</span>
        </template>
        <ProductFormFields
          v-model:form="form"
          :brands="brands"
          :categories="categories"
        />
        <div class="admin-actions" style="margin-top: 20px">
          <ElButton type="primary" :loading="saving" @click="save">Update Product</ElButton>
          <NuxtLink to="/products">
            <ElButton>Cancel</ElButton>
          </NuxtLink>
        </div>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span style="font-weight: 600">Images</span>
        </template>
        <ProductImagesManager :product-id="(route.params.id as string)" />
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <span style="font-weight: 600">Variants</span>
        </template>
        <ProductVariantsManager :product-id="(route.params.id as string)" />
      </ElCard>
    </div>
  </div>
</template>
