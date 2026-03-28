<script setup lang="ts">
interface Variant {
  id: string;
  name: string;
  sku: string;
  manufacturerSku: string | null;
  priceCents: number;
  stock: number;
  subtitle: string | null;
  specifications: string | null;
  isDefault: boolean;
  sortOrder: number;
  coverImageUrl: string | null;
}

const props = defineProps<{
  variant: Variant;
  expanded: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle'): void;
  (e: 'save', data: Partial<Variant>): void;
  (e: 'delete'): void;
  (e: 'set-default'): void;
}>();

const editing = reactive({
  name: '',
  sku: '',
  manufacturerSku: '',
  priceCents: 0,
  stock: 0,
  subtitle: '',
  specifications: '',
  sortOrder: 0,
  coverImageUrl: '',
});

const dirty = ref(false);
const saving = ref(false);

watch(
  () => props.variant,
  (v) => {
    editing.name = v.name;
    editing.sku = v.sku;
    editing.manufacturerSku = v.manufacturerSku || '';
    editing.priceCents = v.priceCents;
    editing.stock = v.stock;
    editing.subtitle = v.subtitle || '';
    editing.specifications = v.specifications || '';
    editing.sortOrder = v.sortOrder;
    editing.coverImageUrl = v.coverImageUrl || '';
    dirty.value = false;
  },
  { immediate: true },
);

watch(editing, () => {
  dirty.value = true;
}, { deep: true });

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const summaryLine = computed(() => {
  const parts: string[] = [];
  parts.push(formatPrice(props.variant.priceCents));
  parts.push(`库存：${props.variant.stock}`);
  if (props.variant.sku) parts.push(`货号 ${props.variant.sku}`);
  return parts.join(' \u00b7 ');
});

async function handleSave() {
  saving.value = true;
  emit('save', {
    name: editing.name,
    sku: editing.sku || undefined,
    manufacturerSku: editing.manufacturerSku || undefined,
    priceCents: Number(editing.priceCents),
    stock: Number(editing.stock),
    subtitle: editing.subtitle || undefined,
    specifications: editing.specifications || undefined,
    sortOrder: Number(editing.sortOrder),
    coverImageUrl: editing.coverImageUrl || undefined,
  } as any);
  await nextTick();
  saving.value = false;
}
</script>

<template>
  <div class="variant-card" :class="{ 'variant-card--default': variant.isDefault }">
    <div class="variant-card__header" @click="emit('toggle')">
      <div class="variant-card__header-left">
        <svg class="variant-card__chevron" :class="{ 'variant-card__chevron--open': expanded }" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M6 4l4 4-4 4" />
        </svg>
        <span class="variant-card__name">{{ variant.name }}</span>
        <span v-if="!expanded" class="variant-card__summary">{{ summaryLine }}</span>
      </div>
      <div class="variant-card__badges">
        <ElTag v-if="variant.isDefault" type="primary" size="small" disable-transitions>默认版本</ElTag>
        <AdminStatusBadge v-if="variant.stock === 0" value="SOLD_OUT" size="small" />
      </div>
      <div class="variant-card__actions" @click.stop>
        <ElButton v-if="!variant.isDefault" size="small" text @click="emit('set-default')">
          设为默认
        </ElButton>
        <ElButton v-if="!variant.isDefault" size="small" text type="danger" @click="emit('delete')">
          删除
        </ElButton>
      </div>
    </div>

    <div v-if="expanded" class="variant-card__body">
      <ElForm label-position="top">
        <div class="form-grid form-grid--2">
          <ElFormItem label="版本名称" required>
            <ElInput v-model="editing.name" />
          </ElFormItem>
          <ElFormItem label="排序值">
            <ElInputNumber v-model="editing.sortOrder" :min="0" style="width: 100%" />
          </ElFormItem>
        </div>

        <div class="form-grid form-grid--2">
          <ElFormItem label="货号">
            <ElInput v-model="editing.sku" placeholder="留空自动生成" />
            <div class="field-hint">留空后系统自动生成</div>
          </ElFormItem>
          <ElFormItem label="厂商货号">
            <ElInput v-model="editing.manufacturerSku" placeholder="例如：MMS617" />
          </ElFormItem>
        </div>

        <div class="form-grid form-grid--2">
          <ElFormItem label="价格（分）" required>
            <ElInputNumber v-model="editing.priceCents" :min="0" style="width: 100%" />
          </ElFormItem>
          <ElFormItem label="库存">
            <ElInputNumber v-model="editing.stock" :min="0" style="width: 100%" />
          </ElFormItem>
        </div>

        <ElFormItem label="副标题">
          <ElInput v-model="editing.subtitle" placeholder="例如：含额外配件..." />
        </ElFormItem>

        <ElFormItem label="封面图链接">
          <ElInput v-model="editing.coverImageUrl" placeholder="可选的版本专属图片" />
        </ElFormItem>

        <ElFormItem label="说明信息">
          <ProductRichTextEditor v-model="editing.specifications" />
        </ElFormItem>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px">
          <ElButton type="primary" :loading="saving" :disabled="!dirty" @click="handleSave">
            保存更改
          </ElButton>
        </div>
      </ElForm>
    </div>
  </div>
</template>
