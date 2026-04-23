import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('VariantEditorCard', () => {
  const source = readFileSync(resolve(process.cwd(), 'components/product/VariantEditorCard.vue'), 'utf8');
  const handleSaveBlock = source.split('async function handleSave() {')[1]?.split('</script>')[0] ?? '';

  it('keeps the upload file id until a successful save refreshes the variant prop', () => {
    expect(handleSaveBlock).not.toContain('coverUploadFileId.value = null;');
  });
});
