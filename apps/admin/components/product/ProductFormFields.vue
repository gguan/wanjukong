<script setup lang="ts">
interface Option { id: string; name: string }

const props = defineProps<{
  form: {
    name: string;
    slug: string;
    description: string;
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
}>();

const local = computed({
  get: () => props.form,
  set: (v) => emit('update:form', v),
});

const isPreorder = computed(() => local.value.saleType === 'PREORDER');
</script>

<template>
  <ElForm label-position="top">
    <ElRow :gutter="20">
      <ElCol :span="12">
        <ElFormItem label="Name" required>
          <ElInput v-model="local.name" />
        </ElFormItem>
      </ElCol>
      <ElCol :span="12">
        <ElFormItem label="Slug" required>
          <ElInput v-model="local.slug" />
        </ElFormItem>
      </ElCol>
    </ElRow>

    <ElRow :gutter="20">
      <ElCol :span="12">
        <ElFormItem label="Brand" required>
          <ElSelect v-model="local.brandId" placeholder="Select brand" style="width: 100%">
            <ElOption
              v-for="b in brands"
              :key="b.id"
              :label="b.name"
              :value="b.id"
            />
          </ElSelect>
        </ElFormItem>
      </ElCol>
      <ElCol :span="12">
        <ElFormItem label="Category" required>
          <ElSelect v-model="local.categoryId" placeholder="Select category" style="width: 100%">
            <ElOption
              v-for="c in categories"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </ElSelect>
        </ElFormItem>
      </ElCol>
    </ElRow>

    <ElRow :gutter="20">
      <ElCol :span="8">
        <ElFormItem label="Scale">
          <ElInput v-model="local.scale" placeholder="1/6" />
        </ElFormItem>
      </ElCol>
      <ElCol :span="8">
        <ElFormItem label="Product Status">
          <ElSelect v-model="local.status" style="width: 100%">
            <ElOption label="Draft" value="DRAFT" />
            <ElOption label="Active" value="ACTIVE" />
            <ElOption label="Inactive" value="INACTIVE" />
          </ElSelect>
          <div style="font-size: 12px; color: #909399; margin-top: 4px">Controls storefront visibility</div>
        </ElFormItem>
      </ElCol>
      <ElCol :span="8">
        <ElFormItem label="Sale Type">
          <ElSelect v-model="local.saleType" style="width: 100%">
            <ElOption label="In Stock" value="IN_STOCK" />
            <ElOption label="Preorder" value="PREORDER" />
          </ElSelect>
        </ElFormItem>
      </ElCol>
    </ElRow>

    <ElRow v-if="isPreorder" :gutter="20">
      <ElCol :span="12">
        <ElFormItem label="Preorder Start">
          <ElInput v-model="local.preorderStartAt" type="datetime-local" />
        </ElFormItem>
      </ElCol>
      <ElCol :span="12">
        <ElFormItem label="Preorder End">
          <ElInput v-model="local.preorderEndAt" type="datetime-local" />
        </ElFormItem>
      </ElCol>
    </ElRow>

    <ElRow :gutter="20">
      <ElCol :span="12">
        <ElFormItem label="Estimated Ship Date">
          <ElInput v-model="local.estimatedShipAt" type="datetime-local" />
        </ElFormItem>
      </ElCol>
    </ElRow>

    <ElFormItem label="Description">
      <ElInput v-model="local.description" type="textarea" :rows="4" />
    </ElFormItem>
  </ElForm>
</template>
