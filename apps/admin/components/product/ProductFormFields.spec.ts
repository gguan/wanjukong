import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('ProductFormFields', () => {
  it('renders product description fields and i18n controls', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(currentDir, 'ProductFormFields.vue'), 'utf8');

    expect(source).toContain('ElFormItem label="商品描述"');
    expect(source).toContain('<ProductRichTextEditor v-model="local.description" />');
    expect(source).toContain('label="商品描述"');
    expect(source).toContain(':source-text="local.description"');
    expect(source).toContain('type="textarea"');
  });
});
