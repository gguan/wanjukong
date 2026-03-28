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

</script>

<template>
  <ElForm label-position="top">
    <ElFormItem label="商品名称" required>
      <ElInput v-model="local.name" placeholder="例如：钢铁侠 Mark XLVII" @blur="emit('blur-name')" />
    </ElFormItem>

    <ElFormItem label="URL 标识" required>
      <ElInput v-model="local.slug" placeholder="请输入 URL 标识" />
      <div class="field-hint">用于生成商品链接地址</div>
    </ElFormItem>

  </ElForm>
</template>
