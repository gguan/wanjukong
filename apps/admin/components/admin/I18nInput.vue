<script setup lang="ts">
/**
 * I18n input — shows translation fields for a text field.
 * Emits the i18n JSON object: {"en":"...","zh-TW":"...","ja":"..."}
 */

const props = defineProps<{
  /** The i18n JSON object */
  modelValue: Record<string, string>;
  /** Input type: 'input' or 'textarea' */
  type?: 'input' | 'textarea';
  /** Textarea rows */
  rows?: number;
  /** Placeholder prefix, e.g. "商品名称" → "商品名称 (English)" */
  label?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, string>): void;
}>();

const langs = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'zh-TW', flag: '🇭🇰', label: '繁體中文' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
];

const expanded = ref(false);

function update(langCode: string, value: string) {
  const next = { ...props.modelValue, [langCode]: value };
  // Remove empty entries
  for (const k of Object.keys(next)) {
    if (!next[k]?.trim()) delete next[k];
  }
  emit('update:modelValue', next);
}

const filledCount = computed(() => {
  return langs.filter((l) => props.modelValue?.[l.code]?.trim()).length;
});
</script>

<template>
  <div class="i18n-input">
    <div class="i18n-toggle" @click="expanded = !expanded">
      <span class="i18n-toggle__label">
        🌐 翻译
        <span v-if="filledCount > 0" class="i18n-toggle__count">{{ filledCount }}/{{ langs.length }}</span>
      </span>
      <span class="i18n-toggle__arrow" :class="{ 'i18n-toggle__arrow--open': expanded }">›</span>
    </div>

    <div v-if="expanded" class="i18n-fields">
      <div v-for="lang in langs" :key="lang.code" class="i18n-field">
        <span class="i18n-field__flag">{{ lang.flag }}</span>
        <span class="i18n-field__label">{{ lang.label }}</span>
        <div class="i18n-field__input">
          <ElInput
            v-if="type !== 'textarea'"
            :model-value="modelValue?.[lang.code] || ''"
            :placeholder="`${label || ''} (${lang.label})`"
            @update:model-value="update(lang.code, $event)"
          />
          <ElInput
            v-else
            type="textarea"
            :rows="rows || 3"
            :model-value="modelValue?.[lang.code] || ''"
            :placeholder="`${label || ''} (${lang.label})`"
            @update:model-value="update(lang.code, $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.i18n-input {
  margin-top: 4px;
}

.i18n-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  user-select: none;
  transition: color 0.15s;
}

.i18n-toggle:hover {
  color: var(--el-text-color-primary);
}

.i18n-toggle__count {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
  padding: 0 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.i18n-toggle__arrow {
  font-size: 14px;
  transition: transform 0.15s;
}

.i18n-toggle__arrow--open {
  transform: rotate(90deg);
}

.i18n-fields {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-light);
}

.i18n-field {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.i18n-field__flag {
  font-size: 16px;
  line-height: 32px;
  flex-shrink: 0;
}

.i18n-field__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  width: 60px;
  flex-shrink: 0;
  line-height: 32px;
}

.i18n-field__input {
  flex: 1;
}
</style>
