<script setup lang="ts">
interface Option { id: string; name: string }

const props = defineProps<{
  form: {
    name: string;
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

const isPreorder = computed(() => local.value.saleType === 'PREORDER');
</script>

<template>
  <ElForm label-position="top">
    <ElFormItem label="Product Name" required>
      <ElInput v-model="local.name" placeholder="e.g. Iron Man Mark XLVII" @blur="emit('blur-name')" />
    </ElFormItem>

    <ElFormItem label="Slug" required>
      <ElInput v-model="local.slug" placeholder="iron-man-mark-xlvii" />
      <div class="field-hint">Used in the product URL on the storefront</div>
    </ElFormItem>

  </ElForm>
</template>
