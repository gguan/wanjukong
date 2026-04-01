<script setup lang="ts">
const store = useAdminAuthStore();
const isBrandManager = computed(() => store.isBrandManager);

interface Variant {
  id: string;
  name: string;
  sku: string;
  manufacturerSku: string | null;
  priceCents: number;
  usdPriceCents: number | null;
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
  nameI18n: {} as Record<string, string>,
  sku: '',
  manufacturerSku: '',
  priceYuan: 0,
  usdPriceDollar: 0,
  stock: 0,
  subtitle: '',
  subtitleI18n: {} as Record<string, string>,
  specifications: '',
  specificationsI18n: {} as Record<string, string>,
  sortOrder: 0,
});

const dirty = ref(false);
const saving = ref(false);

watch(
  () => props.variant,
  (v) => {
    editing.name = v.name;
    editing.nameI18n = (v as any).nameI18n || {};
    editing.sku = v.sku;
    editing.manufacturerSku = v.manufacturerSku || '';
    editing.priceYuan = v.priceCents / 100;
    editing.usdPriceDollar = (v.usdPriceCents ?? 0) / 100;
    editing.stock = v.stock;
    editing.subtitle = v.subtitle || '';
    editing.subtitleI18n = (v as any).subtitleI18n || {};
    editing.specifications = v.specifications || '';
    editing.specificationsI18n = (v as any).specificationsI18n || {};
    editing.sortOrder = v.sortOrder;
    dirty.value = false;
  },
  { immediate: true },
);

watch(editing, () => {
  dirty.value = true;
}, { deep: true });

function formatCNY(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

function formatUSD(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const summaryLine = computed(() => {
  const parts: string[] = [];
  parts.push(formatCNY(props.variant.priceCents));
  if (props.variant.usdPriceCents) {
    parts.push(formatUSD(props.variant.usdPriceCents));
  }
  parts.push(`库存：${props.variant.stock}`);
  if (props.variant.sku) parts.push(`货号 ${props.variant.sku}`);
  return parts.join(' · ');
});

async function handleSave() {
  saving.value = true;
  emit('save', {
    name: editing.name,
    nameI18n: editing.nameI18n,
    sku: editing.sku || undefined,
    manufacturerSku: editing.manufacturerSku || undefined,
    priceCents: Math.round(editing.priceYuan * 100),
    usdPriceCents: editing.usdPriceDollar > 0 ? Math.round(editing.usdPriceDollar * 100) : undefined,
    stock: Number(editing.stock),
    subtitle: editing.subtitle || undefined,
    subtitleI18n: editing.subtitleI18n,
    specifications: editing.specifications || undefined,
    specificationsI18n: editing.specificationsI18n,
    sortOrder: Number(editing.sortOrder),
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
            <AdminI18nInput v-model="editing.nameI18n" label="版本名称" />
          </ElFormItem>
          <ElFormItem label="排序值">
            <ElInputNumber v-model="editing.sortOrder" :min="0" style="width: 100%" />
          </ElFormItem>
        </div>

        <ElFormItem label="版本描述">
          <ElInput v-model="editing.subtitle" placeholder="例如：含额外配件..." />
          <AdminI18nInput v-model="editing.subtitleI18n" label="版本描述" />
        </ElFormItem>

        <div class="form-grid form-grid--2">
          <ElFormItem label="货号">
            <ElInput v-model="editing.sku" placeholder="留空自动生成" :disabled="isBrandManager" />
            <div class="field-hint">
              <template v-if="isBrandManager">货号由管理员设置</template>
              <template v-else>留空后系统自动生成</template>
            </div>
          </ElFormItem>
          <ElFormItem label="厂商货号">
            <ElInput v-model="editing.manufacturerSku" placeholder="例如：MMS617" :disabled="isBrandManager" />
          </ElFormItem>
        </div>

        <div class="form-grid form-grid--3">
          <ElFormItem label="价格（元）" required>
            <ElInputNumber
              v-model="editing.priceYuan"
              :min="0"
              :precision="0"
              :step="1"
              style="width: 100%"
            />
            <div class="field-hint">人民币，整数</div>
          </ElFormItem>
          <ElFormItem label="美元价格">
            <ElInputNumber
              v-model="editing.usdPriceDollar"
              :min="0"
              :precision="0"
              :step="1"
              style="width: 100%"
            />
            <div class="field-hint">选填，0 表示不设置</div>
          </ElFormItem>
          <ElFormItem label="库存">
            <ElInputNumber v-model="editing.stock" :min="0" style="width: 100%" />
          </ElFormItem>
        </div>

        <ElFormItem label="说明信息">
          <ProductRichTextEditor v-model="editing.specifications" />
          <AdminI18nInput v-model="editing.specificationsI18n" label="说明信息" type="textarea" :rows="4" />
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
