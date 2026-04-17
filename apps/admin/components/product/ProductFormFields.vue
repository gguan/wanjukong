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
</script>

<template>
  <ElForm label-position="top">
    <ElFormItem label="商品名称" required>
      <ElInput v-model="local.name" placeholder="例如：钢铁侠 Mark XLVII" @blur="emit('blur-name')" />
      <AdminI18nInput
        :model-value="local.nameI18n || {}"
        :source-text="local.name"
        label="商品名称"
        @update:model-value="local.nameI18n = $event"
      />
    </ElFormItem>

    <ElFormItem label="URL 标识" required>
      <div class="slug-row">
        <ElInput v-model="local.slug" placeholder="请输入 URL 标识" :disabled="isBrandManager" />
        <ElButton
          v-if="!isBrandManager"
          :loading="generatingSlug"
          :disabled="!local.name.trim()"
          @click="generateSlug"
        >
          AI 生成
        </ElButton>
      </div>
      <div class="field-hint">
        <template v-if="isBrandManager">URL 标识由管理员设置</template>
        <template v-else>用于生成商品链接地址。点击 "AI 生成" 自动翻译商品名称为英文 URL。</template>
      </div>
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
