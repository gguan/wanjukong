import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('ProductFormFields', () => {
  const source = readFileSync(resolve(process.cwd(), 'components/product/ProductFormFields.vue'), 'utf8');

  it('supports overriding slug editability from the parent page', () => {
    expect(source).toContain('slugEditable?: boolean');
    expect(source).toContain('const canEditSlug = computed(() => props.slugEditable ?? !isBrandManager.value);');
  });
});
