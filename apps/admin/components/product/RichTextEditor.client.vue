<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder: '请输入说明信息...' }),
  ],
  onUpdate({ editor: e }) {
    const html = e.getHTML();
    emit('update:modelValue', html === '<p></p>' ? '' : html);
  },
});

// Sync external model changes (e.g. when variant data loads)
watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return;
    const current = editor.value.getHTML();
    if (val !== current) {
      editor.value.commands.setContent(val || '', false);
    }
  },
);

onBeforeUnmount(() => editor.value?.destroy());
</script>

<template>
  <div class="rich-editor">
    <!-- Toolbar -->
    <div v-if="editor" class="rich-editor__toolbar">
      <button
        type="button"
        class="tb-btn"
        :class="{ active: editor.isActive('bold') }"
        title="加粗"
        @click="editor.chain().focus().toggleBold().run()"
      ><b>B</b></button>
      <button
        type="button"
        class="tb-btn"
        :class="{ active: editor.isActive('italic') }"
        title="斜体"
        @click="editor.chain().focus().toggleItalic().run()"
      ><i>I</i></button>
      <span class="tb-sep" />
      <button
        type="button"
        class="tb-btn"
        :class="{ active: editor.isActive('bulletList') }"
        title="无序列表"
        @click="editor.chain().focus().toggleBulletList().run()"
      >&#8226; 无序</button>
      <button
        type="button"
        class="tb-btn"
        :class="{ active: editor.isActive('orderedList') }"
        title="有序列表"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >1. 有序</button>
      <span class="tb-sep" />
      <button
        type="button"
        class="tb-btn"
        title="清除格式"
        @click="editor.chain().focus().clearNodes().unsetAllMarks().run()"
      >&#10005;</button>
    </div>
    <EditorContent :editor="editor" class="rich-editor__body" />
  </div>
</template>

<style scoped>
.rich-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
  background: #fff;
}

.rich-editor__toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-fill-color-lighter);
  flex-wrap: wrap;
}
.tb-btn {
  padding: 3px 8px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  transition: background 0.1s, border-color 0.1s;
}
.tb-btn:hover { background: var(--el-fill-color); border-color: var(--el-border-color); }
.tb-btn.active { background: var(--el-color-primary-light-9); border-color: var(--el-color-primary-light-5); color: var(--el-color-primary); }
.tb-sep { width: 1px; height: 18px; background: var(--el-border-color); margin: 0 4px; }

.rich-editor__body {
  min-height: 160px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  cursor: text;
}
.rich-editor__body :deep(.tiptap) {
  outline: none;
  min-height: 140px;
}
.rich-editor__body :deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: var(--el-text-color-placeholder);
  pointer-events: none;
  float: left;
  height: 0;
}
.rich-editor__body :deep(ul),
.rich-editor__body :deep(ol) {
  padding-left: 20px;
  margin: 4px 0;
}
.rich-editor__body :deep(li) { margin: 2px 0; }
.rich-editor__body :deep(strong) { font-weight: 600; }
.rich-editor__body :deep(em) { font-style: italic; }
.rich-editor__body :deep(p) { margin: 0 0 6px; }
.rich-editor__body :deep(p:last-child) { margin-bottom: 0; }
</style>
