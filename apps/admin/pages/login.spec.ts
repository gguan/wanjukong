import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin login page', () => {
  const source = readFileSync(resolve(process.cwd(), 'pages/login.vue'), 'utf8');

  it('avoids native form submission so clicking login cannot trigger a page reload', () => {
    expect(source).not.toContain('<form');
    expect(source).toContain('@keydown.enter.prevent="handleLogin"');
    expect(source).toContain('<button type="button" class="login-submit" :disabled="loading || !canSubmit" @click="handleLogin">');
  });

  it('extracts API error messages from fetch response payloads', () => {
    expect(source).toContain('e?.response?._data?.message');
  });
});
