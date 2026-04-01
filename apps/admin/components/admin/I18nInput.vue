<script setup lang="ts">
/**
 * I18n input — shows translation fields with one-click AI translate.
 * Emits the i18n JSON object: {"en":"...","zh-TW":"...","ja":"..."}
 */

const props = defineProps<{
  /** The i18n JSON object */
  modelValue: Record<string, string>;
  /** The source text (zh-CN) to translate from */
  sourceText?: string;
  /** Input type: 'input' or 'textarea' */
  type?: 'input' | 'textarea';
  /** Textarea rows */
  rows?: number;
  /** Placeholder prefix */
  label?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, string>): void;
}>();

const api = useAdminApi();

const langs = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'zh-TW', flag: '🇭🇰', label: '繁體中文' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
];

const expanded = ref(false);
const translating = ref(false);

function update(langCode: string, value: string) {
  const next = { ...props.modelValue, [langCode]: value };
  for (const k of Object.keys(next)) {
    if (!next[k]?.trim()) delete next[k];
  }
  emit('update:modelValue', next);
}

const filledCount = computed(() => {
  return langs.filter((l) => props.modelValue?.[l.code]?.trim()).length;
});

/**
 * One-click translate: calls /api/admin/translate with the source text,
 * fills all empty language fields with the result.
 */
async function autoTranslate() {
  const text = props.sourceText;
  if (!text?.trim()) {
    ElMessage.warning('请先填写原文内容');
    return;
  }

  translating.value = true;
  expanded.value = true;

  try {
    // Auto-detect HTML content (from TipTap rich text editor)
    const isHtml = /<[a-z][\s\S]*>/i.test(text);

    const result = await api.post<Record<string, string>>(
      '/api/admin/translate',
      { text, targetLangs: langs.map((l) => l.code), isHtml },
    );

    // Merge: only fill empty fields, don't overwrite existing translations
    const next = { ...props.modelValue };
    for (const [lang, translated] of Object.entries(result)) {
      if (!next[lang]?.trim() && translated?.trim()) {
        next[lang] = translated;
      }
    }
    emit('update:modelValue', next);
    ElMessage.success('翻译完成');
  } catch (err: any) {
    ElMessage.error(err?.message || '翻译失败');
  } finally {
    translating.value = false;
  }
}
</script>

<template>
  <div class="i18n-input">
    <div class="i18n-header">
      <div class="i18n-toggle" @click="expanded = !expanded">
        <span class="i18n-toggle__label">
          🌐 翻译
          <span v-if="filledCount > 0" class="i18n-toggle__count">{{ filledCount }}/{{ langs.length }}</span>
        </span>
        <span class="i18n-toggle__arrow" :class="{ 'i18n-toggle__arrow--open': expanded }">›</span>
      </div>
      <button
        class="i18n-auto-btn"
        :disabled="translating"
        @click.stop="autoTranslate"
      >
        {{ translating ? '翻译中...' : '🤖 AI 翻译' }}
      </button>
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

.i18n-header {
  display: flex;
  align-items: center;
  gap: 8px;
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

.i18n-auto-btn {
  font-size: 11px;
  color: var(--el-color-info);
  background: none;
  border: 1px solid var(--el-color-info-light-7);
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}

.i18n-auto-btn:hover:not(:disabled) {
  background: var(--el-color-info-light-9);
  border-color: var(--el-color-info);
}

.i18n-auto-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
