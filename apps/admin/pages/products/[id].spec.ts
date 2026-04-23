import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin product edit page', () => {
  const source = readFileSync(resolve(process.cwd(), 'pages/products/[id].vue'), 'utf8');
  const doStatusActionBlock = source.split('async function doStatusAction(action: string) {')[1]?.split('function submitForReview()')[0] ?? '';

  it('refreshes the dirty snapshot after a successful status action', () => {
    expect(doStatusActionBlock).toContain('initialFormJson.value = JSON.stringify(form.value);');
  });

  it('updates the last-modified timestamp after a successful status action', () => {
    expect(doStatusActionBlock).toContain('updatedAt.value =');
  });
});
