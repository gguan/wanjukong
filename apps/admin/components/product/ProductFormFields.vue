<script setup lang="ts">
interface Option { id: string; name: string }

const props = defineProps<{
  form: {
    name: string;
    nameI18n?: Record<string, string>;
    slug: string;
    scale: string;
    status: string;
    brandId: string;
    categoryId: string;
    saleType: string;
    preorderStartAt: string;
    preorderEndAt: string;
    estimatedShipAt: string;
  };
  brands: Option[];
  categories: Option[];
  slugEditable?: boolean;
  // Per-field validation errors keyed by field name. Keys omitted from the
  // map render as "no error" — that's the normal state, so callers don't
  // need to pass empty strings explicitly.
  errors?: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: 'update:form', value: typeof props.form): void;
  (e: 'blur-name'): void;
}>();

const local = computed({
  get: () => props.form,
  set: (v) => emit('update:form', v),
});

const store = useAdminAuthStore();
const isBrandManager = computed(() => store.isBrandManager);
const canEditSlug = computed(() => props.slugEditable ?? !isBrandManager.value);

const api = useAdminApi();
const generatingSlug = ref(false);

async function generateSlug() {
  if (!local.value.name.trim() || generatingSlug.value) return;
  generatingSlug.value = true;
  try {
    const res = await api.post<{ slug: string }>('/api/admin/translate/generate-slug', {
      name: local.value.name,
    });
    if (res.slug) {
      local.value = { ...local.value, slug: res.slug };
      ElMessage.success('已生成 URL 标识');
    } else {
      ElMessage.warning('生成失败，请手动输入');
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '生成失败');
  } finally {
    generatingSlug.value = false;
  }
}

// Auto-fire the AI slug generator the first time the user leaves the name
// field, but only if slug is still empty. Silent — no toast — since the user
// didn't click a button; they only notice the slug has filled in. The
// re-check after await guards against the user typing a slug while the
// translate API call was in flight.
async function handleNameBlur() {
  emit('blur-name');
  if (!canEditSlug.value) return;
  if (local.value.slug?.trim() || !local.value.name?.trim()) return;
  if (generatingSlug.value) return;
  generatingSlug.value = true;
  try {
    const res = await api.post<{ slug: string }>('/api/admin/translate/generate-slug', {
      name: local.value.name,
    });
    if (res.slug && !local.value.slug?.trim()) {
      local.value = { ...local.value, slug: res.slug };
    }
  } catch {
    // Silent — user can still click the "AI 生成" button or type manually.
  } finally {
    generatingSlug.value = false;
  }
}
</script>

<template>
  <ElForm label-position="top">
    <ElFormItem label="商品名称" required :error="errors?.name" data-field="name">
      <ElInput v-model="local.name" placeholder="例如：钢铁侠 Mark XLVII" @blur="handleNameBlur" />
      <AdminI18nInput
        :model-value="local.nameI18n || {}"
        :source-text="local.name"
        label="商品名称"
        @update:model-value="local.nameI18n = $event"
      />
    </ElFormItem>

    <ElFormItem label="URL 标识" required :error="errors?.slug" data-field="slug">
      <div class="slug-row">
        <ElInput v-model="local.slug" placeholder="请输入 URL 标识" :disabled="!canEditSlug" />
        <ElButton
          v-if="canEditSlug"
          :loading="generatingSlug"
          :disabled="!local.name.trim()"
          @click="generateSlug"
        >
          AI 生成
        </ElButton>
      </div>
      <div class="field-hint">
        <template v-if="canEditSlug">用于生成商品链接地址。点击 "AI 生成" 自动翻译商品名称为英文 URL。</template>
        <template v-else>URL 标识由管理员设置</template>
      </div>
    </ElFormItem>

    <ElFormItem label="比例">
      <ElSelect
        v-model="local.scale"
        placeholder="选择比例"
        clearable
        allow-create
        filterable
        style="width: 100%"
      >
        <ElOption label="1/4" value="1/4" />
        <ElOption label="1/6" value="1/6" />
        <ElOption label="1/12" value="1/12" />
        <ElOption label="不适用" value="N/A" />
      </ElSelect>
      <div class="field-hint">常见手办比例。可输入自定义值。</div>
    </ElFormItem>

  </ElForm>
</template>

<style scoped>
.slug-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
  width: 100%;
}
.slug-row .el-input {
  flex: 1;
}
.field-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
</style>
