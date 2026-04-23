<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();
const route = useRoute();
const router = useRouter();

interface Option { id: string; name: string; slug?: string }

const brands = ref<Option[]>([]);
const categories = ref<Option[]>([]);
const saving = ref(false);
const loadingData = ref(true);
const error = ref<string | null>(null);

const form = ref({
  name: '',
  nameI18n: {} as Record<string, string>,
  slug: '',
  scale: '',
  status: 'DRAFT',
  brandId: '',
  categoryId: '',
  saleType: 'IN_STOCK',
  preorderStartAt: '',
  preorderEndAt: '',
  estimatedShipAt: '',
  depositYuan: 0,
  usdDepositDollar: 0,
  isFeatured: false,
  featuredSort: 0,
  imageUrl: '',
});

const updatedAt = ref('');
const store = useAdminAuthStore();
const isBrandManager = computed(() => store.isBrandManager);
const isSuperAdmin = computed(() => store.user?.role === 'SUPER_ADMIN');

// Snapshot of imageUrl at load time. We compare on save and only include
// imageUrl in the payload if the user actually changed it — otherwise a
// concurrent edit from the gallery (which calls syncCoverImage server-side)
// would be silently overwritten by the stale value loaded into the form.
const initialImageUrl = ref('');

const brandSlug = computed(() => {
  const b = brands.value.find((x) => x.id === form.value.brandId);
  return b?.slug || '';
});

