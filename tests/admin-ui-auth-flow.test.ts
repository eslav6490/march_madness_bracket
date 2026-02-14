/// <reference types="vitest" />
import fs from 'fs';

import { describe, expect, it } from 'vitest';

describe('admin auth ui', () => {
  it('admin page no longer renders token save controls and includes logout action', async () => {
    const source = await fs.promises.readFile('/root/march_madness_bracket/app/admin/page.tsx', 'utf8');

    expect(source).toContain('AdminLogoutButton');
    expect(source).toContain('Logout');
    expect(source).not.toContain('Save Session');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('Supabase access token');
  });

  it('admin login page describes cookie-backed session flow', async () => {
    const source = await fs.promises.readFile('/root/march_madness_bracket/app/admin/login/page.tsx', 'utf8');

    expect(source).toContain("fetch('/api/admin/auth/login'");
    expect(source).toContain('secure HttpOnly cookie');
    expect(source).not.toContain('localStorage');
  });
});
