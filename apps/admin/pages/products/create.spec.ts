import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin product create page', () => {
  const source = readFileSync(resolve(process.cwd(), 'pages/products/create.vue'), 'utf8');

  it('lets the shared form keep slug editing available during product creation', () => {
    expect(source).toContain(':slug-editable="true"');
  });
});