onMounted(async () => {

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
    nameI18n: (product.nameI18n as Record<string, string>) || {},
    slug: product.slug as string,
    scale: (product.scale as string) || '',
    status: product.status as string,
    brandId: product.brandId as string,
    categoryId: product.categoryId as string,
    saleType: (product.saleType as string) || 'IN_STOCK',
    preorderStartAt: product.preorderStartAt ? toLocalDatetime(product.preorderStartAt as string) : '',
    preorderEndAt: product.preorderEndAt ? toLocalDatetime(product.preorderEndAt as string) : '',
    estimatedShipAt: product.estimatedShipAt ? toLocalDatetime(product.estimatedShipAt as string) : '',
    depositYuan: (product.depositCents as number) ? (product.depositCents as number) / 100 : 0,
    usdDepositDollar: (product.usdDepositCents as number) ? (product.usdDepositCents as number) / 100 : 0,
    isFeatured: (product.isFeatured as boolean) || false,
    featuredSort: (product.featuredSort as number) || 0,
    imageUrl: (product.imageUrl as string) || '',
  };
  initialImageUrl.value = form.value.imageUrl;

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
const statusUpdating = ref(false);

// Mirror of API @IsNotEmpty / @IsUUID / @IsDateString rules so users get
// immediate feedback instead of a round-trip 400.
function getValidationError(): string | null {
  const f = form.value;
  if (!f.name?.trim()) return '请填写商品名称';
  if (!f.slug?.trim()) return '请填写 URL 标识';
  if (!f.brandId) return '请选择品牌';
  if (!f.categoryId) return '请选择分类';
  if (isPreorder.value) {
    if (!f.preorderStartAt) return '预售模式下请填写预售开始时间';
    if (!f.preorderEndAt) return '预售模式下请填写预售结束时间';
  }
  return null;
}


const statusHint = computed(() => {
  const map: Record<string, string> = {
    DRAFT: '草稿，尚未提交',
    PENDING_REVIEW: '等待管理员审核',
    ACTIVE: '前台可见',
    INACTIVE: '已下架',
  };
  return map[form.value.status] || '';
});

async function doStatusAction(action: string) {
  statusUpdating.value = true;
  try {
    const result = await api.post<Record<string, string>>(
      `/api/admin/products/${route.params.id}/${action}`,
      {},
    );
    form.value.status = (result.status as string) || form.value.status;
    ElMessage.success('状态已更新');
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败');
  } finally {
    statusUpdating.value = false;
  }
}

function submitForReview() { doStatusAction('submit-review'); }
function withdrawReview() { doStatusAction('withdraw-review'); }
function approve() { doStatusAction('approve'); }
function reject() { doStatusAction('reject'); }
function deactivate() { doStatusAction('deactivate'); }
function reactivate() { doStatusAction('reactivate'); }

async function save() {
  const validationErr = getValidationError();
  if (validationErr) {
    ElMessage.warning(validationErr);
    return;
  }

  // Brand managers editing a live or in-review product trigger a forced
  // re-review on the server. Surface that consequence before the click.
  if (
    isBrandManager.value &&
    (form.value.status === 'ACTIVE' || form.value.status === 'PENDING_REVIEW')
  ) {
    try {
      await ElMessageBox.confirm(
        '保存后商品将回到草稿状态，需重新提交审核。是否继续？',
        '提示',
        { confirmButtonText: '保存并退回草稿', cancelButtonText: '取消', type: 'warning' },
      );
    } catch {
      return;
    }
  }

  saving.value = true;
  error.value = null;
  try {
    const payload: Record<string, unknown> = { ...form.value };

    if (form.value.saleType === 'PREORDER') {
      payload.preorderStartAt = form.value.preorderStartAt ? new Date(form.value.preorderStartAt).toISOString() : null;
      payload.preorderEndAt = form.value.preorderEndAt ? new Date(form.value.preorderEndAt).toISOString() : null;
      payload.estimatedShipAt = form.value.estimatedShipAt ? new Date(form.value.estimatedShipAt).toISOString() : null;
      payload.depositCents = form.value.depositYuan > 0 ? Math.round(form.value.depositYuan * 100) : null;
      payload.usdDepositCents = form.value.usdDepositDollar > 0 ? Math.round(form.value.usdDepositDollar * 100) : null;
    } else {
      payload.preorderStartAt = null;
      payload.preorderEndAt = null;
      payload.estimatedShipAt = null;
      payload.depositCents = null;
      payload.usdDepositCents = null;
    }
    delete payload.depositYuan;
    delete payload.usdDepositDollar;

    // Only send imageUrl if the user actually changed it. The gallery
    // panel can mutate it server-side via syncCoverImage; re-sending the
    // stale form value would clobber that. Send `null` (not '') when the
    // user cleared the image so the API knows to wipe the column.
    if (form.value.imageUrl !== initialImageUrl.value) {
      payload.imageUrl = form.value.imageUrl ? form.value.imageUrl : null;
    } else {
      delete payload.imageUrl;
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

const deleting = ref(false);
async function deleteProduct() {
  try {
    await ElMessageBox.confirm(
      '确认删除该商品吗？删除后无法恢复。',
      '删除商品',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' },
    );
  } catch { return; }

  deleting.value = true;
  try {
    await api.del(`/api/admin/products/${route.params.id}`);
    ElMessage.success('商品已删除');
    router.push('/products');
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '删除失败');
  } finally {
    deleting.value = false;
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



        <!-- Main Image -->
        <AdminProductEditorSection title="商品主图" description="商品列表和首页展示的主图。">
          <AdminImageUploadField
            v-model="form.imageUrl"
            prefix="products"
            :brand-slug="brandSlug"
            :product-slug="form.slug"
            label="点击或拖拽上传商品主图"
            hint="支持 JPG/PNG/WebP，最大 5MB，自动转为 JPG"
          />
        </AdminProductEditorSection>

        <!-- Media Gallery -->
        <AdminProductEditorSection title="商品图集" description="商品详情页展示的多张图片。">
          <ProductImagesManager
            :product-id="(route.params.id as string)"
            :brand-slug="brandSlug"
            :product-slug="form.slug"
          />
        </AdminProductEditorSection>

        <!-- Versions -->
        <AdminProductEditorSection title="商品版本" description="管理可售版本，如标准版、豪华版和限定版。">
          <ProductVariantsManager
            :product-id="(route.params.id as string)"
            :brand-slug="brandSlug"
            :product-slug="form.slug"
          />
        </AdminProductEditorSection>

        <!-- Product Details section removed: brand/category/scale already in sidebar -->
      </div>

      <!-- ═══ Sidebar ═══ -->
      <aside class="product-editor__sidebar">
        <!-- Status / Publishing -->
        <AdminSidebarCard title="状态">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px">
            <AdminStatusBadge :value="form.status" />
            <span style="font-size: 12px; color: var(--el-text-color-secondary)">
              {{ statusHint }}
            </span>
          </div>

          <!-- Brand Manager Actions -->
          <template v-if="isBrandManager">
            <ElButton
              v-if="form.status === 'DRAFT'"
              type="success"
              size="small"
              style="width: 100%"
              :loading="statusUpdating"
              @click="submitForReview"
            >
              提交审核
            </ElButton>
            <ElButton
              v-else-if="form.status === 'PENDING_REVIEW'"
              size="small"
              style="width: 100%"
              :loading="statusUpdating"
              @click="withdrawReview"
            >
              撤回审核
            </ElButton>
            <ElButton
              v-if="form.status === 'ACTIVE'"
              type="warning"
              size="small"
              style="width: 100%"
              :loading="statusUpdating"
              @click="deactivate"
            >
              主动下架
            </ElButton>
          </template>

          <!-- Admin Actions -->
          <template v-else>
            <div style="display: flex; flex-direction: column; gap: 8px">
              <ElButton
                v-if="form.status === 'PENDING_REVIEW'"
                type="success"
                size="small"
                :loading="statusUpdating"
                @click="approve"
              >
                审核通过
              </ElButton>
              <ElButton
                v-if="form.status === 'PENDING_REVIEW'"
                type="danger"
                size="small"
                :loading="statusUpdating"
                @click="reject"
              >
                驳回
              </ElButton>
              <ElButton
                v-if="form.status === 'DRAFT'"
                type="success"
                size="small"
                :loading="statusUpdating"
                @click="approve"
              >
                直接上架
              </ElButton>
              <ElButton
                v-if="form.status === 'ACTIVE'"
                type="warning"
                size="small"
                :loading="statusUpdating"
                @click="deactivate"
              >
                下架
              </ElButton>
              <ElButton
                v-if="form.status === 'INACTIVE'"
                type="success"
                size="small"
                :loading="statusUpdating"
                @click="reactivate"
              >
                重新上架
              </ElButton>
            </div>
          </template>

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
              <ElFormItem label="预售开始时间" required>
                <ElInput v-model="form.preorderStartAt" type="datetime-local" />
              </ElFormItem>
              <ElFormItem label="预售结束时间" required>
                <ElInput v-model="form.preorderEndAt" type="datetime-local" />
              </ElFormItem>
              <ElFormItem label="预计发货时间">
                <ElInput v-model="form.estimatedShipAt" type="datetime-local" />
              </ElFormItem>
              <ElFormItem label="定金（元）">
                <ElInputNumber v-model="form.depositYuan" :min="0" :precision="0" :step="10" style="width: 100%" />
                <div class="field-hint">为 0 则不收定金，全款预购</div>
              </ElFormItem>
              <ElFormItem label="美元定金（$）">
                <ElInputNumber v-model="form.usdDepositDollar" :min="0" :precision="0" :step="1" style="width: 100%" />
                <div class="field-hint">留 0 则按版本美元价 10% 自动收取</div>
              </ElFormItem>
            </template>
          </ElForm>
        </AdminSidebarCard>

        <!-- Organization -->
        <AdminSidebarCard title="品牌分类">
          <ElForm label-position="top">
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
            <ElFormItem label="分类" required style="margin-bottom: 0">
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

        <!-- Featured (SUPER_ADMIN only) -->
        <AdminSidebarCard v-if="isSuperAdmin" title="首页推荐">
          <ElForm label-position="top">
            <ElFormItem style="margin-bottom: 8px">
              <ElSwitch v-model="form.isFeatured" active-text="推荐到首页" />
            </ElFormItem>
            <ElFormItem v-if="form.isFeatured" label="排序" style="margin-bottom: 0">
              <ElInputNumber v-model="form.featuredSort" :min="0" :max="999" style="width: 100%" />
              <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px">
                数字越小越靠前
              </div>
            </ElFormItem>
          </ElForm>
        </AdminSidebarCard>

        <!-- Preview -->
        <AdminSidebarCard title="商品链接">
          <div style="font-size: 13px; color: var(--el-text-color-secondary); word-break: break-all">
            /products/{{ form.slug || '...' }}
          </div>
        </AdminSidebarCard>

        <!-- Delete (SUPER_ADMIN only) -->
        <AdminSidebarCard v-if="isSuperAdmin" title="危险操作">
          <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 8px">
            删除商品后无法恢复，请谨慎操作。
          </div>
          <template #footer>
            <ElButton type="danger" size="small" :loading="deleting" @click="deleteProduct">
              删除商品
            </ElButton>
          </template>
        </AdminSidebarCard>
      </aside>
    </div>
  </div>
</template>
